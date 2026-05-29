import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../../shared/sms.service';

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

  private async getStore(domain: string) {
    if (!domain) throw new BadRequestException('x-store-domain header required');
    const store = await this.prisma.store.findUnique({ where: { domain } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  private formatCustomer(c: { id: string; name: string | null; phone: string | null; email: string | null }) {
    return { id: c.id, name: c.name, phone: c.phone, email: c.email };
  }

  async getMethods(domain: string) {
    const store = await this.getStore(domain);
    return { methods: store.customerAuthMethods };
  }

  async sendOtp(domain: string, phone: string) {
    if (!phone) throw new BadRequestException('phone is required');

    const store = await this.getStore(domain);

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

  async verifyOtp(domain: string, phone: string, otp: string) {
    if (!phone || !otp) throw new BadRequestException('phone and otp are required');

    const store = await this.getStore(domain);

    const devBypass = process.env.NODE_ENV !== 'production' && otp === '123456';

    if (!devBypass) {
      const otpRecord = await this.prisma.customerOtp.findFirst({
        where: { phone, storeId: store.id, otp, isUsed: false, expiresAt: { gt: new Date() } },
      });
      if (!otpRecord) throw new BadRequestException('Invalid or expired OTP');

      await this.prisma.customerOtp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });
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

    const access_token = this.jwtService.sign(
      { customerId: customer.id, storeId: store.id, phone },
      { expiresIn: '30d' },
    );

    return { customer: this.formatCustomer(customer), is_new, access_token };
  }

  async getMe(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return { customer: this.formatCustomer(customer) };
  }

  async updateProfile(customerId: string, name: string) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { name: name?.trim() || null },
    });
    return { customer: this.formatCustomer(customer) };
  }

  async logout() {
    return { message: 'Logged out successfully' };
  }
}
