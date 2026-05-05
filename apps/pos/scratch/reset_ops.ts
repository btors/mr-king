import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    // 1. Close open shifts
    const updated = await prisma.shift.updateMany({
      where: { status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() }
    });
    console.log(`Closed ${updated.count} open shifts.`);
    
    // 2. Free all tables
    await prisma.table.updateMany({
      data: { status: 'AVAILABLE' }
    });
    console.log('Freed all tables.');

    // 3. Clear Transactions, Orders, CashFlow
    await prisma.cashFlow.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    console.log('Cleared all orders and financial records.');
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(e => console.error(e));
