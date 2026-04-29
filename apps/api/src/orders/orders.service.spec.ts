import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { OrdersGateway } from '../events/orders.gateway';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: { create: jest.fn(), findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
          },
        },
        {
          provide: PricingService,
          useValue: { calculateOrderTotal: jest.fn() },
        },
        {
          provide: OrdersGateway,
          useValue: { notifyOrderCreated: jest.fn(), notifyOrderStatusChanged: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
