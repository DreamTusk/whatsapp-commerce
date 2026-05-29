import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { EmailService } from '../shared/email.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = '40m';
const REFRESH_TOKEN_EXPIRY_DAYS = 21;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private emailService: EmailService,
  ) {}

  private generateAccessToken(userId: string): string {
    return this.jwtService.sign({ userId }, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private refreshTokenExpiryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return date;
  }

  private formatStore(store: {
    id: string; name: string; phone: string; domain: string | null;
    catalogId: string | null; address: string | null; logo: string | null;
    minOrderAmount: number; deliveryRadius: number | null; isActive: boolean;
    whatsappPhoneNumberId: string | null; whatsappBusinessAccountId: string | null;
    whatsappAccessToken: string | null; createdAt: Date; updatedAt: Date;
  }) {
    return {
      id: store.id,
      name: store.name,
      phone: store.phone,
      domain: store.domain,
      catalog_id: store.catalogId,
      address: store.address,
      logo: store.logo,
      min_order_amount: store.minOrderAmount,
      delivery_radius: store.deliveryRadius,
      is_active: store.isActive,
      whatsapp_phone_number_id: store.whatsappPhoneNumberId,
      whatsapp_business_account_id: store.whatsappBusinessAccountId,
      created_at: store.createdAt,
      updated_at: store.updatedAt,
    };
  }

  async signup(name: string, email: string, password: string) {
    if (!name || !email || !password) {
      throw new BadRequestException('name, email and password are required');
    }
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const access_token = this.generateAccessToken(user.id);
    const refresh_token = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: { token: refresh_token, userId: user.id, expiresAt: this.refreshTokenExpiryDate() },
    });

    const otp = await this.otpService.createOtp(user.id);
    await this.emailService.sendSimpleEmail(
      email,
      'OTP for account verification',
      `Hi ${user.name},\n\nYour OTP to verify your account is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nDo not share this with anyone.`,
    );

    return {
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      is_verified: false,
    };
  }

  async resendOtp(email: string) {
    if (!email) throw new BadRequestException('email is required');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new ConflictException('User is already verified');

    await this.prisma.otpVerification.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    const otp = await this.otpService.createOtp(user.id);
    await this.emailService.sendSimpleEmail(
      email,
      'OTP for account verification',
      `Hi ${user.name},\n\nYour new OTP to verify your account is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nDo not share this with anyone.`,
    );

    return { message: 'OTP sent successfully' };
  }

  async verifyUser(user_id: string, otp: string) {
    if (!user_id || !otp) throw new BadRequestException('user_id and otp are required');

    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new ConflictException('User is already verified');

    const devBypass = process.env.NODE_ENV !== 'production' && otp === '123456';

    if (!devBypass) {
      const otpRecord = await this.prisma.otpVerification.findFirst({
        where: { userId: user_id, otp, isUsed: false, expiresAt: { gt: new Date() } },
      });
      if (!otpRecord) throw new BadRequestException('Invalid or expired OTP');

      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
    }

    await this.prisma.user.update({ where: { id: user_id }, data: { isVerified: true } });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    if (!email) throw new BadRequestException('email is required');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('No account found with this email');

    const otp = await this.otpService.createOtp(user.id);
    await this.emailService.sendSimpleEmail(
      email,
      'Reset your password - OTP',
      `Hi ${user.name},\n\nYour OTP to reset your password is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, ignore this email.`,
    );

    return { message: 'OTP sent to your email' };
  }

  async resetPassword(email: string, otp: string, new_password: string) {
    if (!email || !otp || !new_password) {
      throw new BadRequestException('email, otp and new_password are required');
    }
    if (new_password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('No account found with this email');

    const devBypass = process.env.NODE_ENV !== 'production' && otp === '123456';

    if (!devBypass) {
      const otpRecord = await this.prisma.otpVerification.findFirst({
        where: { userId: user.id, otp, isUsed: false, expiresAt: { gt: new Date() } },
      });
      if (!otpRecord) throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await this.prisma.$transaction([
      ...(devBypass ? [] : [
        this.prisma.otpVerification.updateMany({
          where: { userId: user.id, otp, isUsed: false },
          data: { isUsed: true },
        }),
      ]),
      this.prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
      this.prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { isRevoked: true } }),
    ]);

    return { message: 'Password reset successfully' };
  }

  async login(email: string, password: string) {
    if (!email || !password) throw new BadRequestException('email and password are required');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid email or password');

    if (!user.isVerified) {
      throw new ForbiddenException({
        error: 'Please verify your email before logging in',
        is_verified: false,
        user_id: user.id,
        email,
      });
    }

    const userStore = await this.prisma.userStore.findFirst({
      where: { userId: user.id },
      include: { store: true },
    });

    const access_token = this.generateAccessToken(user.id);
    const refresh_token = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: { token: refresh_token, userId: user.id, expiresAt: this.refreshTokenExpiryDate() },
    });

    return {
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      store: userStore?.store ? this.formatStore(userStore.store) : null,
    };
  }

  async refresh(refresh_token: string) {
    if (!refresh_token) throw new BadRequestException('refresh_token is required');

    const storedToken = await this.prisma.refreshToken.findUnique({ where: { token: refresh_token } });
    if (!storedToken) throw new UnauthorizedException('Invalid refresh token');
    if (storedToken.isRevoked) throw new UnauthorizedException('Refresh token has been revoked');
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired, please login again');
    }

    const access_token = this.generateAccessToken(storedToken.userId);
    return { access_token };
  }

  async logout(refresh_token: string) {
    if (!refresh_token) throw new BadRequestException('refresh_token is required');

    await this.prisma.refreshToken.updateMany({
      where: { token: refresh_token },
      data: { isRevoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const userStore = await this.prisma.userStore.findFirst({
      where: { userId: user.id },
      include: { store: true },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      store: userStore?.store ? this.formatStore(userStore.store) : null,
    };
  }

  async getInvite(token: string) {
    const invite = await this.prisma.storeInvite.findUnique({
      where: { token },
      include: { store: { select: { name: true, logo: true } } },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.isUsed) throw new ConflictException('This invite has already been accepted');
    if (invite.expiresAt < new Date()) throw new GoneException('This invite link has expired');

    return {
      invite: {
        email: invite.email,
        role: invite.role,
        store_name: invite.store.name,
        store_logo: invite.store.logo,
        expires_at: invite.expiresAt,
      },
    };
  }

  async acceptInvite(token: string, name?: string, password?: string, authHeader?: string) {
    if (!token) throw new BadRequestException('token is required');

    const invite = await this.prisma.storeInvite.findUnique({
      where: { token },
      include: { store: true },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.isUsed) throw new ConflictException('This invite has already been accepted');
    if (invite.expiresAt < new Date()) throw new GoneException('This invite link has expired');

    let userId: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      let decoded: { userId: string };
      try {
        decoded = this.jwtService.verify(accessToken) as { userId: string };
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }

      const user = await this.prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) throw new NotFoundException('User not found');
      if (user.email !== invite.email) {
        throw new ForbiddenException('This invite was sent to a different email address');
      }

      userId = user.id;
    } else {
      if (!name || !password) {
        throw new BadRequestException('name and password are required for new users');
      }
      if (password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }

      const existing = await this.prisma.user.findUnique({ where: { email: invite.email } });
      if (existing) {
        throw new ConflictException('An account with this email already exists. Please log in and accept the invite.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await this.prisma.user.create({
        data: { name, email: invite.email, password: hashedPassword, isVerified: true },
      });
      userId = newUser.id;
    }

    const alreadyMember = await this.prisma.userStore.findUnique({
      where: { userId_storeId: { userId, storeId: invite.storeId } },
    });
    if (alreadyMember) throw new ConflictException('You are already a member of this store');

    const access_token = this.generateAccessToken(userId);
    const refresh_token = this.generateRefreshToken();

    await this.prisma.$transaction([
      this.prisma.storeInvite.update({ where: { id: invite.id }, data: { isUsed: true } }),
      this.prisma.userStore.create({ data: { userId, storeId: invite.storeId, role: invite.role as Role } }),
      this.prisma.refreshToken.create({ data: { token: refresh_token, userId, expiresAt: this.refreshTokenExpiryDate() } }),
    ]);

    return {
      access_token,
      refresh_token,
      store_name: invite.store.name,
      role: invite.role,
    };
  }
}
