import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { PrinterModule } from '../printer/printer.module';

@Module({
  imports: [PrinterModule],
  controllers: [TablesController],
  providers: [TablesService]
})
export class TablesModule {}
