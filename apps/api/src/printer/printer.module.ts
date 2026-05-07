import { Module } from '@nestjs/common';
import { PrinterService } from './printer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PrinterService],
  exports: [PrinterService],
})
export class PrinterModule {}
