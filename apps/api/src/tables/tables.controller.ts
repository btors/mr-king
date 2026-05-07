import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  findAll() {
    return this.tablesService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() body: { number: number; capacity?: number }) {
    return this.tablesService.create(body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }

  @Get(':id/bill')
  getBill(@Param('id') id: string) {
    return this.tablesService.getBill(id);
  }

  @Post(':id/pay')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER)
  payBill(@Param('id') id: string, @Body('paymentMethod') paymentMethod: string, @Request() req: any) {
    return this.tablesService.payBill(id, req.user.sub || req.user.id, paymentMethod);
  }
}
