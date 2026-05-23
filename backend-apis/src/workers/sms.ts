// SMS/WhatsApp OTP will be integrated later. OTPs are logged to console for now.
// See pending-integrations.md — recommended: WhatsApp Business API (no new vendor needed)

const sendOtp = async (phone: string, otp: string): Promise<void> => {
  console.log(`\n📱 OTP TO: ${phone}`);
  console.log(`   OTP: ${otp}\n`);
};

const smsService = { sendOtp };
export default smsService;
