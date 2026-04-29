import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hotDogsCategory = await prisma.category.findUnique({
    where: { name: 'HOT DOGS' },
    include: { products: true }
  });
  
  if (!hotDogsCategory) {
    console.log('Category HOT DOGS not found');
  } else {
    console.log(`Category: ${hotDogsCategory.name} (isActive: ${hotDogsCategory.isActive})`);
    hotDogsCategory.products.forEach(p => {
      console.log(` - Product: ${p.name} (Price: ${p.price}, isActive: ${p.isActive})`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
