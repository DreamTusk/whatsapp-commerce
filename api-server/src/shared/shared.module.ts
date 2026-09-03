import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { StorageService } from './storage.service';
import { SmsService } from './sms.service';
import { FileService } from './file.service';

@Global()
@Module({
  providers: [EmailService, StorageService, SmsService, FileService],
  exports: [EmailService, StorageService, SmsService, FileService],
})
export class SharedModule {}
