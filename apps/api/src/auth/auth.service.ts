import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    // Standard DB validation only
    const user = await this.usersService.findOneByUsername(username);
    if (user && user.isActive && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    };
  }

  async getPins() {
    try {
      const adminUser = await this.usersService.findOneByRole('ADMIN');
      const waiterUser = await this.usersService.findOneByRole('WAITER');

      return {
        adminId: adminUser?.id || 'admin-id',
        waiterId: waiterUser?.id || 'waiter-id',
      };
    } catch (e: any) {
      return {
        error: e.message,
        stack: e.stack,
      };
    }
  }
}
