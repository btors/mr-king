import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CashFlowType } from '@prisma/client';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async closeCash(amount: number, userId: string) {
    return this.prisma.cashFlow.create({
      data: {
        amount,
        userId,
        type: CashFlowType.INCOME,
        description: 'Cierre de Caja',
      },
    });
  }
}
