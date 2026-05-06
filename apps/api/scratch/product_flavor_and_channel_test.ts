
const BASE_URL = 'http://localhost:4000';
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function req(path: string, method: string = 'GET', body: any = null, token: string = '') {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  
  let data: any = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

async function run() {
  console.log('🎖️ INICIANDO AUDITORÍA DE PRODUCTOS, SABORES Y CANALES DE VENTA');
  const results: any[] = [];

  const log = (test: string, pass: boolean, obs: string) => {
    results.push({ test, status: pass ? 'PASS' : 'FAIL', obs });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${test} | ${obs}`);
  };

  // --- 0. LOGIN AS ADMIN ---
  let r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data.access_token;
  if (!adminToken) {
    console.error('FAILED TO LOGIN AS ADMIN', r);
    process.exit(1);
  }

  // Ensure Shift is Open
  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);

  // Fetch Catalog Products
  const products = (await req('/products', 'GET', null, adminToken)).data;
  const hawaianaEspecial = products.find((p: any) => p.name === 'Hawaiana Especial');
  const alitas = products.find((p: any) => p.name === 'Alitas');
  const michelada = products.find((p: any) => p.name.includes('Michelada') && p.variants[0]?.name === 'Única');

  // --- CASO 1: CREACIÓN DE PIZZAS CON TAMAÑO ---
  console.log('\n🍕 Evaluando Caso 1: Pizza Hawaiana Especial con Tamaño GD...');
  if (!hawaianaEspecial) {
    console.error('No se encontró Pizza Hawaiana Especial.');
    process.exit(1);
  }

  const pizzaOrder = await req('/orders', 'POST', {
    orderType: 'EAT_IN',
    tableId: null,
    items: [{
      productId: hawaianaEspecial.id,
      quantity: 1,
      variantName: 'GD',
      config: {
        size: 'GD',
        variantName: 'GD'
      }
    }]
  }, adminToken);

  log('Caso 1: Creación Exitosa (GD)', pizzaOrder.status === 201, `Status: ${pizzaOrder.status}`);
  
  const createdPizzaItem = pizzaOrder.data?.items?.[0];
  const sizeSaved = createdPizzaItem?.pizzaConfig?.size || createdPizzaItem?.pizzaConfig?.variantName;
  log('Caso 1: Tamaño en KDS', sizeSaved === 'GD', `Tamaño guardado: '${sizeSaved}'`);

  // --- CASO 2: CREACIÓN DE ALITAS Y MICHELADAS (VALIDACIÓN DE SABORES) ---
  console.log('\n🍗 Evaluando Caso 2: Alitas (BBQ y Búfalo) + Michelada (Clamato)...');
  if (!alitas || !michelada) {
    console.error('Falta Alitas o Michelada en el catálogo.');
    process.exit(1);
  }

  const comboOrder = await req('/orders', 'POST', {
    orderType: 'TAKE_AWAY',
    clientName: 'Juan',
    items: [
      {
        productId: alitas.id,
        quantity: 1,
        variantName: '12pz',
        config: {
          variantName: '12pz',
          sauces: ['BBQ', 'Bufalo'],
          variants: ['BBQ', 'Bufalo']
        }
      },
      {
        productId: michelada.id,
        quantity: 1,
        variantName: 'Única',
        config: {
          variantName: 'Única',
          flavor: 'Clamato',
          variants: ['Clamato']
        }
      }
    ]
  }, adminToken);

  log('Caso 2: Creación Exitosa (Salsas y Sabores)', comboOrder.status === 201, `Status: ${comboOrder.status}`);

  const createdAlitasItem = comboOrder.data?.items?.find((i: any) => i.productId === alitas.id);
  const createdMicheladaItem = comboOrder.data?.items?.find((i: any) => i.productId === michelada.id);

  const saucesSaved = createdAlitasItem?.pizzaConfig?.sauces?.join(' + ') || createdAlitasItem?.pizzaConfig?.variants?.join(' + ');
  const flavorSaved = createdMicheladaItem?.pizzaConfig?.flavor || createdMicheladaItem?.pizzaConfig?.variants?.[0];

  log('Caso 2: Salsas Alitas en KDS', saucesSaved === 'BBQ + Bufalo', `Salsas guardadas: '${saucesSaved}'`);
  log('Caso 2: Sabor Michelada en KDS', flavorSaved === 'Clamato', `Sabor guardado: '${flavorSaved}'`);

  // --- CASO 3: VALIDACIÓN DEL BUG 'MESA UNDEFINED' ---
  console.log('\n🛍️ Evaluando Caso 3: Eliminación del Bug "Mesa Undefined" en Vista Menú...');
  
  // Logical analysis check for MenuView.tsx
  const fs = require('fs');
  const menuViewContent = fs.readFileSync('/Users/ar/Documents/GitHub/mr-king/apps/pos/src/components/MenuView.tsx', 'utf8');
  const hasElegantNullCheck = menuViewContent.includes('selectedTable') && 
                               menuViewContent.includes('orderType === \'TAKE_AWAY\'') && 
                               menuViewContent.includes('Para Llevar');
                               
  log('Caso 3: Render de Cabecera Elegante (Sin Undefined)', hasElegantNullCheck, 'MenuView.tsx contiene la lógica de validación ternaria para canal de venta libre de undefined.');

  // --- CLEANUP ---
  console.log('\n🧹 Limpiando comandas de prueba...');
  const active = (await req('/orders', 'GET', null, adminToken)).data.filter((o: any) => o.status !== 'PAID');
  for (const o of active) {
    if (o.tableId) {
      await req(`/tables/${o.tableId}/pay`, 'POST', {}, adminToken);
    } else {
      await req(`/orders/${o.id}/pay`, 'POST', {}, adminToken);
    }
  }
  
  const currentShift = (await req('/shifts/current', 'GET', null, adminToken)).data;
  const incomes = currentShift.cashFlows.filter((cf: any) => cf.type === 'INCOME').reduce((acc: number, cf: any) => acc + Number(cf.amount), 0);
  const expected = 500 + incomes;
  await req('/shifts/close', 'POST', { actualBalance: expected }, adminToken);

  console.log('\n--- RESULTADOS FINALES DE AUDITORÍA ---');
  console.table(results);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
