import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    // 1. Get Active Shift
    const activeShift = await this.prisma.shift.findFirst({
      where: { status: 'OPEN' },
    });

    let totalSales = 0;
    let totalExpenses = 0;
    let netCash = 0;

    if (activeShift) {
      // Execute queries concurrently for the active shift metrics
      const [incomesResult, expensesResult] = await Promise.all([
        this.prisma.cashFlow.aggregate({
          where: { shiftId: activeShift.id, type: 'INCOME' },
          _sum: { amount: true },
        }),
        this.prisma.cashFlow.aggregate({
          where: { shiftId: activeShift.id, type: 'EXPENSE' },
          _sum: { amount: true },
        }),
      ]);

      totalSales = Number(incomesResult._sum.amount || 0);
      totalExpenses = Number(expensesResult._sum.amount || 0);
      netCash = Number(activeShift.openingBalance) + totalSales - totalExpenses;
    }

    // Execute queries concurrently for operational metrics
    const [activeTablesCount, pendingOrdersCount] = await Promise.all([
      this.prisma.table.count({
        where: { status: 'OCCUPIED' },
      }),
      this.prisma.order.count({
        where: { status: { in: ['PENDING', 'PREPARING'] } },
      }),
    ]);

    return {
      shiftActive: !!activeShift,
      totalSales,
      totalExpenses,
      netCash,
      activeTablesCount,
      pendingOrdersCount,
    };
  }
}
