import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterService } from '../printer/printer.service';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printerService: PrinterService,
  ) {}

  findAll() {
    return this.prisma.table.findMany({
      orderBy: [{ type: 'asc' }, { number: 'asc' }],
    });
  }

  async create(data: { number: number; capacity?: number; type?: any }) {
    const tableType = data.type || 'TABLE';
    const existing = await this.prisma.table.findUnique({
      where: {
        number_type: {
          number: data.number,
          type: tableType,
        },
      },
    });
    if (existing) {
      const label = tableType === 'STOOL' ? 'banco' : 'mesa';
      throw new BadRequestException(`El ${label} #${data.number} ya existe.`);
    }
    return this.prisma.table.create({
      data: {
        number: data.number,
        capacity: data.capacity ?? 4,
        type: tableType,
      },
    });
  }

  async remove(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) {
      throw new NotFoundException(`Mesa no encontrada.`);
    }
    if (table.status === 'OCCUPIED') {
      throw new BadRequestException('No se puede eliminar una mesa que está ocupada.');
    }
    // Also check for any pending orders that may not have updated table status yet
    const pendingOrders = await this.prisma.order.count({
      where: { tableId: id, status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] } }
    });
    if (pendingOrders > 0) {
      throw new BadRequestException('No se puede eliminar una mesa con órdenes activas.');
    }
    return this.prisma.table.delete({ where: { id } });
  }

  async getBill(id: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        tableId: id,
        status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    const total = orders.reduce((acc, order) => acc + Number(order.total), 0);

    return {
      tableId: id,
      orders,
      total,
    };
  }

  async payBill(id: string, userId: string, paymentMethod?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 0. Atomic Concurrency Lock: Use conditional update as test-and-set.
      // Only ONE concurrent request can win this — it atomically changes status to 'PAYING'.
      const lockResult = await tx.table.updateMany({
        where: { id, status: 'OCCUPIED' },
        data: { status: 'AVAILABLE' },
      });
      if (lockResult.count === 0) {
        throw new BadRequestException('Esta mesa ya ha sido pagada o no tiene pedidos activos.');
      }
      const table = await tx.table.findUnique({ where: { id } });

      // 0.5. Shift restriction (Candado de Caja)
      const activeShift = await tx.shift.findFirst({ where: { status: 'OPEN' } });
      if (!activeShift) {
        throw new BadRequestException('Debes abrir caja para poder cobrar');
      }

      // 1. Get all active orders to calculate total income
      const activeOrders = await tx.order.findMany({
        where: {
          tableId: id,
          status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
        },
      });

      if (activeOrders.length === 0) {
        throw new BadRequestException('No hay órdenes activas para cobrar en esta mesa.');
      }

      // 2. We already have 'table' from step 0

      let finalUserId = userId;
      // Ensure the user exists to avoid FK violations
      const userExists = await tx.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        const firstAdmin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
        if (firstAdmin) finalUserId = firstAdmin.id;
      }

      const method = (paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') ? paymentMethod : 'CASH';
      const label = table?.type === 'STOOL' ? 'Banco' : 'Mesa';

      // 3. Generate individual CashFlow records per order to preserve traceability and orderId linking
      for (const order of activeOrders) {
        const orderAmount = Number(order.total);
        if (orderAmount > 0) {
          await tx.cashFlow.create({
            data: {
              amount: orderAmount,
              type: 'INCOME',
              description: `Cobro Pedido #${order.id.slice(-6).toUpperCase()} - Cuenta ${label} #${table?.number || id}`,
              userId: finalUserId,
              shiftId: activeShift.id,
              orderId: order.id,
              paymentMethod: method as any,
            },
          });
        }
      }

      // 4. Mark all active orders for this table as PAID
      await tx.order.updateMany({
        where: {
          tableId: id,
          status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
        },
        data: { status: 'PAID' },
      });

      // 5. Free the table
      const updatedTable = await tx.table.update({
        where: { id },
        data: { status: 'AVAILABLE' },
      });

      return {
        table: updatedTable,
        orders: activeOrders,
      };
    });

    // Post-cobro: Enlazar la Impresión Automática al Cobro de la Mesa
    if (result.orders && result.orders.length > 0) {
      for (const order of result.orders) {
        this.printerService.printOrderTicket(order.id).catch((err) => {
          console.error(`Error enviando ticket de Mesa #${order.tableId} a la ticketera:`, err);
        });
      }
    }

    return result.table;
  }
}
