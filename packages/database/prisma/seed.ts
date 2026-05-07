import 'dotenv/config';
import { PrismaClient, PreparationPlace, TableType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('🛡️ Base de datos ya inicializada con información. Omitiendo semilla de forma segura.');
    return;
  }

  console.log('Initiating database cleanup...');
  // Cascaded Delete
  await prisma.cashFlow.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.table.deleteMany({});
  console.log('Database cleanup completed.');

  console.log('Seeding Master Admin...');
  const hashedPin = await bcrypt.hash('1234', 10);
  await prisma.user.create({
    data: {
      name: 'ADMINISTRADOR',
      username: '1234',
      password: hashedPin,
      role: 'ADMIN',
    },
  });
  console.log('Master Admin seeded.');

  console.log('Seeding categories...');
  const categoryConfigs = [
    { name: 'Pizzas', preparationPlace: PreparationPlace.KITCHEN },
    { name: 'Hamburguesas', preparationPlace: PreparationPlace.KITCHEN },
    { name: 'Hot Dogs', preparationPlace: PreparationPlace.KITCHEN },
    { name: 'Alitas', preparationPlace: PreparationPlace.KITCHEN },
    { name: 'Boneless', preparationPlace: PreparationPlace.KITCHEN },
    { name: 'Bebidas', preparationPlace: PreparationPlace.WAITER_BAR },
    { name: 'Extras', preparationPlace: PreparationPlace.WAITER_BAR },
    { name: 'Postres', preparationPlace: PreparationPlace.WAITER_BAR },
    { name: 'Sabritas', preparationPlace: PreparationPlace.WAITER_BAR },
    { name: 'Snacks', preparationPlace: PreparationPlace.KITCHEN },
  ];

  const categories: Record<string, any> = {};
  for (const config of categoryConfigs) {
    categories[config.name] = await prisma.category.create({
      data: config,
    });
  }
  console.log('Categories seeded.');

  console.log('Seeding tables and stools...');
  // 30 Tables numbered 1-30
  for (let i = 1; i <= 30; i++) {
    await prisma.table.create({
      data: {
        number: i,
        capacity: 4,
        type: TableType.TABLE,
      },
    });
  }
  // 5 Stools numbered 1-5 (Bancos 1 al 5)
  for (let i = 1; i <= 5; i++) {
    await prisma.table.create({
      data: {
        number: i,
        capacity: 1,
        type: TableType.STOOL,
      },
    });
  }
  console.log('Tables and stools seeded.');

  console.log('Seeding products...');
  const products = [
    // PIZZAS
    {
      name: 'Hawaiana Especial',
      categoryId: categories['Pizzas'].id,
      description: 'Jamón, piña, tocino y jalapeño, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Hawaiana',
      categoryId: categories['Pizzas'].id,
      description: 'Jamón, piña, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Pepperoni',
      categoryId: categories['Pizzas'].id,
      description: 'Pepperoni, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Pastor',
      categoryId: categories['Pizzas'].id,
      description: 'Carne al pastor, cebolla, piña, jalapeño, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: '3 Quesos',
      categoryId: categories['Pizzas'].id,
      description: 'Queso amarillo, mozzarella philadelphia, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Hawaiana con Pollo',
      categoryId: categories['Pizzas'].id,
      description: 'Jamón, pollo, piña, salsa de tomate, queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Endiablada',
      categoryId: categories['Pizzas'].id,
      description: 'Jamón, tocino, champiñones, chileajo, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Chicharron',
      categoryId: categories['Pizzas'].id,
      description: 'Chicharrón, cebolla morada, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 160}, {name: 'GD', price: 180}, {name: 'FM', price: 230}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'La Mr King',
      categoryId: categories['Pizzas'].id,
      description: 'Arrachera, doble queso, piña, aguacate, jalapeño, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 190}, {name: 'GD', price: 210}, {name: 'FM', price: 260}],
      canBeHalfAndHalf: true,
      flavors: [],
    },
    {
      name: 'Carnes Frias',
      categoryId: categories['Pizzas'].id,
      description: 'Chorizo, pepperoni, tocino, jamón, salsa de tomate y queso mozzarella',
      variants: [{name: 'MD', price: 190}, {name: 'GD', price: 210}, {name: 'FM', price: 260}],
      canBeHalfAndHalf: true,
      flavors: [],
    },

    // HAMBURGUESAS
    {
      name: 'Hamburguesa Sencilla',
      categoryId: categories['Hamburguesas'].id,
      description: 'Carne de res, queso amarillo, lechuga, chiles, tomate, cebolla, cátsup y mostaza',
      variants: [{name: 'Sola', price: 60}, {name: 'Con Papas', price: 80}],
      flavors: [],
    },
    {
      name: 'Hamburguesa Hawaiana',
      categoryId: categories['Hamburguesas'].id,
      description: 'Carne de res, lechuga, piña, queso amarillo, queso mozzarella, jamón, tocino, chiles, cebolla, tomate, cátsup y mostaza',
      variants: [{name: 'Sola', price: 75}, {name: 'Con Papas', price: 95}],
      flavors: [],
    },
    {
      name: 'Hamburguesa Especial',
      categoryId: categories['Hamburguesas'].id,
      description: 'Carne de res, queso amarillo, tocino, jamón, queso mozzarella, salchicha, lechuga, tomate, cebolla, chiles, cátsup y mostaza',
      variants: [{name: 'Sola', price: 90}, {name: 'Con Papas', price: 110}],
      flavors: [],
    },
    {
      name: 'Hamburguesa Doble Carne',
      categoryId: categories['Hamburguesas'].id,
      description: 'Carne de res, queso amarillo, tocino, jamón, queso mozzarella, lechuga, tomate, cebolla, chiles, catsup y mostaza',
      variants: [{name: 'Sola', price: 90}, {name: 'Con Papas', price: 110}],
      flavors: [],
    },
    {
      name: 'Hamburguesa Pollo',
      categoryId: categories['Hamburguesas'].id,
      description: 'Carne de pollo, queso amarillo, tocino, jamón, queso mozzarella, lechuga, tomate, cebolla, chiles, cátsup y mostaza',
      variants: [{name: 'Sola', price: 60}, {name: 'Con Papas', price: 80}],
      flavors: [],
    },
    {
      name: 'Hamburguesa Sirloin',
      categoryId: categories['Hamburguesas'].id,
      description: 'Carne de sirlon, queso amarillo, lechuga, chiles, tomate, cebolla, catsup y mostaza',
      variants: [{name: 'Sola', price: 120}, {name: 'Con Papas', price: 140}],
      flavors: [],
    },

    // HOT DOGS
    {
      name: 'Hot Dog Sencillo',
      categoryId: categories['Hot Dogs'].id,
      description: 'Salchicha, tomate, cebolla, chiles, cátsup y mostaza',
      variants: [{name: 'Sola', price: 30}, {name: 'Con Papas', price: 45}],
      flavors: [],
    },
    {
      name: 'Hot Dog Hawaiano',
      categoryId: categories['Hot Dogs'].id,
      description: 'Salchicha, tocino, jamón, piña, queso amarillo, tomate, cebolla, chiles, catsup y mostaza',
      variants: [{name: 'Sola', price: 45}, {name: 'Con Papas', price: 60}],
      flavors: [],
    },
    {
      name: 'Pizza Dog',
      categoryId: categories['Hot Dogs'].id,
      description: 'Salchicha, pepperoni, mayonesa, queso mozzarella',
      variants: [{name: 'Sola', price: 35}, {name: 'Con Papas', price: 50}],
      flavors: [],
    },

    // ALITAS Y BONELESS
    {
      name: 'Alitas',
      categoryId: categories['Alitas'].id,
      variants: [
        { name: '6pz', price: 85, maxFlavors: 2 },
        { name: '12pz', price: 160, maxFlavors: 4 },
        { name: '18pz', price: 230, maxFlavors: 6 },
        { name: '24pz', price: 290, maxFlavors: 6 },
        { name: '36pz', price: 380, maxFlavors: 6 }
      ],
      flavors: ['BBQ', 'Mango Habanero', 'Bufalo', 'Red Hot', 'Naturales', 'Mango Chiltepin'],
      maxFlavors: 2,
    },
    {
      name: 'Boneless',
      categoryId: categories['Boneless'].id,
      variants: [
        { name: '6pz', price: 60, maxFlavors: 2 },
        { name: '12pz', price: 120, maxFlavors: 4 },
        { name: '18pz', price: 160, maxFlavors: 6 }
      ],
      flavors: ['BBQ', 'Mango Habanero', 'Bufalo', 'Red Hot', 'Naturales', 'Mango Chiltepin'],
      maxFlavors: 2,
    },

    // SNACKS
    { name: 'Papas Gajo', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 80}] },
    { name: 'Aros de Cebolla', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 80}] },
    { name: 'Salchipapas', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 75}] },
    { name: 'Papas a la Francesa', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 55}] },
    { name: 'Dedos de Queso (5 PZ)', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 85}] },
    { name: 'Salchipulpos', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 85}] },
    { name: 'Papas Locas', categoryId: categories['Snacks'].id, variants: [{name: 'Única', price: 80}] },

    // EXTRAS
    { name: 'Aderezo', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 10}] },
    { name: 'Zanahoria', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 10}] },
    { name: 'Salsa', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 10}] },
    { name: 'Orilla de Queso MD', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 45}] },
    { name: 'Orilla de Queso GD', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 65}] },
    { name: 'Orilla de Queso FAM', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 85}] },
    { name: 'Pizza Mitad y Mitad (Costo Extra)', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 15}] },
    { name: 'Ingrediente Extra PZ', categoryId: categories['Extras'].id, variants: [{name: 'Única', price: 15}] },

    // SABRITAS
    { name: 'Pake-Taxo Mezcladito', categoryId: categories['Sabritas'].id, variants: [{name: 'Única', price: 26}] },
    { name: 'Sabritas Originales', categoryId: categories['Sabritas'].id, variants: [{name: 'Única', price: 25}] },
    { name: 'Doritos Nacho', categoryId: categories['Sabritas'].id, variants: [{name: 'Única', price: 24}] },

    // POSTRES
    { name: 'Matilda', categoryId: categories['Postres'].id, variants: [{name: 'Única', price: 40}] },
    { name: 'Cheesecake', categoryId: categories['Postres'].id, variants: [{name: 'Única', price: 40}] },
    { name: 'Frambuesa', categoryId: categories['Postres'].id, variants: [{name: 'Única', price: 40}] },
    { name: 'Chispas', categoryId: categories['Postres'].id, variants: [{name: 'Única', price: 40}] },

    // BEBIDAS
    { name: 'Coca Cola 2.5 R', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 60}] },
    { name: 'Sprite 2.5 R', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 55}] },
    { name: 'Fanta Naranja 2.5', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 55}] },
    { name: 'Sidral Mundet 2.5', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 55}] },
    { name: 'Fresca 2.5', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 55}] },
    { name: 'Agua Mineral 600', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Coca Cola 600', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Sprite 600', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Fanta Naranja 600', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Sidral Mundet 600', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Fresca 600', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Jugo del Valle Vidrio', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { 
      name: 'Michelada Grande', 
      categoryId: categories['Bebidas'].id, 
      variants: [
        {name: 'Clasica', price: 80},
        {name: 'Maracuya', price: 80},
        {name: 'Mango', price: 80},
        {name: 'Fresa', price: 80},
        {name: 'Clamato', price: 80},
        {name: 'Tamarindo', price: 75},
        {name: 'Azulito', price: 75}
      ], 
      flavors: ['Clasica', 'Maracuya', 'Mango', 'Fresa', 'Tamarindo', 'Azulito', 'Clamato'], 
      maxFlavors: 1 
    },
    { 
      name: 'Michelada Chica', 
      categoryId: categories['Bebidas'].id, 
      variants: [
        {name: 'Clasica', price: 50},
        {name: 'Maracuya', price: 50},
        {name: 'Mango', price: 50},
        {name: 'Fresa', price: 50},
        {name: 'Clamato', price: 50},
        {name: 'Tamarindo', price: 50},
        {name: 'Azulito', price: 50}
      ], 
      flavors: ['Clasica', 'Maracuya', 'Mango', 'Fresa', 'Tamarindo', 'Azulito', 'Clamato'], 
      maxFlavors: 1 
    },
    { name: 'Pacifico Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] },
    { name: 'Modelo Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] },
    { name: 'Corona Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] },
    { name: 'Victoria Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] },
    { name: 'Michelub Ultra Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] },
    { name: 'Superior Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'XX Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Indio Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 30}] },
    { name: 'Heineken Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] },
    { name: 'High Life Lata/Media', categoryId: categories['Bebidas'].id, variants: [{name: 'Única', price: 35}] }
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('Products seeded.');
  console.log('Seeding process finished successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
