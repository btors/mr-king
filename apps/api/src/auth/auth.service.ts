import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    // 1. Check environment PINs for special roles
    const adminPin = this.configService.get<string>('ADMIN_PIN');
    const waiterPin = this.configService.get<string>('WAITER_PIN');

    if (username === 'admin' && adminPin && pass === adminPin) {
      const user = await this.usersService.findOneByUsername('admin');
      if (user) {
        const { password, ...result } = user;
        return result;
      }
    }

    if (username === 'waiter' && waiterPin && pass === waiterPin) {
      const user = await this.usersService.findOneByUsername('waiter');
      if (user) {
        const { password, ...result } = user;
        return result;
      }
    }

    // 2. Standard DB validation
    const user = await this.usersService.findOneByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
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
    const adminUser = await this.usersService.findOneByRole('ADMIN');
    const waiterUser = await this.usersService.findOneByRole('WAITER');

    return {
      adminPin: this.configService.get<string>('ADMIN_PIN'),
      waiterPin: this.configService.get<string>('WAITER_PIN'),
      adminId: adminUser?.id || 'admin-id',
      waiterId: waiterUser?.id || 'waiter-id',
    };
  }
}
