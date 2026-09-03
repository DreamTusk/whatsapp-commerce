import { Injectable } from '@nestjs/common';

// SMS/WhatsApp OTP will be integrated later. OTPs are logged to console for now.
// See pending-integrations.md — recommended: WhatsApp Business API (no new vendor needed)
@Injectable()
export class SmsService {
  async sendOtp(phone: string, otp: string): Promise<void> {
    console.log(`\n📱 OTP TO: ${phone}`);
    console.log(`   OTP: ${otp}\n`);
  }
}
