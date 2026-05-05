import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async openShift(openingBalance: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const activeShift = await tx.shift.findFirst({
        where: { status: 'OPEN' },
      });

      if (activeShift) {
        throw new BadRequestException('Ya existe un turno abierto.');
      }

      if (openingBalance < 0) {
        throw new BadRequestException('El fondo de apertura no puede ser negativo.');
      }

      return tx.shift.create({
        data: {
          openingBalance,
          openedById: userId,
          status: 'OPEN',
        },
      });
    });
  }

  async getCurrentShift() {
    const shift = await this.prisma.shift.findFirst({
      where: { status: 'OPEN' },
      include: {
        openedBy: { select: { id: true, name: true, role: true } },
        cashFlows: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('No hay turno abierto actualmente.');
    }

    return shift;
  }

  async closeShift(actualBalance: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const activeShift = await tx.shift.findFirst({
        where: { status: 'OPEN' },
        include: {
          cashFlows: true,
        },
      });

      if (!activeShift) {
        throw new BadRequestException('No hay turno abierto para cerrar.');
      }

      // Check for pending orders before closing
      const pendingOrdersCount = await tx.order.count({
        where: {
          status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
        },
      });

      if (pendingOrdersCount > 0) {
        throw new BadRequestException(`No se puede cerrar el turno. Hay ${pendingOrdersCount} órdenes pendientes de cobro.`);
      }

      // Calculate expected balance: Opening Balance + Incomes - Expenses
      let netCashFlows = 0;
      for (const cf of activeShift.cashFlows) {
        if (cf.type === 'INCOME') {
          netCashFlows += Number(cf.amount);
        } else if (cf.type === 'EXPENSE') {
          netCashFlows -= Number(cf.amount);
        }
      }

      const expectedBalance = Number(activeShift.openingBalance) + netCashFlows;

      return tx.shift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          actualBalance,
          expectedBalance,
          closedAt: new Date(),
          closedById: userId,
        },
      });
    });
  }
}
