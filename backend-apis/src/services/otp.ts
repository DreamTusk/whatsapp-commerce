import prisma from '../utils/db.js';

  function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function createOtp(userId: string): Promise<string> {
    // invalidate old OTPs
    await prisma.otpVerification.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    });

    const otp = generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await prisma.otpVerification.create({
      data: { userId, otp, expiresAt },
    });

    return otp;
  }

  const otpService = { createOtp };

  export default otpService;