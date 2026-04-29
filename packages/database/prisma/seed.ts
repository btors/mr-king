import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  // 1. CLEANUP
  await prisma.orderItem.deleteMany();
  await prisma.cashFlow.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1.5 USERS
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', admin.username);

  const waiter = await prisma.user.create({
    data: {
      username: 'waiter',
      password: hashedPassword,
      name: 'Waiter User',
      role: 'WAITER',
    },
  });
  console.log('Waiter user created:', waiter.username);

  // 2. CATEGORIES
  const categoriesData = ['PIZZAS', 'HAMBURGUESAS', 'HOT DOGS', 'ALITAS', 'SNACKS', 'BEBIDAS', 'POSTRES', 'EXTRAS'];
  const categories = await Promise.all(
    categoriesData.map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // 3. PIZZAS (10 Specialties)
  // Ensure requiresSizes: true
  const pizzaSpecialties = [
    { name: 'Hawaiana Especial', price: 160, description: 'Jamón, piña, tocino, jalapeño, salsa tomate, mozzarella' },
    { name: 'Hawaiana', price: 160, description: 'Jamón, piña, salsa tomate, mozzarella' },
    { name: 'Pepperoni', price: 160, description: 'Pepperoni, salsa tomate, mozzarella' },
    { name: 'Pastor', price: 160, description: 'Carne al pastor, cebolla, piña, jalapeño, salsa tomate, mozzarella' },
    { name: 'Choriqueso', price: 160, description: 'Chorizo, jalapeño, salsa tomate, mozzarella' },
    { name: 'Mexicana', price: 190, description: 'Chorizo, jalapeño, cebolla, pimientos, champiñones, salsa tomate, mozzarella' },
    { name: 'Endiablada', price: 160, description: 'Jamón, tocino, champiñones, chile ajo, salsa tomate, mozzarella' },
    { name: 'Azteca', price: 190, description: 'Chorizo, frijoles, champiñones, jalapeño, cebolla, aguacate, salsa tomate, mozzarella' },
    { name: 'Especial', price: 190, description: 'Chorizo, cebolla, aguacate, pepperoni, pimientos, champiñones, salsa tomate, mozzarella' },
    { name: 'La Mr King', price: 190, description: 'Arrachera, doble queso, piña, aguacate, jalapeño, salsa tomate, mozzarella' },
  ];

  for (const pizza of pizzaSpecialties) {
    await prisma.product.create({
      data: {
        name: pizza.name,
        price: pizza.price,
        description: pizza.description,
        categoryId: catMap['PIZZAS'],
        requiresSizes: true,
      },
    });
  }

  // 4. HAMBURGUESAS (Base price = Sola)
  const burgers = [
    { name: 'Sencilla', price: 60, description: 'Carne res, queso amarillo, lechuga, chiles, tomate, cebolla, catsup, mostaza' },
    { name: 'Hawaiana', price: 75, description: 'Carne res, lechuga, piña, queso amarillo, mozzarella, jamón, tocino, chiles, tomate...' },
    { name: 'Especial', price: 90, description: 'Carne res, queso amarillo, tocino, jamón, mozzarella, salchicha, lechuga...' },
    { name: 'Doble Carne', price: 90, description: 'Doble carne res, tocino, jamón, mozzarella, lechuga...' },
    { name: 'Pollo', price: 60, description: 'Carne pollo, queso amarillo, lechuga, chiles, tomate...' },
    { name: 'Sirloin', price: 120, description: 'Carne sirloin, queso amarillo, lechuga, chiles, tomate...' },
  ];

  for (const b of burgers) {
    await prisma.product.create({
      data: {
        name: b.name,
        price: b.price,
        description: b.description,
        categoryId: catMap['HAMBURGUESAS'],
      },
    });
  }

  // 5. HOT DOGS (Base price = Sencillo)
  await prisma.product.createMany({
    data: [
      { name: 'Sencillo', price: 30, categoryId: catMap['HOT DOGS'] },
      { name: 'Hawaiano', price: 45, categoryId: catMap['HOT DOGS'] },
    ],
  });

  // 6. ALITAS
  // CRÍTICO: 6 piezas = maxSauces: 1; > 6 piezas = maxSauces: 2, allowMultipleSauces: true
  const wings = [
    { name: 'Alitas 6 pz', price: 85, maxSauces: 1, allowMultipleSauces: false },
    { name: 'Alitas 12 pz', price: 160, maxSauces: 2, allowMultipleSauces: true },
    { name: 'Alitas 18 pz', price: 230, maxSauces: 2, allowMultipleSauces: true },
    { name: 'Alitas 24 pz', price: 290, maxSauces: 2, allowMultipleSauces: true },
    { name: 'Alitas 36 pz', price: 380, maxSauces: 2, allowMultipleSauces: true },
  ];

  for (const w of wings) {
    await prisma.product.create({
      data: {
        name: w.name,
        price: w.price,
        categoryId: catMap['ALITAS'],
        maxSauces: w.maxSauces,
        allowMultipleSauces: w.allowMultipleSauces,
      },
    });
  }

  // 7. SNACKS
  await prisma.product.createMany({
    data: [
      { name: 'Salchipapas', price: 75, categoryId: catMap['SNACKS'] },
      { name: 'Papas a la francesa', price: 55, categoryId: catMap['SNACKS'] },
      { name: 'Dedos de Queso (5 pz)', price: 85, categoryId: catMap['SNACKS'] },
      { name: 'Salchipulpos', price: 85, categoryId: catMap['SNACKS'] },
      { name: 'Papas Locas', price: 80, categoryId: catMap['SNACKS'] },
    ],
  });

  // 8. BEBIDAS
  await prisma.product.createMany({
    data: [
      { name: 'Coca Cola 2.75lts', price: 60, categoryId: catMap['BEBIDAS'] },
      { name: 'Refresco Grande Sabores', price: 55, categoryId: catMap['BEBIDAS'] },
      { name: 'Refresco 600ml', price: 30, categoryId: catMap['BEBIDAS'] },
      { name: 'Michelada GD', price: 80, categoryId: catMap['BEBIDAS'] },
      { name: 'Michelada CH', price: 50, categoryId: catMap['BEBIDAS'] },
      { name: 'Cerveza Lata (Pacífico/Modelo/Ultra)', price: 35, categoryId: catMap['BEBIDAS'] },
      { name: 'Cerveza Lata (Corona/Victoria/XX/Indio)', price: 30, categoryId: catMap['BEBIDAS'] },
    ],
  });

  // 9. POSTRES & EXTRAS
  await prisma.product.createMany({
    data: [
      { name: 'Pastel de Chocolate', price: 35, categoryId: catMap['POSTRES'] },
      { name: 'Cheesecake de Frambuesa', price: 35, categoryId: catMap['POSTRES'] },
      { name: 'Chocoflan', price: 35, categoryId: catMap['POSTRES'] },
      { name: 'Aderezo', price: 10, categoryId: catMap['EXTRAS'] },
      { name: 'Salsa', price: 10, categoryId: catMap['EXTRAS'] },
    ],
  });

  // 10. TABLES
  await prisma.table.deleteMany();
  await prisma.table.createMany({
    data: [
      { number: 1, status: 'AVAILABLE' },
      { number: 2, status: 'AVAILABLE' },
      { number: 3, status: 'AVAILABLE' },
      { number: 4, status: 'AVAILABLE' },
      { number: 5, status: 'AVAILABLE' },
      { number: 6, status: 'AVAILABLE' },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
