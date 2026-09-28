import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Store } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../../shared/sms.service';
import * as crypto from 'crypto';

const OTP_RESEND_COOLDOWN_SECONDS = 45;
const MAX_OTP_SENDS_PER_HOUR = 5;
const MAX_OTP_VERIFY_ATTEMPTS = 5;

@Injectable()
export class StorefrontAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private formatCustomer(c: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  }) {
    return { id: c.id, name: c.name, phone: c.phone, email: c.email };
  }

  async getMethods(store: Store) {
    return { methods: store.customerAuthMethods };
  }

  async sendOtp(store: Store, phone: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await this.prisma.customerOtp.findMany({
      where: { phone, storeId: store.id, createdAt: { gte: oneHourAgo } },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtps.length > 0) {
      const secondsSinceLast = (Date.now() - recentOtps[0].createdAt.getTime()) / 1000;
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another OTP`,
        );
      }
    }

    if (recentOtps.length >= MAX_OTP_SENDS_PER_HOUR) {
      throw new BadRequestException('Too many OTP requests. Please try again later.');
    }

    await this.prisma.customerOtp.updateMany({
      where: { phone, storeId: store.id, isUsed: false },
      data: { isUsed: true },
    });

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.customerOtp.create({
      data: { phone, storeId: store.id, otp, expiresAt },
    });

    await this.smsService.sendOtp(phone, otp);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(store: Store, phone: string, otp: string) {
    const devBypass = process.env.NODE_ENV !== 'production' && otp === '123456';

    if (!devBypass) {
      const otpRecord = await this.prisma.customerOtp.findFirst({
        where: { phone, storeId: store.id, isUsed: false },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord || otpRecord.expiresAt < new Date()) {
        throw new BadRequestException('OTP expired. Please request a new one.');
      }

      if (otpRecord.attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
        await this.prisma.customerOtp.update({
          where: { id: otpRecord.id },
          data: { isUsed: true },
        });
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }

      if (otpRecord.otp !== otp) {
        await this.prisma.customerOtp.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } },
        });
        throw new BadRequestException('Invalid OTP. Please try again.');
      }

      await this.prisma.customerOtp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
    }

    const existingCustomer = await this.prisma.customer.findUnique({
      where: { phone_storeId: { phone, storeId: store.id } },
    });
    const is_new = !existingCustomer;

    const customer = await this.prisma.customer.upsert({
      where: { phone_storeId: { phone, storeId: store.id } },
      create: { phone, storeId: store.id },
      update: {},
    });

    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const access_token = this.jwtService.sign(
      { customerId: customer.id, storeId: store.id, phone, jti },
      { expiresIn: '30d' },
    );

    await this.prisma.customerToken.create({
      data: { jti, customerId: customer.id, expiresAt },
    });

    return { customer: this.formatCustomer(customer), is_new, access_token };
  }

  async getMe(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return { customer: this.formatCustomer(customer) };
  }

  async updateProfile(customerId: string, name: string, email?: string) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: name?.trim() || null,
        email: email?.trim() || null,
      },
    });
    return { customer: this.formatCustomer(customer) };
  }

  async logout(jti: string) {
    await this.prisma.customerToken.update({
      where: { jti },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }
}
