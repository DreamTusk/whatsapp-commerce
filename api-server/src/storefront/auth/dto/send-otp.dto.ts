import { IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizePhone } from '../../../utils/phone';

export class SendOtpDto {
  @Transform(({ value }) => normalizePhone(value))
  @IsPhoneNumber('IN', { message: 'Please provide a valid phone number' })
  phone: string;
}
