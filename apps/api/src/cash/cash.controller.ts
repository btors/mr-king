import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CashService } from './cash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('close')
  @Roles(Role.ADMIN, Role.KITCHEN)
  async close(@Body() body: { amount: number; userId: string }) {
    return this.cashService.closeCash(body.amount, body.userId);
  }

  @Post('expense')
  @Roles(Role.ADMIN)
  async addExpense(@Body() body: { amount: number; description: string }, @Request() req: any) {
    try {
      return await this.cashService.addExpense(body.amount, body.description, req.user.sub || req.user.id);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
