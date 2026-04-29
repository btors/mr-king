import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { OrdersGateway } from '../events/orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(createOrderDto: any) {
    const { items, waiterId, tableId, orderType, clientName, clientType } = createOrderDto;

    // 1. Calculate total using PricingService
    const total = await this.pricingService.calculateOrderTotal(items);

    // 2. Create order in transaction
    const order = await this.prisma.order.create({
      data: {
        total,
        waiterId,
        tableId,
        orderType,
        clientName,
        clientType,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price, // Store the unit price at time of sale
            notes: item.notes,
            pizzaConfig: item.config || {},
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 3. Emit real-time event
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: true } },
        table: true,
      },
    });

    if (fullOrder) {
      this.ordersGateway.notifyOrderCreated(fullOrder);
    }

    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
        waiter: {
          select: { name: true, role: true },
        },
        table: true,
      },
      where: {
        status: {
          in: ['PENDING', 'PREPARING', 'READY'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: any) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: { product: true },
        },
        table: true,
      },
    });

    this.ordersGateway.notifyOrderStatusChanged({
      orderId: order.id,
      status: order.status,
    });

    return order;
  }
}
