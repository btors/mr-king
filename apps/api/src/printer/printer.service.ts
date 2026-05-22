import { Injectable } from '@nestjs/common';
import * as net from 'net';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class PrinterService {
  private kitchenSpoolerQueue: string[] = [];
  private isSpoolerActive: boolean = false;

  constructor(private readonly prisma: PrismaService) {}

  async printOrderTicket(orderId: string): Promise<boolean> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          waiter: { select: { name: true } },
          table: true,
        },
      });

      if (!order) return false;

      // 1. Format the receipt text
      const ticketText = this.formatTicket(order);

      // 2. Write text to a temporary file
      const tempDir = path.join(process.cwd(), 'temp_prints');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, `ticket_${order.id.slice(-6)}.txt`);
      fs.writeFileSync(tempFile, ticketText, 'utf-8');

      // 3. Spool to shared Windows printer
      if (process.platform === 'win32') {
        const printerPath = '\\\\localhost\\Caja_Printer';
        // Native Windows command to print raw file to UNC path
        exec(`copy /B "${tempFile}" "${printerPath}"`, (err) => {
          if (err) console.error(`Error de impresión en Windows: ${err.message}`);
          // Clean up temp file
          try { fs.unlinkSync(tempFile); } catch {}
        });
      } else {
        const http = require('http');
        const payload = ticketText;
        const req = http.request({
          hostname: process.env.PRINTER_HOST || 'host.docker.internal',
          port: 9101,
          path: '/print/',
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(payload, 'utf8')
          }
        }, (res: any) => {
          if (res.statusCode === 200) {
            console.log('Ticket enviado al Relay con éxito.');
            try { fs.unlinkSync(tempFile); } catch {}
          } else {
            fallbackSMB();
          }
        });
        req.on('error', (e: any) => {
          console.log('Relay no disponible, usando fallback...');
          fallbackSMB();
        });
        req.write(payload);
        req.end();

        function fallbackSMB() {
          const printerPath = '//host.docker.internal/Caja_Printer';
          exec(`smbclient "${printerPath}" -N -c "print ${tempFile}"`, (err) => {
            if (err) {
              console.log('--- SIMULANDO TICKETERA ESC/POS (80mm) ---');
              console.log(ticketText);
              console.log('-------------------------------------------');
            }
            try { fs.unlinkSync(tempFile); } catch {}
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error en PrinterService:', error);
      return false;
    }
  }

  private formatTicket(order: any): string {
    const divider = '================================\n';
    const subDivider = '--------------------------------\n';
    
    let ticket = '';
    ticket += '       MR-KING SNACK BAR        \n';
    ticket += '   "EL REY DE LAS MERIENDAS"    \n';
    ticket += divider;
    ticket += `Ticket de Pago #${order.id.slice(-6).toUpperCase()}\n`;
    ticket += `Fecha: ${order.createdAt.toLocaleDateString('es-MX')}   Hora: ${order.createdAt.toLocaleTimeString('es-MX')}\n`;
    ticket += `Tipo: ${order.orderType === 'EAT_IN' ? 'Comer Aquí' : order.orderType === 'TAKE_AWAY' ? 'Llevar' : 'A Domicilio'}\n`;
    
    if (order.table) {
      ticket += `Mesa: ${order.table.number} (${order.table.type})\n`;
    }
    if (order.clientName) {
      ticket += `Cliente: ${order.clientName}\n`;
    }
    if (order.waiter) {
      ticket += `Mesero: ${order.waiter.name}\n`;
    }
    ticket += divider;
    ticket += 'Cant Producto          Subtotal \n';
    ticket += subDivider;

    let subtotalSum = 0;
    for (const item of order.items) {
      const qty = item.quantity.toString().padStart(2, ' ');
      const name = item.product?.name || 'Producto';
      let flavorSuffix = '';
      if (Array.isArray(item.pizzaConfig?.flavors)) {
        const desc = item.pizzaConfig.flavors.map((f: any) => `${f.pieces}${f.name}`).join(' + ');
        const size = item.pizzaConfig.portionSize || '';
        flavorSuffix = ` ${size} (${desc})`;
      } else if (item.pizzaConfig?.variantName) {
        flavorSuffix = ` (${item.pizzaConfig.variantName})`;
      }
      const fullName = `${name}${flavorSuffix}`;
      
      // Pad to 80mm column width (32 characters max for generic receipt printers)
      const maxNameLen = 18;
      const truncatedName = fullName.length > maxNameLen ? fullName.substring(0, maxNameLen - 1) + '.' : fullName;
      const formattedSubtotal = `$${Number(item.price * item.quantity).toFixed(2)}`;
      const spacesNeeded = 32 - (3 + maxNameLen + formattedSubtotal.length);
      const row = `${qty} ${truncatedName.padEnd(maxNameLen, ' ')}${' '.repeat(Math.max(0, spacesNeeded))}${formattedSubtotal}\n`;
      ticket += row;
      subtotalSum += Number(item.price * item.quantity);
    }

    ticket += subDivider;
    ticket += `Subtotal:            $${subtotalSum.toFixed(2).padStart(8, ' ')}\n`;
    ticket += `Descuento:           $${(0).toFixed(2).padStart(8, ' ')}\n`;
    ticket += subDivider;
    ticket += `TOTAL COBRADO:       $${Number(order.total).toFixed(2).padStart(8, ' ')}\n`;
    ticket += divider;
    ticket += '  ¡Gracias por tu preferencia!  \n';
    ticket += '\n\n\n\n\n\x1b\x69'; // Cut paper ESC/POS command code at the end
    
    return ticket;
  }

  async printShiftTicket(shiftId: string): Promise<boolean> {
    try {
      const shift = await this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          openedBy: { select: { name: true } },
          closedBy: { select: { name: true } },
          cashFlows: true,
        }
      });

      if (!shift) return false;

      // Fetch cashFlows with user relations included for expenses
      const cashFlows = await this.prisma.cashFlow.findMany({
        where: { shiftId: shift.id },
        include: { user: { select: { name: true } } },
      });

      // Sales by payment method
      let cashSales = 0;
      let cardSales = 0;
      let transferSales = 0;
      let additionalInflows = 0;
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

      // Products Sold (Desglose de Inventario)
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
        where: { orderId: { in: paidOrderIds } },
        include: { product: true }
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
            if (Array.isArray(config.flavors)) {
              const sizeLabel = config.portionSize || config.variantName || '';
              const flavorsDesc = config.flavors.map((f: any) => `${f.pieces}${f.name}`).join(' + ');
              displayName = `${item.product.name} ${sizeLabel} (${flavorsDesc})`;
            } else if (config.size || config.variantName) {
              const sizeLabel = config.size || config.variantName;
              displayName += ` (${sizeLabel})`;
            } else if (config.flavor) {
              displayName += ` (${config.flavor})`;
            }
          } catch (e) {}
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

      const enrichedShift = {
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

      // 2. Format the shift ticket
      const ticketText = this.formatShiftTicket(enrichedShift);

      // 3. Write text to a temporary file
      const tempDir = path.join(process.cwd(), 'temp_prints');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, `corte_${shift.id.slice(-6)}.txt`);
      fs.writeFileSync(tempFile, ticketText, 'utf-8');

      // 4. Spool to shared Windows printer
      if (process.platform === 'win32') {
        const printerPath = '\\\\localhost\\Caja_Printer';
        exec(`copy /B "${tempFile}" "${printerPath}"`, (err) => {
          if (err) console.error(`Error de impresión en Windows: ${err.message}`);
          try { fs.unlinkSync(tempFile); } catch {}
        });
      } else {
        const http = require('http');
        const payload = ticketText;
        const req = http.request({
          hostname: process.env.PRINTER_HOST || 'host.docker.internal',
          port: 9101,
          path: '/print/',
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(payload, 'utf8')
          }
        }, (res: any) => {
          if (res.statusCode === 200) {
            console.log('Ticket de Corte enviado al Relay con éxito.');
            try { fs.unlinkSync(tempFile); } catch {}
          } else {
            fallbackSMB();
          }
        });
        req.on('error', (e: any) => {
          console.log('Relay no disponible, usando fallback...');
          fallbackSMB();
        });
        req.write(payload);
        req.end();

        function fallbackSMB() {
          const printerPath = '//host.docker.internal/Caja_Printer';
          exec(`smbclient "${printerPath}" -N -c "print ${tempFile}"`, (err) => {
            if (err) {
              console.log('--- SIMULANDO TICKETERA ESC/POS DE CORTE (80mm) ---');
              console.log(ticketText);
              console.log('---------------------------------------------------');
            }
            try { fs.unlinkSync(tempFile); } catch {}
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error en printShiftTicket:', error);
      return false;
    }
  }

  private formatShiftTicket(shift: any): string {
    const divider = '================================\n';
    const subDivider = '--------------------------------\n';
    
    let ticket = '';
    ticket += '       MR-KING SNACK BAR        \n';
    ticket += '    *** CORTE DE CAJA Z ***     \n';
    ticket += divider;
    ticket += `ID Turno: ${shift.id.slice(-6).toUpperCase()}\n`;
    ticket += `Apertura: ${new Date(shift.openedAt).toLocaleDateString('es-MX')} ${new Date(shift.openedAt).toLocaleTimeString('es-MX')}\n`;
    if (shift.closedAt) {
      ticket += `Cierre:   ${new Date(shift.closedAt).toLocaleDateString('es-MX')} ${new Date(shift.closedAt).toLocaleTimeString('es-MX')}\n`;
    }
    ticket += `Abierto por: ${shift.openedBy?.name || 'Sistema'}\n`;
    if (shift.closedBy) {
      ticket += `Cerrado por: ${shift.closedBy?.name || 'Sistema'}\n`;
    }
    ticket += divider;
    ticket += '       RESUMEN FINANCIERO       \n';
    ticket += subDivider;
    ticket += `Fondo Inicial:      $${Number(shift.openingBalance).toFixed(2).padStart(10, ' ')}\n`;
    ticket += `Saldo Esperado:     $${Number(shift.expectedBalance || 0).toFixed(2).padStart(10, ' ')}\n`;
    ticket += `Saldo Real:         $${Number(shift.actualBalance || 0).toFixed(2).padStart(10, ' ')}\n`;
    
    const diff = shift.difference || 0;
    ticket += `Diferencia:         $${(diff >= 0 ? '+' : '')}${diff.toFixed(2).padStart(10, ' ')}\n`;
    ticket += divider;
    ticket += '        MÉTODOS DE PAGO         \n';
    ticket += subDivider;
    ticket += `Efectivo (Ventas):  $${Number(shift.audit.sales.cash).toFixed(2).padStart(10, ' ')}\n`;
    ticket += `Tarjeta:            $${Number(shift.audit.sales.card).toFixed(2).padStart(10, ' ')}\n`;
    ticket += `Transferencia:      $${Number(shift.audit.sales.transfer).toFixed(2).padStart(10, ' ')}\n`;
    ticket += `Entradas Extra:     $${Number(shift.audit.additionalInflows).toFixed(2).padStart(10, ' ')}\n`;
    ticket += subDivider;
    ticket += `TOTAL RECAUDADO:    $${Number(shift.audit.sales.total).toFixed(2).padStart(10, ' ')}\n`;
    ticket += divider;
    
    if (shift.audit.expenses && shift.audit.expenses.length > 0) {
      ticket += '            EGRESOS             \n';
      ticket += subDivider;
      for (const exp of shift.audit.expenses) {
        const desc = exp.description.length > 15 ? exp.description.substring(0, 14) + '.' : exp.description;
        const amt = `$${exp.amount.toFixed(2)}`;
        const spaces = 32 - (desc.length + amt.length);
        ticket += `${desc}${' '.repeat(Math.max(0, spaces))}${amt}\n`;
      }
      ticket += divider;
    }

    if (shift.audit.productsSold && shift.audit.productsSold.length > 0) {
      ticket += '       PRODUCTOS VENDIDOS       \n';
      ticket += subDivider;
      for (const prod of shift.audit.productsSold) {
        const qty = `${prod.quantity}x`;
        const name = prod.name.length > 18 ? prod.name.substring(0, 17) + '.' : prod.name;
        const total = `$${prod.total.toFixed(2)}`;
        const spaces = 32 - (qty.length + 1 + name.length + total.length);
        ticket += `${qty} ${name}${' '.repeat(Math.max(0, spaces))}${total}\n`;
      }
      ticket += divider;
    }

    ticket += '\n\n\n\n\n\x1b\x69'; // Cut paper ESC/POS command code at the end
    
    return ticket;
  }

  async printKitchenTicket(order: any): Promise<boolean> {
    try {
      // 1. Formatear la comanda exclusivamente para Cocina
      const ticketText = this.formatKitchenTicket(order);
      
      // Si no hay productos para cocina, omitir el envío
      if (!ticketText) return true;
      
      // 2. Encolar el ticket en el Spooler de Memoria
      this.kitchenSpoolerQueue.push(ticketText);
      console.log(`[SPOOLER] Ticket #${order.id.slice(-6)} encolado. Tickets en cola: ${this.kitchenSpoolerQueue.length}`);
      
      // 3. Despertar al Spooler si estaba dormido
      this.processKitchenSpooler();
      
      return true;
    } catch (e) {
      console.error('Error fatal en printKitchenTicket:', e);
      return false;
    }
  }

  private async processKitchenSpooler() {
    if (this.isSpoolerActive || this.kitchenSpoolerQueue.length === 0) return;
    this.isSpoolerActive = true;

    while (this.kitchenSpoolerQueue.length > 0) {
      const ticketText = this.kitchenSpoolerQueue[0];
      
      try {
        await this.sendToKitchenPrinterRaw(ticketText);
        // Si fue exitoso, lo sacamos de la cola
        this.kitchenSpoolerQueue.shift();
        console.log(`[SPOOLER] Impresión exitosa. Tickets restantes: ${this.kitchenSpoolerQueue.length}`);
        // Pequeña pausa de 1 segundo entre tickets para no saturar el buffer de la impresora
        await new Promise(res => setTimeout(res, 1000));
      } catch (err: any) {
        console.warn(`[SPOOLER] Impresora de cocina ocupada o desconectada. Reintentando en 5 segundos... (${err.message})`);
        await new Promise(res => setTimeout(res, 5000));
      }
    }

    this.isSpoolerActive = false;
  }

  private sendToKitchenPrinterRaw(ticketText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const KITCHEN_IP = process.env.KITCHEN_PRINTER_IP || '192.168.0.201';
      const KITCHEN_PORT = 9100;
      
      const client = new net.Socket();
      client.setTimeout(4000); // 4 segundos máximo para conectar/enviar

      client.connect(KITCHEN_PORT, KITCHEN_IP, () => {
        client.write(ticketText, 'latin1', () => {
          client.destroy();
          resolve();
        });
      });
      
      client.on('timeout', () => {
        client.destroy();
        reject(new Error('Timeout: La impresora tardó mucho en responder'));
      });

      client.on('error', (err) => {
        client.destroy();
        reject(err);
      });
    });
  }

  private formatKitchenTicket(order: any): string {
    // Filtrar solo productos que requieran preparación en 'KITCHEN'
    const kitchenItems = order.items.filter(
      (item: any) => item.product?.category?.preparationPlace === 'KITCHEN'
    );

    if (kitchenItems.length === 0) {
      return ''; // Retornar cadena vacía si no hay ítems de cocina
    }

    const divider = '--------------------------------\n';
    const boldOn = '\x1b\x45\x01';
    const boldOff = '\x1b\x45\x00';
    const bigFont = '\x1b\x21\x30'; // Doble ancho y doble alto
    const normalFont = '\x1b\x21\x00';
    const center = '\x1b\x61\x01';
    const leftAlign = '\x1b\x61\x00';
    
    let ticket = '\x1b\x40'; // Iniciar impresora (ESC @)
    
    ticket += center;
    ticket += `${boldOn}*** NUEVA COMANDA ***${boldOff}\n`;
    ticket += `Folio: #${order.id.slice(-6).toUpperCase()}\n`;
    ticket += `Hora: ${new Date(order.createdAt).toLocaleTimeString('es-MX')}\n`;
    
    ticket += leftAlign;
    ticket += divider;
    ticket += bigFont + boldOn;
    
    if (order.table) {
      ticket += `MESA: ${order.table.number}\n`;
    } else if (order.clientName) {
      const trimmedName = order.clientName.length > 16 ? order.clientName.substring(0, 15) + '.' : order.clientName;
      ticket += `${trimmedName.toUpperCase()}\n`;
    } else {
      ticket += 'MOSTRADOR\n';
    }
    
    ticket += normalFont + boldOff;
    ticket += `Tipo: ${order.orderType === 'EAT_IN' ? 'COMER AQUI' : 'LLEVAR/DOMICILIO'}\n`;
    ticket += divider;

    // Desglosar ítems uno a uno para visibilidad masiva
    for (const item of kitchenItems) {
      const qty = `${item.quantity}x`;
      const name = item.product?.name || 'Producto';
      
      let description = '';
      
      // Desglose inteligente de variantes, sabores y pizzaConfig
      if (item.pizzaConfig) {
        try {
          const config = typeof item.pizzaConfig === 'string' 
            ? JSON.parse(item.pizzaConfig) 
            : item.pizzaConfig;
            
          // 1. Tamaño prioritario para la cocina (Ej: Grande, Familiar)
          const sizeLabel = config.size || config.variantName;
          if (sizeLabel) {
            description += `  ${boldOn}TAMANO: ${sizeLabel.toUpperCase()}${boldOff}\n`;
          }

          // 2. Desglose de Mitad y Mitad
          if (config.isHalfAndHalf) {
            const halfAName = config.halfA?.product?.name || config.halfAName || 'Mitad A';
            const halfBName = config.halfB?.product?.name || config.halfBName || 'Mitad B';
            description += `  > 1/2 ${halfAName.toUpperCase()}\n  > 1/2 ${halfBName.toUpperCase()}\n`;
          }
          
          // 3. Desglose de Sabores (Alitas/Boneless)
          if (Array.isArray(config.flavors)) {
            const fDesc = config.flavors.map((f: any) => `${f.pieces}${f.name}`).join(' + ');
            description += `  SABORES: ${fDesc.toUpperCase()}\n`;
          } 
          
          // 4. Sabor individual (Micheladas)
          if (config.flavor) {
            description += `  SABOR: ${config.flavor.toUpperCase()}\n`;
          }

          // 5. Salsas (Alitas)
          if (Array.isArray(config.sauces) && config.sauces.length > 0) {
            description += `  SALSAS: ${config.sauces.join(', ').toUpperCase()}\n`;
          }

          // 6. Estado de Combo
          if (config.isCombo) {
            description += `  ${boldOn}*** CON PAPAS ***${boldOff}\n`;
          }

          // 7. Variantes / Extras (Ej: Orilla Rellena de Queso)
          if (Array.isArray(config.variants) && config.variants.length > 0) {
            description += `  ${boldOn}EXTRAS: ${config.variants.join(', ').toUpperCase()}${boldOff}\n`;
          }
        } catch (err) {}
      }

      ticket += `${boldOn}${qty} ${name.toUpperCase()}${boldOff}\n`;
      if (description) ticket += description;
      
      if (item.notes && item.notes.trim() !== '') {
        ticket += `${boldOn}* NOTA: ${item.notes.toUpperCase()}${boldOff}\n`;
      }
      
      ticket += divider;
    }

    ticket += '\n\n\n\n\x1b\x69'; // Feed y Corte de papel
    
    return ticket;
  }
}
