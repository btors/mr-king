import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('OrdersGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Notifies connected clients when a new order is created.
   * - POS receives the full order.
   * - KDS receives only items that require kitchen preparation.
   */
  notifyOrderCreated(order: any) {
    // 1. Always notify POS with full data
    this.server.to('pos').emit('orderCreated', order);

    // 2. Notify KDS with filtered data
    const kitchenItems = order.items.filter(
      (item: any) => 
        item.product?.category?.preparationPlace === 'KITCHEN' ||
        item.product?.category?.name?.toUpperCase().includes('EXTRA')
    );

    if (kitchenItems.length > 0) {
      this.server.to('kds').emit('orderCreated', {
        ...order,
        items: kitchenItems,
      });
    }
  }

  /**
   * Notifies all connected clients when an order status changes.
   */
  notifyOrderStatusChanged(payload: {
    orderId: string;
    status: string;
    waiterId: string;
    tableId: string | null;
    tableNumber?: number;
  }) {
    this.server.to('pos').to('kds').emit('orderStatusChanged', payload);
  }

  @SubscribeMessage('joinPos')
  handleJoinPos(client: Socket) {
    client.join('pos');
    this.logger.log(`Client ${client.id} joined POS room`);
  }

  @SubscribeMessage('joinKds')
  handleJoinKds(client: Socket) {
    client.join('kds');
    this.logger.log(`Client ${client.id} joined KDS room`);
  }

  @SubscribeMessage('joinTable')
  handleJoinTable(@MessageBody() tableId: string, client: Socket) {
    client.join(`table:${tableId}`);
  }
}
