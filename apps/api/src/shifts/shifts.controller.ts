import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { OpenShiftDto, CloseShiftDto } from './shifts.dto';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @Roles(Role.ADMIN)
  openShift(@Body() dto: OpenShiftDto, @Request() req: any) {
    return this.shiftsService.openShift(dto.openingBalance, req.user.sub || req.user.id);
  }

  @Get('current')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN)
  getCurrentShift() {
    return this.shiftsService.getCurrentShift();
  }

  @Post('close')
  @Roles(Role.ADMIN)
  closeShift(@Body() dto: CloseShiftDto, @Request() req: any) {
    return this.shiftsService.closeShift(dto.actualBalance, req.user.sub || req.user.id);
  }

  @Get('history')
  @Roles(Role.ADMIN)
  getClosedShifts() {
    return this.shiftsService.getClosedShifts();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  getShiftById(@Param('id') id: string) {
    return this.shiftsService.getShiftById(id);
  }
}
