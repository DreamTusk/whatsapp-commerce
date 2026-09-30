import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { StorageService } from './storage.service';
import { SmsService } from './sms.service';
import { FileService } from './file.service';
import { InvoiceService } from './invoice.service';

@Global()
@Module({
  providers: [EmailService, StorageService, SmsService, FileService, InvoiceService],
  exports: [EmailService, StorageService, SmsService, FileService, InvoiceService],
})
export class SharedModule {}
