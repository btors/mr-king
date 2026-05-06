
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
  console.log('🎖️ INICIANDO AUDITORÍA DE COLISIÓN DE IDENTIDAD - MR-KING ERP');
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

  // --- 1. VERIFICACIÓN FÍSICA ---
  const dbTables = await prisma.table.findMany({ orderBy: { number: 'asc' } });
  const tablesFromDb = dbTables.filter((t: any) => t.type === 'TABLE');
  const stoolsFromDb = dbTables.filter((t: any) => t.type === 'STOOL');

  log('Población de Mesas (DB)', tablesFromDb.length === 30, `Total: ${tablesFromDb.length}/30`);
  log('Población de Bancos (DB)', stoolsFromDb.length === 5, `Total: ${stoolsFromDb.length}/5`);

  // Verify numbering
  const tablesNumberedOk = tablesFromDb.every((t: any, idx: number) => t.number === idx + 1);
  const stoolsNumberedOk = stoolsFromDb.every((t: any, idx: number) => t.number === idx + 1);
  log('Numeración de Mesas 1-30', tablesNumberedOk, `Mesas numeradas correctamente de 1 a 30.`);
  log('Numeración de Bancos 1-5', stoolsNumberedOk, `Bancos numerados correctamente de 1 a 5.`);

  // --- 2. PRUEBA DE COLISIÓN FANTASMA ---
  console.log('⚡ Iniciando Prueba de Fuego: Colisión de Mesa #1 y Banco #1...');
  
  const mesa1 = tablesFromDb.find((t: any) => t.number === 1);
  const banco1 = stoolsFromDb.find((t: any) => t.number === 1);

  if (!mesa1 || !banco1) {
    console.error('Missing Mesa 1 or Banco 1 in DB setup.');
    process.exit(1);
  }

  // Ensure shift is open
  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);

  const products = (await req('/products', 'GET', null, adminToken)).data;
  const pizza = products.find((p: any) => p.name.includes('Pepperoni') || p.name.includes('Hawaiana'));

  if (!pizza) {
    console.error('No pizza product found in database catalog.');
    process.exit(1);
  }

  // Place order for Mesa 1
  const orderMesa1 = await req('/orders', 'POST', {
    orderType: 'EAT_IN',
    tableId: mesa1.id,
    items: [{ productId: pizza.id, variantName: pizza.variants[0].name, quantity: 1 }]
  }, adminToken);

  // Place order for Banco 1
  const orderBanco1 = await req('/orders', 'POST', {
    orderType: 'EAT_IN',
    tableId: banco1.id,
    items: [{ productId: pizza.id, variantName: pizza.variants[0].name, quantity: 1 }]
  }, adminToken);

  log('Orden Mesa #1 creada', orderMesa1.status === 201, `Status: ${orderMesa1.status}`);
  log('Orden Banco #1 creada', orderBanco1.status === 201, `Status: ${orderBanco1.status}`);
  log('Coexistencia sin colisiones', orderMesa1.status === 201 && orderBanco1.status === 201, 'Ambas órdenes procesadas con éxito por el motor NestJS sin lanzar constraint violations.');

  // --- 3. VISUALIZACIÓN EN KDS ---
  const activeOrders = (await req('/orders', 'GET', null, adminToken)).data.filter((o: any) => o.status === 'PENDING');
  const mesa1OrderKds = activeOrders.find((o: any) => o.tableId === mesa1.id);
  const banco1OrderKds = activeOrders.find((o: any) => o.tableId === banco1.id);

  const mesaLabel = mesa1OrderKds?.table?.type === 'STOOL' ? `Banco ${mesa1OrderKds?.table?.number}` : `Mesa ${mesa1OrderKds?.table?.number}`;
  const stoolLabel = banco1OrderKds?.table?.type === 'STOOL' ? `Banco ${banco1OrderKds?.table?.number}` : `Mesa ${banco1OrderKds?.table?.number}`;

  log('KDS: Título Mesa #1', mesaLabel === 'Mesa 1', `Etiqueta KDS: '${mesaLabel}'`);
  log('KDS: Título Banco #1', stoolLabel === 'Banco 1', `Etiqueta KDS: '${stoolLabel}'`);

  // --- 4. CLEANUP ---
  console.log('🧹 Limpiando comandas de prueba...');
  if (mesa1OrderKds) await req(`/tables/${mesa1.id}/pay`, 'POST', {}, adminToken);
  if (banco1OrderKds) await req(`/tables/${banco1.id}/pay`, 'POST', {}, adminToken);
  
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
