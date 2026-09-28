import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInviteDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'role is required' })
  @IsIn(Object.values(Role), { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  role: Role;
}
