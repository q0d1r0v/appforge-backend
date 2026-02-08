import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  /** The email verification token received via email */
  @IsString()
  @IsNotEmpty()
  token: string;
}
