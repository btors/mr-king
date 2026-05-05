import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
  const pool = new Pool({
    connectionString,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  const snacksCategory = await prisma.category.findFirst({
    where: { name: { contains: 'Snacks', mode: 'insensitive' } }
  });

  if (!snacksCategory) {
    console.error('Category SNACKS not found');
    return;
  }

  // Delete existing Super Nachos King if any to avoid duplicates
  await prisma.product.deleteMany({ where: { name: 'Super Nachos King' } });

  const newProduct = await prisma.product.create({
    data: {
      name: 'Super Nachos King',
      categoryId: snacksCategory.id,
      description: 'Los nachos definitivos con queso, carne y jalapeños.',
      variants: [
        { name: 'Chicos', price: 80 },
        { name: 'Medianos', price: 120 },
        { name: 'Bandeja', price: 200 }
      ]
    }
  });

  console.log('Created Monster Product:', newProduct);
  await prisma.$disconnect();
  await pool.end();
}

main()
  .catch(e => console.error(e));
