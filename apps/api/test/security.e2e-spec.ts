import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('Security RBAC (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  it('POST /auth/register should return 403 for WAITER role', async () => {
    // Generate a token for a WAITER
    const token = jwtService.sign({ username: 'waiter', sub: 'waiter-id', role: 'WAITER' });

    return request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newuser', password: 'password', name: 'New User', role: 'WAITER' })
      .expect(403);
  });

  it('POST /products should return 403 for WAITER role', async () => {
    const token = jwtService.sign({ username: 'waiter', sub: 'waiter-id', role: 'WAITER' });

    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hack Product', price: 999, categoryId: 'cat-id' })
      .expect(403);
  });

  it('POST /auth/register should return 201 for ADMIN role', async () => {
    const token = jwtService.sign({ username: 'admin', sub: 'admin-id', role: 'ADMIN' });

    // Note: This might fail if the user already exists, but we are testing RBAC first.
    // We'll use a random username.
    const randomUser = `user_${Math.random().toString(36).substring(7)}`;

    return request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: randomUser, password: 'password', name: 'New Admin', role: 'ADMIN' })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
