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
  server: Server;

  private logger: Logger = new Logger('OrdersGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Notifies all connected clients when a new order is created.
   */
  notifyOrderCreated(order: any) {
    this.server.emit('orderCreated', order);
  }

  /**
   * Notifies all connected clients when an order status changes.
   */
  notifyOrderStatusChanged(payload: { orderId: string; status: string }) {
    this.server.emit('orderStatusChanged', payload);
  }

  @SubscribeMessage('joinTable')
  handleJoinTable(@MessageBody() tableId: string, client: Socket) {
    client.join(`table:${tableId}`);
  }
}
