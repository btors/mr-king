import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    const users = await prisma.user.findMany();
    console.log('USERS IN DB:', users.map(u => ({ id: u.id, username: u.username, role: u.role })));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(e => console.error(e));
