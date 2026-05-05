import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowType } from '@prisma/client';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async closeCash(amount: number, userId: string) {
    // This seems to be a legacy method, but we can link it to the shift as well
    const activeShift = await this.prisma.shift.findFirst({ where: { status: 'OPEN' } });
    
    return this.prisma.cashFlow.create({
      data: {
        amount,
        userId,
        type: CashFlowType.INCOME,
        description: 'Cierre de Caja',
        shiftId: activeShift ? activeShift.id : undefined,
      },
    });
  }

  async addExpense(amount: number, description: string, userId: string) {
    if (amount <= 0) {
      throw new Error('El monto del egreso debe ser mayor a cero.');
    }
    const activeShift = await this.prisma.shift.findFirst({ where: { status: 'OPEN' } });
    if (!activeShift) {
      throw new Error('Debes abrir caja para registrar un egreso');
    }

    return this.prisma.cashFlow.create({
      data: {
        amount,
        userId,
        type: CashFlowType.EXPENSE,
        description,
        shiftId: activeShift.id,
      },
    });
  }
}
