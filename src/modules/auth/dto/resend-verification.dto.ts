import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  /** The email address to resend verification to */
  @IsEmail()
  email: string;
}
