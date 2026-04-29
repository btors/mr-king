const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  const pizzas = await prisma.product.findMany({ where: { category: { name: 'PIZZAS' } } });
  
  console.log('Users found:', users.length);
  console.log('Pizzas found:', pizzas.length);

  const user = users[0];
  const pizza = pizzas[0];
  
  console.log(JSON.stringify({ 
    waiterId: user?.id, 
    pizzaId: pizza?.id
  }));
}

main().finally(() => prisma.$disconnect());
