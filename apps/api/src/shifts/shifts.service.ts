import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterService } from '../printer/printer.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printerService: PrinterService,
  ) {}

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

    return this.enrichShift(shift);
  }

  async closeShift(actualBalance: number, userId: string) {
    const closedShift = await this.prisma.$transaction(async (tx) => {
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
        include: {
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
          cashFlows: true,
        },
      });
    });

    // Disparar asíncronamente la impresión directa física del ticket de corte
    this.printerService.printShiftTicket(closedShift.id).catch((err) => {
      console.error('Error al imprimir el ticket de corte físico:', err);
    });

    return this.enrichShift(closedShift);
  }

  async getClosedShifts() {
    const shifts = await this.prisma.shift.findMany({
      where: { status: 'CLOSED' },
      orderBy: { closedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        cashFlows: true,
      },
    });

    const enriched = [];
    for (const shift of shifts) {
      enriched.push(await this.enrichShift(shift));
    }
    return enriched;
  }

  async getShiftById(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        cashFlows: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Turno no encontrado.');
    }

    return this.enrichShift(shift);
  }

  private async enrichShift(shift: any) {
    if (!shift) return null;

    // Fetch cashFlows with user relations included for expenses
    const cashFlows = await this.prisma.cashFlow.findMany({
      where: { shiftId: shift.id },
      include: { user: { select: { name: true } } },
    });

    // 1. Sales by payment method
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;

    // 2. Additional Inflows (orderId === null, type === INCOME)
    let additionalInflows = 0;

    // 3. Expenses (type === EXPENSE)
    const expenses: any[] = [];

    for (const cf of cashFlows) {
      if (cf.type === 'INCOME') {
        const isTablePayment = cf.description && (cf.description.startsWith('Cobro Cuenta') || cf.description.includes('Cuenta Mesa') || cf.description.includes('Cuenta Banco'));
        if (cf.orderId !== null || isTablePayment) {
          const method = cf.paymentMethod || 'CASH';
          if (method === 'CASH') {
            cashSales += Number(cf.amount);
          } else if (method === 'CARD') {
            cardSales += Number(cf.amount);
          } else if (method === 'TRANSFER') {
            transferSales += Number(cf.amount);
          }
        } else {
          additionalInflows += Number(cf.amount);
        }
      } else if (cf.type === 'EXPENSE') {
        expenses.push({
          id: cf.id,
          description: cf.description,
          amount: Number(cf.amount),
          userName: cf.user?.name || 'Sistema',
        });
      }
    }

    const totalSales = Math.round((cashSales + cardSales + transferSales) * 100) / 100;
    cashSales = Math.round(cashSales * 100) / 100;
    cardSales = Math.round(cardSales * 100) / 100;
    transferSales = Math.round(transferSales * 100) / 100;
    additionalInflows = Math.round(additionalInflows * 100) / 100;

    // 4. Products Sold (Desglose de Inventario)
    // Find all OrderItems linked to orders that are PAID and were updated during this shift's timeframe
    const closedAtLimit = shift.closedAt ? new Date(shift.closedAt) : new Date();
    const paidOrders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        updatedAt: {
          gte: new Date(shift.openedAt),
          lte: closedAtLimit
        }
      },
      select: { id: true }
    });

    const paidOrderIds = paidOrders.map(o => o.id);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        orderId: { in: paidOrderIds }
      },
      include: {
        product: true
      }
    });

    // Group by displayName
    const productGroups = new Map<string, { name: string, quantity: number, total: number }>();
    for (const item of orderItems) {
      let displayName = item.product.name;
      if (item.pizzaConfig) {
        try {
          const config = typeof item.pizzaConfig === 'string' 
            ? JSON.parse(item.pizzaConfig) 
            : item.pizzaConfig as any;
            
          if (config.isHalfAndHalf) {
            const halfAName = config.halfA?.product?.name || 'Mitad A';
            const halfBName = config.halfB?.product?.name || 'Mitad B';
            displayName = `1/2 ${halfAName} / 1/2 ${halfBName}`;
          }
          if (config.size || config.variantName) {
            const sizeLabel = config.size || config.variantName;
            displayName += ` (${sizeLabel})`;
          } else if (config.flavor) {
            displayName += ` (${config.flavor})`;
          }
        } catch (e) {
          // Silenciosamente usar nombre base si el JSON está mal formado
          displayName = item.product.name;
        }
      }

      const current = productGroups.get(displayName) || { name: displayName, quantity: 0, total: 0 };
      current.quantity += item.quantity;
      current.total += Number(item.price) * item.quantity;
      productGroups.set(displayName, current);
    }

    const productsSold = Array.from(productGroups.values())
      .map(p => ({
        name: p.name,
        quantity: p.quantity,
        total: Math.round(p.total * 100) / 100
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const difference = shift.actualBalance !== null && shift.expectedBalance !== null
      ? Math.round((Number(shift.actualBalance) - Number(shift.expectedBalance)) * 100) / 100
      : null;

    return {
      ...shift,
      difference,
      audit: {
        sales: {
          cash: cashSales,
          card: cardSales,
          transfer: transferSales,
          total: totalSales,
        },
        additionalInflows,
        expenses,
        productsSold,
      }
    };
  }
}
