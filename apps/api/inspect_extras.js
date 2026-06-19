const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.findFirst({
    where: { name: { contains: 'EXTRA', mode: 'insensitive' } },
    include: { products: true }
  });
  console.log(JSON.stringify(category, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
