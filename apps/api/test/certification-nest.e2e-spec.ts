import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PricingService } from '../src/pricing/pricing.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Certificación de Negocio V-Final (e2e y unitiaria)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let pricingService: PricingService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    jwtService = app.get<JwtService>(JwtService);
    pricingService = app.get<PricingService>(PricingService);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('🔹 Caso 1: Seguridad RBAC (Controladores Admin)', async () => {
    const waiterToken = jwtService.sign({
      username: 'waitermock',
      sub: 'mock-waiter-1',
      role: Role.WAITER,
    });

    // Petición con WAITER -> debe ser 403
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ name: 'Producto Ilegal', price: 100, categoryId: 'cat1' })
      .expect(403);

    const adminToken = jwtService.sign({
      username: 'adminmock',
      sub: 'mock-admin-1',
      role: Role.ADMIN,
    });

    // Mock Prisma to return 201 Created successfully
    jest.spyOn(prismaService.product, 'create').mockResolvedValueOnce({
      id: 'prod-new-1',
      name: 'Producto Legal',
      price: 150 as any,
      isActive: true,
      requiresSizes: false,
      allowMultipleSauces: false,
      maxSauces: 0,
      categoryId: 'cat1',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Petición con ADMIN -> debe ser 201
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Producto Legal', price: 150, categoryId: 'cat1' })
      .expect(201);
  });

  it('🔹 Caso 2: Bloqueo Restrictivo por maxSauces (Alitas)', async () => {
    jest.spyOn(prismaService.product, 'findUnique').mockResolvedValueOnce({
      id: 'mock-wing-id',
      name: 'Alitas 6 piezas',
      description: null,
      categoryId: 'ALITAS',
      price: 85 as any,
      isActive: true,
      requiresSizes: false,
      allowMultipleSauces: true,
      maxSauces: 1, // RESTRICCIÓN a 1 salsa!
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(pricingService.calculateOrderItemPrice({
      quantity: 1,
      price: 85,
      productId: 'mock-wing-id',
      config: {
        variants: ['BBQ', 'Bufalo'] // 2 SALSAS! (Ilegal)
      }
    })).rejects.toThrow(BadRequestException);
  });

  it('🔹 Caso 3: Integridad Dinámica de Pizza Matemática', async () => {
    // 2 mocks consecutivos de findUnique para las dos mitades
    jest.spyOn(prismaService.product, 'findUnique')
      .mockResolvedValueOnce({
        id: 'pizza-a', price: 160 as any, name: 'Mitad A' // 160
      } as any)
      .mockResolvedValueOnce({
        id: 'pizza-b', price: 190 as any, name: 'Mitad B' // 190
      } as any);

    const finalPrice = await pricingService.calculateOrderItemPrice({
      quantity: 1,
      price: 50, // PRECIO MALICIOSO DESDE EL FRONTEND
      config: {
        isHalfAndHalf: true,
        halfA: { productId: 'pizza-a', price: 50 }, // intentando engañar con $50
        halfB: { productId: 'pizza-b', price: 50 }, // intentando engañar con $50
      }
    });

    // Math.max(160, 190) + 15 = 205
    expect(finalPrice).toBe(205);
  });
});
