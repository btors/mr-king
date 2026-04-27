import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DB Data Integrity (Prisma JSON)', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            orderItem: {
              create: jest.fn().mockImplementation((args) => Promise.resolve(args.data)),
              findUnique: jest.fn().mockImplementation((args) => Promise.resolve({
                ...args.where,
                pizzaConfig: {
                  isHalfAndHalf: true,
                  halfA: { 
                    name: 'Peperoni', 
                    price: 160, 
                    extras: ['Extra Cheese', 'Olives'] 
                  },
                  halfB: { 
                    name: 'Hawaiana', 
                    price: 180, 
                    extras: ['Bacon'] 
                  },
                }
              })),
            },
          },
        },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be able to handle complex pizzaConfig JSON in OrderItem', async () => {
    const complexPizzaConfig = {
      isHalfAndHalf: true,
      halfA: { 
        name: 'Peperoni', 
        price: 160, 
        extras: ['Extra Cheese', 'Olives'] 
      },
      halfB: { 
        name: 'Hawaiana', 
        price: 180, 
        extras: ['Bacon'] 
      },
    };

    const orderItemData = {
      quantity: 1,
      price: 195,
      productId: 'prod-123',
      orderId: 'order-456',
      pizzaConfig: complexPizzaConfig,
    };

    // Simulate creation
    const createdItem = await prisma.orderItem.create({
      data: orderItemData,
    });

    // Verify that the config is preserved exactly
    expect(createdItem.pizzaConfig).toEqual(complexPizzaConfig);
    expect(createdItem.pizzaConfig.halfA.extras).toContain('Olives');
    
    // Simulate retrieval
    const retrievedItem = await prisma.orderItem.findUnique({
      where: { id: 'item-1' }
    });

    expect(retrievedItem.pizzaConfig).toMatchObject(complexPizzaConfig);
  });
});
