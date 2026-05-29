import { Injectable } from '@nestjs/common';

// Zepto Mail will be integrated later. OTPs and notifications are logged to console for now.
@Injectable()
export class EmailService {
  async sendSimpleEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`\n📧 EMAIL TO: ${to}`);
    console.log(`   SUBJECT: ${subject}`);
    console.log(`   BODY:\n${body}\n`);
  }
}
