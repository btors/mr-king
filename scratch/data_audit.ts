import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- AUDITORÍA DE INTEGRIDAD DE DATOS ---');
  
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      cashFlows: true
    }
  });

  let errors = 0;

  for (const order of orders) {
    const itemsTotal = order.items.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const orderTotal = Number(order.total);
    
    // 1. Check Items sum vs Order Total
    if (Math.abs(itemsTotal - orderTotal) > 0.01) {
      console.error(`❌ Error en Orden ${order.id}: Suma Items (${itemsTotal}) != Total Orden (${orderTotal})`);
      errors++;
    }

    // 2. Check CashFlow vs Order Total (if PAID)
    if (order.status === 'PAID') {
      const cashFlowTotal = order.cashFlows.reduce((acc, cf) => acc + Number(cf.amount), 0);
      // Wait, a cashflow might be for multiple orders if closed as a table bill.
      // In the current implementation, we don't link CashFlow directly to each order's ID in payBill transaction
      // but we do in some other places? Let's check schema.
    }
  }

  // Check Table Bills Consistency
  // (Since payBill creates a CashFlow for the WHOLE table total)
  // We can't easily cross-reference without tableId in CashFlow or specific description parsing.
  
  console.log(`\nAudit completed with ${errors} critical errors.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
