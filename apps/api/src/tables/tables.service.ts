import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.table.findMany({
      orderBy: { number: 'asc' },
    });
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

  async payBill(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get all active orders to calculate total income
      const activeOrders = await tx.order.findMany({
        where: {
          tableId: id,
          status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
        },
      });

      const totalAmount = activeOrders.reduce((acc, order) => acc + Number(order.total), 0);

      // 2. Fetch table info for the description
      const table = await tx.table.findUnique({ where: { id } });

      let finalUserId = userId;
      // Ensure the user exists to avoid FK violations
      const userExists = await tx.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        const firstAdmin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
        if (firstAdmin) finalUserId = firstAdmin.id;
      }

      if (totalAmount > 0) {
        // 3. Generate CashFlow record (INCOME)
        await tx.cashFlow.create({
          data: {
            amount: totalAmount,
            type: 'INCOME',
            description: `Cobro Cuenta Mesa #${table?.number || id}`,
            userId: finalUserId,
          },
        });
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
      return tx.table.update({
        where: { id },
        data: { status: 'AVAILABLE' },
      });
    });
  }
}
