import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { OrdersGateway } from '../events/orders.gateway';
import { PrinterService } from '../printer/printer.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly ordersGateway: OrdersGateway,
    private readonly printerService: PrinterService,
  ) {}

  async create(createOrderDto: any) {
    const { items, waiterId, tableId, orderType, clientName, clientType } = createOrderDto;

    // Omnichannel validation
    const type = orderType || 'EAT_IN';
    if ((type === 'TAKE_AWAY' || type === 'DELIVERY') && !clientName?.trim()) {
      throw new BadRequestException('El campo clientName es obligatorio para pedidos TAKE_AWAY y DELIVERY.');
    }

    // 1. Calculate prices server-side — never trust frontend prices.
    //    calculateOrderItemPrice() returns the full line total (unitPrice × qty).
    const itemsWithPrices: Array<{ item: any; lineTotal: number }> = [];
    for (const item of items) {
      const lineTotal = await this.pricingService.calculateOrderItemPrice(item);
      itemsWithPrices.push({ item, lineTotal });
    }
    const total = Math.round(itemsWithPrices.reduce((acc, { lineTotal }) => acc + lineTotal, 0) * 100) / 100;

    // 2. Create order and update table status in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Fetch products to check preparation place
      const productIds = items.map((i: any) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      });

      const newOrder = await tx.order.create({
        data: {
          total,
          waiterId,
          tableId: tableId || null,
          orderType: type,
          clientName,
          clientType,
          items: {
            create: itemsWithPrices.map(({ item, lineTotal }) => {
              const product = products.find((p) => p.id === item.productId);
              const isKitchen = product?.category?.preparationPlace === 'KITCHEN';
              
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: Math.round((lineTotal / item.quantity) * 100) / 100,
                notes: item.notes,
                pizzaConfig: item.config || {},
                status: isKitchen ? 'PENDING' : 'READY',
              };
            }),
          },
        },
        include: {
          items: true,
        },
      });

      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      return newOrder;
    });

    // 3. Emit real-time event (Filtered for KDS)
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { 
          include: { 
            product: {
              include: { category: true }
            } 
          } 
        },
        table: true,
      },
    });

    if (fullOrder) {
      this.ordersGateway.notifyOrderCreated(fullOrder);
    }

    return order;
  }

  /**
   * Pay a single order (for TAKE_AWAY / DELIVERY or tableless EAT_IN).
   * Registers a CashFlow INCOME linked to the active Shift.
   */
   async payOrder(orderId: string, userId: string, paymentMethod?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BadRequestException('Orden no encontrada.');
      if (order.status === 'PAID' || order.status === 'CANCELLED') {
        throw new BadRequestException('Esta orden ya fue cobrada o cancelada.');
      }

      // Shift restriction
      const activeShift = await tx.shift.findFirst({ where: { status: 'OPEN' } });
      if (!activeShift) throw new BadRequestException('Debes abrir caja para poder cobrar.');

      // Validate user exists — reject invalid actors to preserve sales traceability
      const userExists = await tx.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        throw new UnauthorizedException('Usuario no válido para registrar esta venta.');
      }

      const amount = Number(order.total);
      if (amount > 0) {
        const label = order.clientName
          ? `Cobro Pedido – ${order.clientName} (${order.orderType})`
          : `Cobro Pedido #${order.id.slice(-6)}`;

        const method = (paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') ? paymentMethod : 'CASH';

        await tx.cashFlow.create({
          data: {
            amount,
            type: 'INCOME',
            description: label,
            userId: userId,
            shiftId: activeShift.id,
            orderId: order.id,
            paymentMethod: method as any,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      // Misión 4: Atomicidad de Mesas
      if (updatedOrder.tableId) {
        const remainingActiveOrders = await tx.order.count({
          where: {
            tableId: updatedOrder.tableId,
            status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
          },
        });

        if (remainingActiveOrders === 0) {
          await tx.table.update({
            where: { id: updatedOrder.tableId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return updatedOrder;
    });

    // Fire-and-forget printing to avoid blocking the payment flow
    this.printerService.printOrderTicket(result.id).catch((err) => {
      console.error('Error enviando a la ticketera de cocina/caja:', err);
    });

    return result;
  }

  async findAll(preparationPlace?: string) {
    const where: any = {
      status: {
        in: ['PENDING', 'PREPARING', 'READY'],
      },
    };

    if (preparationPlace) {
      where.items = {
        some: {
          product: {
            category: {
              preparationPlace: preparationPlace,
            },
          },
        },
      };
    }

    const orders = await this.prisma.order.findMany({
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        waiter: {
          select: { name: true, role: true },
        },
        table: true,
      },
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (preparationPlace) {
      return orders.map((order) => ({
        ...order,
        items: order.items.filter(
          (item) => item.product?.category?.preparationPlace === preparationPlace,
        ),
      }));
    }

    return orders;
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
      waiterId: order.waiterId,
      tableId: order.tableId,
      tableNumber: order.table?.number,
    });

    return order;
  }
}
