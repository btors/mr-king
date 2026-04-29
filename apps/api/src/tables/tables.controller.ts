import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  findAll() {
    return this.tablesService.findAll();
  }

  @Get(':id/bill')
  @UseGuards(JwtAuthGuard)
  getBill(@Param('id') id: string) {
    return this.tablesService.getBill(id);
  }

  @Post(':id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER)
  payBill(@Param('id') id: string, @Request() req: any) {
    return this.tablesService.payBill(id, req.user.sub || req.user.id);
  }
}
