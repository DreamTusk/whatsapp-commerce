import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { StorageService } from './storage.service';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [EmailService, StorageService, SmsService],
  exports: [EmailService, StorageService, SmsService],
})
export class SharedModule {}
