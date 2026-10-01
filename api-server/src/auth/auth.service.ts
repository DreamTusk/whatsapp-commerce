import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { EmailService } from '../shared/email.service';
import { Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { Cron } from '@nestjs/schedule';

const ACCESS_TOKEN_EXPIRY = '40m';
const REFRESH_TOKEN_EXPIRY_DAYS = 21;
const GOOGLE_VERIFY_TIMEOUT_MS = 5000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  // Refresh tokens are already high-entropy random values (512 bits), so a
  // plain unsalted SHA-256 is enough to make a DB leak unusable — unlike
  // human passwords, brute-forcing this isn't feasible regardless of hash
  // speed, so there's no need for bcrypt-style slow hashing here. Only the
  // hash is ever stored; the real token is handed to the client as before.
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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
    createdAt: Date; updatedAt: Date;
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
    email = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const access_token = this.generateAccessToken(user.id);
    const refresh_token = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: { token: this.hashToken(refresh_token), userId: user.id, expiresAt: this.refreshTokenExpiryDate() },
    });

    const otp = await this.otpService.createOtp(user.id);
    await this.emailService.sendSignupOtpEmail(email, user.name, otp);

    return {
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      is_verified: false,
    };
  }

  async resendOtp(email: string) {
    if (!email) throw new BadRequestException('email is required');
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new ConflictException('User is already verified');

    await this.prisma.otpVerification.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    const otp = await this.otpService.createOtp(user.id);
    await this.emailService.sendSignupOtpEmail(email, user.name, otp);

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
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('No account found with this email');

    const otp = await this.otpService.createOtp(user.id);
    await this.emailService.sendForgotPasswordEmail(email, user.name, otp);

    return { message: 'OTP sent to your email' };
  }

  async resetPassword(email: string, otp: string, new_password: string) {
    if (!email || !otp || !new_password) {
      throw new BadRequestException('email, otp and new_password are required');
    }
    if (new_password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    email = email.trim().toLowerCase();

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
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.password) {
      throw new UnauthorizedException('This account uses Google sign-in. Continue with Google instead.');
    }

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

    // Filtering to isActive:true (plus a stable orderBy) means a user who
    // belongs to multiple stores deterministically lands on one of their
    // *active* memberships, instead of an unfiltered findFirst picking an
    // arbitrary row — which could just as easily be a store they're
    // deactivated at, blocking or admitting them based on query-plan luck
    // rather than their actual account state. A user deactivated at every
    // store they belong to now gets null here instead of an inactive row, so
    // the explicit "any store at all" check below is what still catches that
    // case and blocks them (vs. a brand-new user who simply has no store yet).
    const userStore = await this.prisma.userStore.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { Store: true },
    });

    if (!userStore) {
      const hasAnyStore = await this.prisma.userStore.findFirst({ where: { userId: user.id } });
      if (hasAnyStore) {
        throw new ForbiddenException('Your account has been deactivated. Please contact your store admin.');
      }
    }

    const access_token = this.generateAccessToken(user.id);
    const refresh_token = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: { token: this.hashToken(refresh_token), userId: user.id, expiresAt: this.refreshTokenExpiryDate() },
    });

    return {
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      role: userStore?.role ?? null,
      store: userStore?.Store ? this.formatStore(userStore.Store) : null,
    };
  }

  // Claims the oldest-unused, unexpired invite for this email, if any. The
  // claim itself is an atomic updateMany + count check (not a plain
  // read-then-write), so two concurrent calls racing for the same single-use
  // invite can't both succeed — only whichever update actually flips
  // isUsed:false → true goes on to create the UserStore.
  private async claimPendingInvite(userId: string, email: string) {
    await this.prisma.$transaction(async (tx) => {
      const invite = await tx.storeInvite.findFirst({
        where: { email, isUsed: false, expiresAt: { gt: new Date() } },
      });
      if (!invite) return;

      const claimed = await tx.storeInvite.updateMany({
        where: { id: invite.id, isUsed: false },
        data: { isUsed: true },
      });

      if (claimed.count === 1) {
        await tx.userStore.create({
          data: { userId, storeId: invite.storeId, role: invite.role },
        });
      }
    });
  }

  async googleLogin(idToken: string) {
    if (!idToken) throw new BadRequestException('id_token is required');

    let payload: { sub?: string; email?: string; email_verified?: boolean; name?: string } | undefined;
    try {
      // verifyIdToken checks the signature against Google's public keys AND
      // that `aud` matches our own client id — unlike the old /userinfo
      // lookup, a token minted for a different app is rejected here. Raced
      // against a timeout since the library has no built-in one — the first
      // verification (or any after the key cache expires) fetches Google's
      // public keys over the network, and a hang there would otherwise tie
      // up this request indefinitely.
      const ticket = await Promise.race([
        this.googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Google ID token verification timed out')), GOOGLE_VERIFY_TIMEOUT_MS),
        ),
      ]);
      payload = ticket.getPayload();
    } catch (err) {
      // Logged with the real cause (bad token vs. a Google-side/network
      // failure fetching verification keys) so an outage doesn't read as a
      // wave of credential-stuffing attempts in the logs — but the client
      // still only ever sees the same generic message either way.
      this.logger.warn(`Google ID token verification failed: ${err instanceof Error ? err.message : err}`);
      throw new UnauthorizedException('Invalid Google credential');
    }

    if (!payload?.sub || !payload.email) throw new UnauthorizedException('Invalid Google credential');
    if (!payload.email_verified) throw new UnauthorizedException('Google email is not verified');

    const { sub: googleId, name } = payload;
    // Google normally reports this lowercase already, but normalize
    // defensively so it always matches whatever case password-signup/invite
    // emails were stored in (both of which now lowercase at write-time too).
    const email = payload.email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });

      if (user) {
        // This email is already linked to a *different* Google account —
        // e.g. a Workspace admin deleted this user and reassigned the email
        // to someone else entirely. Refuse rather than silently handing the
        // new person access to the old account.
        if (user.googleId && user.googleId !== googleId) {
          throw new ConflictException('This email is already linked to a different Google account');
        }

        // Existing email/password account signing in with Google for the first time — link it.
        // If it was never verified, its password can't be trusted (an attacker
        // could have pre-registered this email, left it unverified, and waited
        // for the real owner to "verify" it for them via Google) — null it out
        // now that Google has proven real ownership of the email. A password
        // on an already-verified account was legitimately set by its owner, so
        // it's left alone.
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, isVerified: true, password: user.isVerified ? user.password : null },
        });
      } else {
        try {
          user = await this.prisma.user.create({
            data: { name: name ?? email.split('@')[0], email, googleId, isVerified: true },
          });
        } catch (err) {
          // Two concurrent first-time logins for the same new user (double
          // click, a silent retry) can both pass the lookups above and both
          // try to create the same row — the unique constraint on email/
          // googleId correctly stops the second one, but as a raw Prisma
          // error. Treat it as "someone else just created this user" and
          // re-fetch instead of surfacing a 500.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            user = await this.prisma.user.findUniqueOrThrow({ where: { email } });
          } else {
            throw err;
          }
        }
      }
    }

    // Claim any pending store invite for this email on every login — not
    // just brand-new signups — so an existing user (found by googleId, or
    // just linked by email above) who gets invited to a store afterwards
    // actually has it applied, instead of the invite sitting unused forever.
    // This also makes invite-claiming self-healing: if it fails or is missed
    // on one login, the very next login retries it, rather than a user ever
    // being permanently stuck with no store attached.
    await this.claimPendingInvite(user.id, email);

    // See the equivalent lookup in login() above for why isActive:true +
    // orderBy is here instead of a plain findFirst.
    const userStore = await this.prisma.userStore.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { Store: true },
    });

    if (!userStore) {
      const hasAnyStore = await this.prisma.userStore.findFirst({ where: { userId: user.id } });
      if (hasAnyStore) {
        throw new ForbiddenException('Your account has been deactivated. Please contact your store admin.');
      }
    }

    const access_token = this.generateAccessToken(user.id);
    const refresh_token = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: { token: this.hashToken(refresh_token), userId: user.id, expiresAt: this.refreshTokenExpiryDate() },
    });

    return {
      access_token,
      refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      role: userStore?.role ?? null,
      store: userStore?.Store ? this.formatStore(userStore.Store) : null,
    };
  }

  async refresh(refresh_token: string) {
    if (!refresh_token) throw new BadRequestException('refresh_token is required');

    const storedToken = await this.prisma.refreshToken.findUnique({ where: { token: this.hashToken(refresh_token) } });
    if (!storedToken) throw new UnauthorizedException('Invalid refresh token');
    if (storedToken.isRevoked) throw new UnauthorizedException('Refresh token has been revoked');
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired, please login again');
    }

    const userStore = await this.prisma.userStore.findFirst({
      where: { userId: storedToken.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!userStore) {
      const hasAnyStore = await this.prisma.userStore.findFirst({ where: { userId: storedToken.userId } });
      if (hasAnyStore) {
        throw new UnauthorizedException('Your account has been deactivated');
      }
    }

    const access_token = this.generateAccessToken(storedToken.userId);
    return { access_token };
  }

  async logout(refresh_token: string) {
    if (!refresh_token) throw new BadRequestException('refresh_token is required');

    await this.prisma.refreshToken.updateMany({
      where: { token: this.hashToken(refresh_token) },
      data: { isRevoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  @Cron('0 3 * * *')
  async cleanupExpiredAuthRecords() {
    const [refreshTokens, otps] = await Promise.all([
      this.prisma.refreshToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }] },
      }),
      this.prisma.otpVerification.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }] },
      }),
    ]);
    return { refreshTokensCleaned: refreshTokens.count, otpsCleaned: otps.count };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Same isActive:true + orderBy as login()/googleLogin()/refresh(), so the
    // store/role this returns matches whichever one the user actually landed
    // on at login, not an arbitrary (possibly inactive) membership.
    const userStore = await this.prisma.userStore.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { Store: true },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      role: userStore?.role ?? null,
      store: userStore?.Store ? this.formatStore(userStore.Store) : null,
    };
  }

  async getInvite(token: string) {
    const invite = await this.prisma.storeInvite.findUnique({
      where: { token },
      include: { Store: { select: { name: true, logo: true } } },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.isUsed) throw new ConflictException('This invite has already been accepted');
    if (invite.expiresAt < new Date()) throw new GoneException('This invite link has expired');

    return {
      invite: {
        email: invite.email,
        role: invite.role,
        store_name: invite.Store.name,
        store_logo: invite.Store.logo,
        expires_at: invite.expiresAt,
      },
    };
  }

  async acceptInvite(token: string, name?: string, password?: string, authHeader?: string) {
    if (!token) throw new BadRequestException('token is required');

    const invite = await this.prisma.storeInvite.findUnique({
      where: { token },
      include: { Store: true },
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
      this.prisma.refreshToken.create({ data: { token: this.hashToken(refresh_token), userId, expiresAt: this.refreshTokenExpiryDate() } }),
    ]);

    return {
      access_token,
      refresh_token,
      role: invite.role,
      store_name: invite.Store.name,
    };
  }
}
