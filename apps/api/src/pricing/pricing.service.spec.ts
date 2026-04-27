import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOrderItemPrice', () => {
    it('should calculate half-and-half pizza: Mitad A ($160) + Mitad B ($180) ➜ Total $195', () => {
      const item = {
        quantity: 1,
        price: 0, // Base price not used for half-and-half
        pizzaConfig: {
          isHalfAndHalf: true,
          halfA: { name: 'Peperoni', price: 160 },
          halfB: { name: 'Hawaiana', price: 180 },
        },
      };
      // max(160, 180) + 15 = 195
      expect(service.calculateOrderItemPrice(item)).toBe(195);
    });

    it('should calculate half-and-half pizza: Mitad A ($190) + Mitad B ($190) ➜ Total $205', () => {
      const item = {
        quantity: 1,
        price: 0,
        pizzaConfig: {
          isHalfAndHalf: true,
          halfA: { name: 'Especial', price: 190 },
          halfB: { name: 'Especial', price: 190 },
        },
      };
      // max(190, 190) + 15 = 205
      expect(service.calculateOrderItemPrice(item)).toBe(205);
    });

    it('should calculate simple items correctly', () => {
      // Hamburguesa sencilla ($60)
      const burger = {
        quantity: 1,
        price: 60,
      };
      expect(service.calculateOrderItemPrice(burger)).toBe(60);

      // Papas ($20)
      const fries = {
        quantity: 1,
        price: 20,
      };
      expect(service.calculateOrderItemPrice(fries)).toBe(20);
    });
  });

  describe('calculateOrderTotal', () => {
    it('should calculate order total for Hamburguesa ($60) + Papas ($20) ➜ Total $80', () => {
      const items = [
        { quantity: 1, price: 60 },
        { quantity: 1, price: 20 },
      ];
      expect(service.calculateOrderTotal(items)).toBe(80);
    });
  });
});
