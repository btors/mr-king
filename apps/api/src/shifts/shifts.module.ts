import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrinterModule } from '../printer/printer.module';

@Module({
  imports: [PrismaModule, PrinterModule],
  providers: [ShiftsService],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
