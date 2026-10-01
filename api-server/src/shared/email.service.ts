import { Injectable, Logger } from '@nestjs/common';

const ZEPTOMAIL_API_URL =
  process.env.ZEPTOMAIL_API_URL ?? 'https://api.zeptomail.com/v1.1/email/template';

// Notifications without a ZeptoMail template yet are logged to console for now.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendSimpleEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`\n📧 EMAIL TO: ${to}`);
    console.log(`   SUBJECT: ${subject}`);
    console.log(`   BODY:\n${body}\n`);
  }

  async sendSignupOtpEmail(to: string, name: string, otp: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_SIGNUP_OTP',
      'signup OTP',
      to,
      name,
      { name, otp },
    );
  }

  async sendForgotPasswordEmail(to: string, name: string, otp: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_FORGOT_PASSWORD',
      'forgot-password OTP',
      to,
      name,
      { name, otp },
    );
  }

  async sendInviteEmail(to: string, storeName: string, role: string, inviteLink: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_INVITE',
      'staff invite',
      to,
      undefined,
      { store_name: storeName, role, invite_link: inviteLink },
    );
  }

  async sendStoreCreatedEmail(to: string, name: string, storeName: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_STORE_CREATED',
      'store created',
      to,
      name,
      { name, store_name: storeName },
    );
  }

  async sendStoreUpdatedEmail(to: string, name: string, storeName: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_STORE_UPDATED',
      'store updated',
      to,
      name,
      { name, store_name: storeName },
    );
  }

  async sendStoreActivatedEmail(to: string, name: string, storeName: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_STORE_ACTIVATED',
      'store activated',
      to,
      name,
      { name, store_name: storeName },
    );
  }

  async sendStoreDeactivatedEmail(to: string, name: string, storeName: string): Promise<void> {
    await this.sendTemplateEmail(
      'ZEPTOMAIL_TEMPLATE_KEY_STORE_DEACTIVATED',
      'store deactivated',
      to,
      name,
      { name, store_name: storeName },
    );
  }

  private async sendTemplateEmail(
    templateEnvVar: string,
    label: string,
    to: string,
    recipientName: string | undefined,
    mergeInfo: Record<string, string>,
  ): Promise<void> {
    const token = process.env.ZEPTOMAIL_API_TOKEN;
    const templateKey = process.env[templateEnvVar];

    if (!token || !templateKey) {
      console.log(`\n📧 [ZeptoMail not configured] ${label} for ${to}: ${JSON.stringify(mergeInfo)}\n`);
      return;
    }

    const res = await fetch(ZEPTOMAIL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        template_key: templateKey,
        from: {
          address: process.env.ZEPTOMAIL_FROM_EMAIL,
          name: process.env.ZEPTOMAIL_FROM_NAME,
        },
        to: [{ email_address: { address: to, name: recipientName } }],
        merge_info: mergeInfo,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(`ZeptoMail ${label} send failed (${res.status}): ${errBody}`);
      throw new Error(`Failed to send ${label} email`);
    }

    this.logger.log(`ZeptoMail ${label} email queued for ${to}`);
  }
}
