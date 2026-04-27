import { Test, TestingModule } from '@nestjs/testing';
import { OrdersGateway } from './orders.gateway';
import { Server } from 'socket.io';

describe('OrdersGateway', () => {
  let gateway: OrdersGateway;
  let mockServer: Partial<Server>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersGateway],
    }).compile();

    gateway = module.get<OrdersGateway>(OrdersGateway);
    mockServer = {
      emit: jest.fn(),
    };
    gateway.server = mockServer as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('notifyOrderCreated', () => {
    it('should emit orderCreated event with order data', () => {
      const orderData = { id: 'order-123', total: 195 };
      gateway.notifyOrderCreated(orderData);

      expect(mockServer.emit).toHaveBeenCalledWith('orderCreated', orderData);
    });
  });

  describe('notifyOrderStatusChanged', () => {
    it('should emit orderStatusChanged event with payload', () => {
      const payload = { orderId: 'order-123', status: 'READY' };
      gateway.notifyOrderStatusChanged(payload);

      expect(mockServer.emit).toHaveBeenCalledWith('orderStatusChanged', payload);
    });
  });
});
