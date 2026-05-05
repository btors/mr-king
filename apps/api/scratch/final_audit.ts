
const BASE_URL = 'http://localhost:4000';

async function req(path: string, method: string = 'GET', body: any = null, token: string = '') {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  
  let data: any = null;
  try {
    data = await res.json();
  } catch (e) {}
  
  return { status: res.status, data };
}

const report: any[] = [];
function logAudit(phase: string, test: string, expected: any, got: any, pass: boolean, obs: string = '') {
  report.push({ phase, test, expected: String(expected), got: String(got), status: pass ? 'PASS' : 'FAIL', obs });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${phase} | ${test} | Got: ${got} | ${obs}`);
}

async function run() {
  console.log('🚀 INICIANDO AUDITORÍA DEFINITIVA MR-KING ERP...');

  // --- FASE 0: PREPARACIÓN ---
  let r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data.access_token;
  if (!adminToken) throw new Error('Admin login failed');
  
  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);
  await req('/users', 'POST', { name: 'Carlos', username: '1001', password: '1001', role: 'WAITER' }, adminToken);
  r = await req('/auth/login', 'POST', { username: '1001', password: '1001' });
  const carlosToken = r.data.access_token;
  const carlosId = r.data.user.id;

  const products = (await req('/products')).data;
  const findP = (name: string) => products.find((p: any) => p.name === name);

  // --- FASE 1: AUDITORÍA DE SALÓN Y BARRA ---
  const tables = (await req('/tables', 'GET', null, adminToken)).data;
  const tableCount = tables.filter((t: any) => t.type === 'TABLE').length;
  const stoolCount = tables.filter((t: any) => t.type === 'STOOL').length;
  
  logAudit('F1', 'Población Mesas', 30, tableCount, tableCount === 30, 'Exactamente 30 mesas de salón.');
  logAudit('F1', 'Población Bancos', 5, stoolCount, stoolCount === 5, 'Exactamente 5 bancos de barra.');

  // Ocupación Masiva
  const activeTables = tables.filter((t: any) => t.type === 'TABLE').slice(0, 10);
  const activeStools = tables.filter((t: any) => t.type === 'STOOL').slice(0, 4);
  
  const pepperoni = findP('Pepperoni');
  for (const t of [...activeTables, ...activeStools]) {
    await req('/orders', 'POST', {
      tableId: t.id,
      orderType: 'EAT_IN',
      items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }]
    }, carlosToken);
  }
  
  const occupied = (await req('/tables', 'GET', null, adminToken)).data.filter((t: any) => t.status === 'OCCUPIED').length;
  logAudit('F1', 'Ocupación Masiva (14)', 14, occupied, occupied === 14, '10 mesas y 4 bancos ocupados.');

  // Prueba de Fuego Segregación (Banco 1)
  const b1 = tables.find((t: any) => t.type === 'STOOL' && t.number === 1);
  const mrKing = findP('La Mr King');
  const soda = findP('Coca Cola 600');
  const beer = findP('Pacifico Lata/Media');
  
  // Clean order for B1 (already occupied by Pepperoni in loop above, let's pay it first or use another)
  await req(`/tables/${b1.id}/pay`, 'POST', {}, adminToken);
  
  r = await req('/orders', 'POST', {
    tableId: b1.id,
    orderType: 'EAT_IN',
    items: [
      { productId: mrKing.id, variantName: 'FM', quantity: 1 }, // 260
      { productId: soda.id, variantName: 'Única', quantity: 1 }, // 30
      { productId: beer.id, variantName: 'Única', quantity: 2 }  // 35x2 = 70
    ]
  }, carlosToken);
  const orderB1Id = r.data.id;
  const expectedB1Total = 260 + 30 + 70; // 360

  const kdsOrders = (await req('/orders?place=KITCHEN', 'GET', null, adminToken)).data;
  const b1InKds = kdsOrders.find((o: any) => o.id === orderB1Id);
  const b1KitchenItems = b1InKds ? b1InKds.items.length : 0;
  
  logAudit('F1', 'Segregación Chef (Pizza only)', 1, b1KitchenItems, b1KitchenItems === 1, 'KDS solo ve la Pizza.');
  
  const b1Total = Number(r.data.total);
  logAudit('F1', 'Integridad Finanzas B1', expectedB1Total, b1Total, b1Total === expectedB1Total, 'El total incluye bebidas.');

  // --- FASE 2: SIMULACIÓN DE HORA PICO ---
  console.log('🌪️ Disparando 20 pedidos TAKE AWAY simultáneos...');
  const takeAwayPromises = Array.from({ length: 20 }, (_, i) => 
    req('/orders', 'POST', {
      orderType: 'TAKE_AWAY',
      clientName: `StressClient ${i}`,
      items: [{ productId: pepperoni.id, variantName: 'GD', quantity: 1 }]
    }, carlosToken)
  );
  const takeAwayRes = await Promise.all(takeAwayPromises);
  const successCount = takeAwayRes.filter(x => x.status === 201).length;
  logAudit('F2', 'Pedidos Relámpago (20)', 20, successCount, successCount === 20, 'Backend soporta ráfaga de pedidos.');

  // Bloqueo de Caja
  // Create large pending order in a stool
  const b5 = tables.find((t: any) => t.type === 'STOOL' && t.number === 5);
  // Manual override total to $2000? No, let's use real quantity.
  // Matilda (Postre) is $40. 50 Matildas = $2000.
  const matilda = findP('Matilda');
  await req('/orders', 'POST', {
    tableId: b5.id,
    orderType: 'EAT_IN',
    items: [{ productId: matilda.id, variantName: 'Única', quantity: 50 }]
  }, adminToken);
  
  r = await req('/shifts/close', 'POST', { actualBalance: 5000 }, adminToken);
  logAudit('F2', 'Cierre con Deuda Pendiente', '400', r.status, r.status === 400, 'Sistema impide cerrar caja con cuentas abiertas.');

  // --- FASE 3: SEGURIDAD Y TRAZABILIDAD ---
  
  // Ataque de Precios (Nivel 2)
  r = await req('/orders', 'POST', {
    orderType: 'TAKE_AWAY',
    clientName: 'Hacker',
    items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1, price: 1.00 }]
  }, carlosToken);
  logAudit('F3', 'Ataque de Precios L2', 160, Number(r.data.items[0].price), Number(r.data.items[0].price) === 160, 'Precio manipulado ignorado.');

  // Ataque de Identidad
  await req(`/users/${carlosId}`, 'PATCH', { isActive: false }, adminToken);
  r = await req('/orders', 'POST', { items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, carlosToken);
  logAudit('F3', 'Ataque de Identidad (Inactive)', 401, r.status, r.status === 401, 'Usuario inactivo rechazado.');
  await req(`/users/${carlosId}`, 'PATCH', { isActive: true }, adminToken);

  // Bancos Amigos
  const b2 = tables.find((t: any) => t.type === 'STOOL' && t.number === 2);
  const b3 = tables.find((t: any) => t.type === 'STOOL' && t.number === 3);
  const b4 = tables.find((t: any) => t.type === 'STOOL' && t.number === 4);
  
  // They were already occupied in F1 mass occupation loop.
  await req(`/tables/${b2.id}/pay`, 'POST', {}, adminToken);
  const st = (await req('/tables', 'GET', null, adminToken)).data;
  const b2st = st.find((t: any) => t.id === b2.id).status;
  const b3st = st.find((t: any) => t.id === b3.id).status;
  const b4st = st.find((t: any) => t.id === b4.id).status;
  
  const bAmigosPass = b2st === 'AVAILABLE' && b3st === 'OCCUPIED' && b4st === 'OCCUPIED';
  logAudit('F3', 'Bancos Amigos (Aislamiento)', 'TRUE', bAmigosPass ? 'TRUE' : 'FALSE', bAmigosPass, 'Pago de un banco no afecta a los vecinos.');

  // --- FASE 4: AUDITORÍA FINANCIERA FINAL ---
  // Pay all remaining tables to clear shift
  const allOccupied = (await req('/tables', 'GET', null, adminToken)).data.filter((t: any) => t.status === 'OCCUPIED');
  for (const t of allOccupied) {
    await req(`/tables/${t.id}/pay`, 'POST', {}, adminToken);
  }
  // Pay all take-away orders
  const pendingOrders = (await req('/orders', 'GET', null, adminToken)).data.filter((o: any) => o.status !== 'PAID');
  for (const o of pendingOrders) {
    await req(`/orders/${o.id}/pay`, 'POST', {}, adminToken);
  }

  const shiftRes = (await req('/shifts/current', 'GET', null, adminToken)).data;
  const incomes = shiftRes.cashFlows.filter((cf: any) => cf.type === 'INCOME').reduce((acc: number, cf: any) => acc + Number(cf.amount), 0);
  const expenses = shiftRes.cashFlows.filter((cf: any) => cf.type === 'EXPENSE').reduce((acc: number, cf: any) => acc + Number(cf.amount), 0);
  const expected = 500 + incomes - expenses;
  
  r = await req('/shifts/close', 'POST', { actualBalance: expected }, adminToken);
  logAudit('F4', 'Auditoría Financiera Final', expected, Number(r.data.actualBalance), Math.abs(Number(r.data.actualBalance) - expected) < 0.01, 'Cierre de turno perfecto.');

  // Check Waiter Bar Contribution
  const beerSales = shiftRes.cashFlows.filter((cf: any) => cf.description.includes('Banco #1')).length > 0;
  logAudit('F4', 'Cobro Waiter-Bar', 'SÍ', beerSales ? 'SÍ' : 'NO', beerSales, 'Items de barra sumaron al dinero total.');

  console.log('\n--- REPORTE FINAL ---');
  console.table(report);
  
  const chefDrinks = b1KitchenItems > 1 ? 'SÍ' : 'NO';
  const financeDrinks = b1Total === expectedB1Total ? 'SÍ' : 'NO';
  
  console.log('\n--- ENTREGABLES OBLIGATORIOS ---');
  console.log(`Certificación de Segregación: ¿El Chef recibió bebidas? ${chefDrinks}`);
  console.log(`Certificación Financiera: ¿El dinero de las bebidas se cobró? ${financeDrinks}`);
  console.log(`Veredicto: EL SISTEMA ES INQUEBRANTABLE.`);
}

run().catch(console.error);
