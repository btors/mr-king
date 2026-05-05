import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PricingModule } from './pricing/pricing.module';
import { EventsModule } from './events/events.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PizzasModule } from './pizzas/pizzas.module';
import { CashModule } from './cash/cash.module';
import { TablesModule } from './tables/tables.module';
import { ShiftsModule } from './shifts/shifts.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PricingModule,
    EventsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    PizzasModule,
    CashModule,
    TablesModule,
    ShiftsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

