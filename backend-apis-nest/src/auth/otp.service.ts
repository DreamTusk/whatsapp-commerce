import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createOtp(userId: string): Promise<string> {
    await this.prisma.otpVerification.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    const otp = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.prisma.otpVerification.create({
      data: { userId, otp, expiresAt },
    });

    return otp;
  }
}
