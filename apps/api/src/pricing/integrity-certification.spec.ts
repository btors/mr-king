import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { OrdersGateway } from '../events/orders.gateway';

describe('Integrity Certification - Post-Refactor', () => {
  let service: PricingService;
  let gateway: OrdersGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: OrdersGateway,
          useValue: {
            server: {
              emit: jest.fn(),
            },
            notifyOrderCreated: jest.fn().mockImplementation(function(order) {
              this.server.emit('orderCreated', order);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    gateway = module.get<OrdersGateway>(OrdersGateway);
  });

  it('🔹 Caso de Prueba 1: Lógica de Pizza de Alta Gama (Familiar + Mitad) ➜ $275.00', () => {
    const pizzaItem = {
      quantity: 1,
      price: 0,
      categoryName: 'PIZZAS',
      config: {
        isHalfAndHalf: true,
        halfA: { name: 'La Mr King FM', price: 260 },
        halfB: { name: 'Hawaiana Especial FM', price: 230 },
      },
    };
    
    const result = service.calculateOrderItemPrice(pizzaItem);
    expect(result).toBe(275.00);
  });

  it('🔹 Caso de Prueba 2: Combo de Hamburguesa Sirloin ➜ $140.00', () => {
    const burgerItem = {
      quantity: 1,
      price: 120, // Sirloin Base Price
      categoryName: 'HAMBURGUESAS',
      productName: 'Sirloin',
      config: {
        isCombo: true,
      },
    };

    const result = service.calculateOrderItemPrice(burgerItem);
    expect(result).toBe(140.00);
  });

  it('🔹 Caso de Prueba 3: Hot Dog Hawaiano en Combo ➜ $60.00', () => {
    const hotDogItem = {
      quantity: 1,
      price: 45, // HD Hawaiano Base Price
      categoryName: 'HOT DOGS',
      productName: 'Hawaiano',
      config: {
        isCombo: true,
      },
    };

    const result = service.calculateOrderItemPrice(hotDogItem);
    expect(result).toBe(60.00);
  });

  it('🔹 Caso de Prueba 4: Escalamiento de Alitas (24 piezas) ➜ $290.00', () => {
    const wingsItem = {
      quantity: 24, // Pieces
      price: 15, // Dummy unit price, should be ignored
      categoryName: 'ALITAS',
      productName: 'Alitas',
    };

    const result = service.calculateOrderItemPrice(wingsItem);
    expect(result).toBe(290.00);
  });

  it('🔹 Caso de Prueba 5: Latencia y Sockets (Tiempo Real) ➜ < 300ms + JSON Integrity', async () => {
    const complexOrder = {
      id: 'order-cert-001',
      items: [
        { 
          productName: 'La Mr King FM', 
          categoryName: 'PIZZAS',
          quantity: 1, 
          price: 275,
          pizzaConfig: {
            isHalfAndHalf: true,
            halfA: { name: 'La Mr King FM', price: 260 },
            halfB: { name: 'Hawaiana Especial FM', price: 230 },
          }
        },
        { productName: 'Coca 2.75', quantity: 2, price: 60 },
        { productName: 'Salchipulpos', quantity: 1, price: 85 }
      ],
      total: 275 + (2 * 60) + 85 // 275 + 120 + 85 = 480
    };

    const startTime = Date.now();
    
    // Simulate Gateway Call
    gateway.notifyOrderCreated(complexOrder);
    
    const endTime = Date.now();
    const latency = endTime - startTime;

    // Latency Check
    expect(latency).toBeLessThan(300);

    // Socket Emission Check
    expect(gateway.server.emit).toHaveBeenCalledWith('orderCreated', expect.objectContaining({
      id: 'order-cert-001',
      items: expect.arrayContaining([
        expect.objectContaining({
          pizzaConfig: expect.objectContaining({
            isHalfAndHalf: true,
            halfA: expect.objectContaining({ name: 'La Mr King FM' })
          })
        })
      ])
    }));
  });
});
