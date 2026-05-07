import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: any, @Request() req: any) {
    // Override whatever the frontend sends to ensure security
    createOrderDto.waiterId = req.user.sub || req.user.id;
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @Public()
  findAll(@Request() req: any) {
    const { place } = req.query;
    return this.ordersService.findAll(place);
  }

  @Patch(':id/status')
  @Public()
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status as any);
  }

  @Post(':id/pay')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.WAITER)
  payOrder(@Param('id') id: string, @Body('paymentMethod') paymentMethod: string, @Request() req: any) {
    return this.ordersService.payOrder(id, req.user.sub || req.user.id, paymentMethod);
  }
}
