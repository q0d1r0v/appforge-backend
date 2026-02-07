import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '@/modules/users/users.service';
import { EmailService } from '@/modules/email/email.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    await this.usersService.updateLastLogin(user.id);

    return {
      user,
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const { password, ...result } = user;

    const payload = { sub: user.id, email: user.email, role: user.role };

    // Send welcome email (fire-and-forget)
    this.emailService.sendWelcomeEmail(user.email, user.name);

    return {
      user: result,
      accessToken: this.jwtService.sign(payload),
    };
  }
}
