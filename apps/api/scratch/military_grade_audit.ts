
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
  console.log('🎖️ INICIANDO CERTIFICACIÓN DE GRADO MILITAR - MR-KING ERP');
  const results: any[] = [];

  const log = (test: string, pass: boolean, obs: string) => {
    results.push({ test, status: pass ? 'PASS' : 'FAIL', obs });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${test} | ${obs}`);
  };

  // --- 0. LOGIN FIRST ---
  let r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data.access_token;
  if (!adminToken) {
    console.error('FAILED TO LOGIN AS ADMIN', r);
    process.exit(1);
  }

  // --- 1. ESPEJO DE DATOS ---
  const dbCount = await prisma.table.count();
  const apiRes = await req('/tables', 'GET', null, adminToken);
  
  if (!Array.isArray(apiRes.data)) {
    console.error('API /tables did not return an array:', apiRes);
    process.exit(1);
  }

  const apiCount = apiRes.data.length;
  const tables = apiRes.data.filter((t: any) => t.type === 'TABLE').length;
  const stools = apiRes.data.filter((t: any) => t.type === 'STOOL').length;

  log('Consistencia DB vs API', dbCount === apiCount, `DB: ${dbCount}, API: ${apiCount}`);
  log('Población de Entidades', tables === 30 && stools === 5, `Mesas: ${tables}/30, Bancos: ${stools}/5`);
  
  // Create Waiter Carlos
  await req('/users', 'POST', { name: 'Carlos', username: '1001', password: '1001', role: 'WAITER' }, adminToken);
  r = await req('/auth/login', 'POST', { username: '1001', password: '1001' });
  const waiterToken = r.data.access_token;

  // RBAC Bypass Attempt
  r = await req('/shifts/close', 'POST', { actualBalance: 1000 }, waiterToken);
  log('RBAC: Bloqueo Cierre (Mesero)', r.status === 403, `Status: ${r.status}. Acceso denegado correctamente.`);

  r = await req('/cash/expense', 'POST', { amount: 100, description: 'Robo' }, waiterToken);
  log('RBAC: Bloqueo Gastos (Mesero)', r.status === 403, `Status: ${r.status}. Acceso denegado correctamente.`);

  // --- 3. EDGE CASES ---
  
  // Duplicate Table
  r = await req('/tables', 'POST', { number: 1, capacity: 4 }, adminToken);
  log('Edge: Mesa Duplicada', r.status === 400, `Intento crear Mesa 1 de nuevo. Status: ${r.status}`);

  // Delete Table with active order
  const t1 = apiRes.data.find((t: any) => t.number === 1);
  const p1 = (await req('/products')).data[0];
  await req('/orders', 'POST', { tableId: t1.id, items: [{ productId: p1.id, variantName: p1.variants[0].name, quantity: 1 }] }, waiterToken);
  
  r = await req(`/tables/${t1.id}`, 'DELETE', null, adminToken);
  log('Edge: Borrar Mesa con Deuda', r.status === 400, `Status: ${r.status}. Bloqueo de eliminación activo.`);

  // --- 4. STRESS MATRIX (200 Pedidos) ---
  console.log('⚡ Iniciando Stress Matrix: 200 pedidos concurrentes...');
  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);
  
  const startTime = Date.now();
  const orderPromises = Array.from({ length: 200 }, (_, i) => {
    const types = ['EAT_IN', 'TAKE_AWAY', 'DELIVERY'];
    const type = types[i % 3];
    return req('/orders', 'POST', {
      orderType: type,
      tableId: type === 'EAT_IN' ? apiRes.data[i % 30].id : null,
      clientName: type !== 'EAT_IN' ? `Client ${i}` : undefined,
      items: [{ productId: p1.id, variantName: p1.variants[0].name, quantity: 1 }]
    }, waiterToken);
  });

  // Simultaneous Corte Z attempt
  const closureAttempt = req('/shifts/close', 'POST', { actualBalance: 5000 }, adminToken);
  
  const allOrders = await Promise.all(orderPromises);
  const closureRes = await closureAttempt;
  
  const timeTaken = (Date.now() - startTime) / 1000;
  const successOrders = allOrders.filter(o => o.status === 201).length;

  log('Stress: 200 Pedidos', successOrders === 200, `${successOrders}/200 creados en ${timeTaken}s.`);
  log('Stress: Bloqueo Corte Z', closureRes.status === 400, `Intento de cierre durante operación. Status: ${closureRes.status}`);

  // --- 5. CLEANUP & FINAL AUDIT ---
  console.log('🧹 Limpiando para balance final...');
  const active = (await req('/orders', 'GET', null, adminToken)).data.filter((o: any) => o.status !== 'PAID');
  for (const o of active) {
    if (o.tableId) {
      await req(`/tables/${o.tableId}/pay`, 'POST', {}, adminToken);
    } else {
      await req(`/orders/${o.id}/pay`, 'POST', {}, adminToken);
    }
  }

  const finalShift = (await req('/shifts/current', 'GET', null, adminToken)).data;
  const incomes = finalShift.cashFlows.filter((cf: any) => cf.type === 'INCOME').reduce((acc: number, cf: any) => acc + Number(cf.amount), 0);
  const expected = 500 + incomes;
  
  r = await req('/shifts/close', 'POST', { actualBalance: expected }, adminToken);
  log('Auditoría Financiera Final', r.status === 200 || r.status === 201, `Cierre perfecto con $${expected}.`);

  console.log('\n--- RESULTADOS FINALES DE CERTIFICACIÓN ---');
  console.table(results);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
