import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    it('should calculate half-and-half pizza with different specialty prices', () => {
      const item = {
        quantity: 1,
        price: 0,
        config: {
          isHalfAndHalf: true,
          halfA: { price: 190 }, // La Mr King
          halfB: { price: 160 }, // Pepperoni
        },
      };
      // max(190, 160) + 15 = 205
      expect(service.calculateOrderItemPrice(item as any)).resolves.toBe(205);
    });

    it('should calculate tiered pricing for wings (12 pieces) ➜ $160', () => {
      const item = {
        quantity: 12,
        price: 0,
        categoryName: 'ALITAS',
      };
      expect(service.calculateOrderItemPrice(item as any)).resolves.toBe(160);
    });

    it('should calculate burger combo price correctly ➜ $80', () => {
      const item = {
        quantity: 1,
        price: 60,
        categoryName: 'HAMBURGUESAS',
        config: { isCombo: true },
      };
      // 60 + 20 = 80
      expect(service.calculateOrderItemPrice(item as any)).resolves.toBe(80);
    });

  describe('calculateOrderTotal', () => {
    it('should calculate order total for Hamburguesa ($60) + Papas ($20) ➜ Total $80', () => {
      const items = [
        { quantity: 1, price: 60 },
        { quantity: 1, price: 20 },
      ];
      expect(service.calculateOrderTotal(items as any)).resolves.toBe(80);
    });
  });
});
