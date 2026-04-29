import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingModule } from '../pricing/pricing.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, PricingModule, EventsModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
