import { IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizePhone } from '../../../utils/phone';

export class VerifyOtpDto {
  @Transform(({ value }) => normalizePhone(value))
  @IsPhoneNumber('IN', { message: 'Please provide a valid phone number' })
  phone: string;

  @IsNotEmpty({ message: 'otp is required' })
  otp: string;
}
