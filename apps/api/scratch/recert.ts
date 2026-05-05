
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

const tests: any[] = [];
function logTest(phase: string, testName: string, expected: any, got: any, pass: boolean) {
  tests.push({ phase, testName, expected: String(expected), got: String(got), status: pass ? 'PASS' : 'FAIL' });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${phase} - ${testName} | Expected: ${expected} | Got: ${got}`);
}

async function run() {
  console.log('--- FASE 0: RESET Y PREPARACIÓN ---');
  
  let r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data.access_token;
  if (!adminToken) throw new Error('Admin login failed');

  const waiters = [
    { name: 'Carlos', username: '1001', password: '1001', role: 'WAITER' },
    { name: 'Ana', username: '1002', password: '1002', role: 'WAITER' },
    { name: 'Luis', username: '1003', password: '1003', role: 'WAITER' }
  ];
  for (const w of waiters) {
    await req('/users', 'POST', w, adminToken);
  }
  
  r = await req('/auth/login', 'POST', { username: '1001', password: '1001' });
  const carlosToken = r.data.access_token;
  const carlosId = r.data.user.id;

  r = await req('/auth/login', 'POST', { username: '1002', password: '1002' });
  const anaToken = r.data.access_token;
  const anaId = r.data.user.id;

  r = await req('/auth/login', 'POST', { username: '1003', password: '1003' });
  const luisToken = r.data.access_token;
  const luisId = r.data.user.id;

  for (let i = 1; i <= 20; i++) {
    await req('/tables', 'POST', { number: i, capacity: 4 }, adminToken);
  }
  
  const tablesRes = await req('/tables', 'GET', null, adminToken);
  const tables = tablesRes.data || [];
  logTest('0', 'Create 20 tables', 20, tables.length, tables.length === 20);

  r = await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);
  logTest('0', 'Open Shift $500', 201, r.status, r.status === 201);

  console.log('--- FASE 1: AUDITORÍA DEL MOTOR DE PRECIOS ---');
  
  const products = (await req('/products')).data;
  const findP = (name: string) => products.find((p: any) => p.name === name);

  const hSencilla = findP('Hamburguesa Sencilla');
  r = await req('/orders', 'POST', {
    items: [{ productId: hSencilla.id, variantName: 'Sola', quantity: 1, price: 0 }],
    orderType: 'EAT_IN'
  }, carlosToken);
  logTest('1.1', 'Ataque Precio Cero', 60, Number(r.data.items[0].price), Number(r.data.items[0].price) === 60);

  r = await req('/orders', 'POST', {
    items: [{ productId: hSencilla.id, variantName: 'Sola', quantity: 1, price: 99999 }],
    orderType: 'EAT_IN'
  }, carlosToken);
  logTest('1.2', 'Ataque Precio Inflado', 60, Number(r.data.items[0].price), Number(r.data.items[0].price) === 60);

  const pepperoni = findP('Pepperoni');
  r = await req('/orders', 'POST', {
    items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 3 }],
    orderType: 'EAT_IN'
  }, carlosToken);
  logTest('1.3', 'Anti-Doble Multiplicación', 480, Number(r.data.total), Number(r.data.total) === 480);

  const laMrKing = findP('La Mr King');
  const alitas = findP('Alitas');
  const hEspecial = findP('Hamburguesa Especial');
  const boneless = findP('Boneless');
  const coca25 = findP('Coca Cola 2.5 R');
  
  const complexItems = [
    { productId: laMrKing.id, variantName: 'GD', quantity: 1 }, // 210
    { productId: alitas.id, variantName: '18pz', quantity: 1, config: { variants: ['BBQ'] } }, // 230
    { productId: hEspecial.id, variantName: 'Con Papas', quantity: 1 }, // 110
    { productId: boneless.id, variantName: '6pz', quantity: 1, config: { variants: ['BBQ'] } }, // 60
    { productId: coca25.id, variantName: 'Única', quantity: 1 } // 60
  ];
  r = await req('/orders', 'POST', { items: complexItems, orderType: 'EAT_IN' }, carlosToken);
  const complexOrder = r.data;
  logTest('1.4', 'Orden Compleja Total', 670, Number(complexOrder.total), Number(complexOrder.total) === 670);
  await req(`/orders/${complexOrder.id}/pay`, 'POST', {}, carlosToken);

  r = await req('/orders', 'POST', {
    items: [{
      productId: laMrKing.id,
      quantity: 1,
      config: {
        isHalfAndHalf: true,
        variantName: 'FM',
        halfA: { productId: laMrKing.id, variantName: 'FM' }, // 260
        halfB: { productId: pepperoni.id, variantName: 'FM' } // 230
      }
    }],
    orderType: 'EAT_IN'
  }, carlosToken);
  logTest('1.5', 'Mitad y Mitad Math (max+15)', 275, Number(r.data.total), Number(r.data.total) === 275);
  await req(`/orders/${r.data.id}/pay`, 'POST', {}, carlosToken);

  console.log('--- FASE 2: TRAZABILIDAD FINANCIERA ESTRICTA ---');
  
  r = await req('/users', 'POST', { name: 'Temp', username: '9999', password: '9999', role: 'WAITER' }, adminToken);
  const tempId = r.data.id;
  r = await req('/auth/login', 'POST', { username: '9999', password: '9999' });
  const tempToken = r.data.access_token;
  await req(`/users/${tempId}`, 'DELETE', null, adminToken);
  r = await req('/orders', 'POST', { items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, tempToken);
  logTest('2.1', 'Deleted User Token', 401, r.status, r.status === 401);

  const identityOrders = [];
  const tokens = [carlosToken, anaToken, luisToken];
  const ids = [carlosId, anaId, luisId];
  for(let i=0; i<3; i++) {
    r = await req('/orders', 'POST', { items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, tokens[i]);
    identityOrders.push(r.data);
  }
  let identityPass = true;
  for(let i=0; i<3; i++) {
    if (identityOrders[i].waiterId !== ids[i]) identityPass = false;
  }
  logTest('2.2', 'Identity in Each Sale', 'MATCH', identityPass ? 'MATCH' : 'FAIL', identityPass);

  await req('/shifts/close', 'POST', { actualBalance: 0 }, adminToken);
  r = await req(`/orders/${identityOrders[0].id}/pay`, 'POST', {}, carlosToken);
  logTest('2.3', 'Pay without Active Shift', 400, r.status, r.status === 400);

  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);

  console.log('--- FASE 3: TODOS LOS CANALES OMNICANAL ---');
  
  const t5 = tables.find((t: any) => t.number === 5);
  r = await req('/orders', 'POST', {
    tableId: t5.id,
    orderType: 'EAT_IN',
    items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }],
    notes: 'TEST EAT_IN'
  }, carlosToken);
  const o5 = r.data;
  let table5 = (await req('/tables', 'GET', null, adminToken)).data.find((t: any) => t.number === 5);
  logTest('3.1', 'Mesa 5 OCCUPIED', 'OCCUPIED', table5.status, table5.status === 'OCCUPIED');
  await req(`/tables/${t5.id}/pay`, 'POST', {}, carlosToken);
  table5 = (await req('/tables', 'GET', null, adminToken)).data.find((t: any) => t.number === 5);
  logTest('3.1', 'Mesa 5 AVAILABLE after pay', 'AVAILABLE', table5.status, table5.status === 'AVAILABLE');

  r = await req('/orders', 'POST', {
    orderType: 'TAKE_AWAY',
    items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }]
  }, carlosToken);
  logTest('3.2', 'TAKE_AWAY without clientName', 400, r.status, r.status === 400);

  r = await req('/orders', 'POST', {
    orderType: 'TAKE_AWAY',
    clientName: 'Cliente Juan',
    items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }]
  }, carlosToken);
  logTest('3.3', 'TAKE_AWAY with clientName', 201, r.status, r.status === 201 || r.status === 200);
  await req(`/orders/${r.data.id}/pay`, 'POST', {}, carlosToken);

  r = await req('/orders', 'POST', {
    orderType: 'DELIVERY',
    clientName: 'Cliente Maria',
    items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }]
  }, carlosToken);
  logTest('3.4', 'DELIVERY Created', 201, r.status, r.status === 201 || r.status === 200);
  await req(`/orders/${r.data.id}/pay`, 'POST', {}, carlosToken);

  const t3 = tables.find((t: any) => t.number === 3);
  const resMixtas = await Promise.all([
    req('/orders', 'POST', { tableId: t3.id, orderType: 'EAT_IN', items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, carlosToken),
    req('/orders', 'POST', { orderType: 'TAKE_AWAY', clientName: 'Juan', items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, anaToken),
    req('/orders', 'POST', { orderType: 'DELIVERY', clientName: 'Maria', items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, luisToken)
  ]);
  const mixedPass = resMixtas.every(x => x.status === 201 || x.status === 200);
  logTest('3.5', 'Mixed Orders Simultaneous', 'TRUE', mixedPass ? 'TRUE' : 'FAIL', mixedPass);
  for(const or of resMixtas) await req(`/orders/${or.data.id}/pay`, 'POST', {}, adminToken);

  console.log('--- FASE 4: STRESS Y CONCURRENCIA ---');
  
  const bulkRes = await Promise.all(Array.from({ length: 30 }, (_, i) => 
    req('/orders', 'POST', { orderType: 'TAKE_AWAY', clientName: `Bulk ${i}`, items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, carlosToken)
  ));
  const bulkPass = bulkRes.filter(x => x.status === 201 || x.status === 200).length;
  logTest('4.1', 'Lluvia de Pedidos (30)', 30, bulkPass, bulkPass === 30);
  for(const or of bulkRes) if(or.data?.id) await req(`/orders/${or.data.id}/pay`, 'POST', {}, adminToken);

  const t10 = tables.find((t: any) => t.number === 10);
  await req('/orders', 'POST', { tableId: t10.id, orderType: 'EAT_IN', items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, carlosToken);
  const payRes = await Promise.all([
    req(`/tables/${t10.id}/pay`, 'POST', {}, carlosToken),
    req(`/tables/${t10.id}/pay`, 'POST', {}, anaToken),
    req(`/tables/${t10.id}/pay`, 'POST', {}, luisToken)
  ]);
  const paySuccess = payRes.filter(x => x.status === 200 || x.status === 201).length;
  logTest('4.2', 'Concurrent Pay Mesa 10', 1, paySuccess, paySuccess === 1);

  const availTables = (await req('/tables', 'GET', null, adminToken)).data.filter((t: any) => t.status === 'AVAILABLE');
  await Promise.all(availTables.map((t: any) => req('/orders', 'POST', { tableId: t.id, orderType: 'EAT_IN', items: [{ productId: pepperoni.id, variantName: 'MD', quantity: 1 }] }, adminToken)));
  const finalTablesCount = (await req('/tables', 'GET', null, adminToken)).data.filter((t: any) => t.status === 'OCCUPIED').length;
  logTest('4.3', 'Mesas al Límite (20)', 20, finalTablesCount, finalTablesCount === 20);

  r = await req('/orders', 'POST', {
    items: [{ productId: alitas.id, variantName: '12pz', quantity: 1, config: { variants: ['BBQ', 'Bufalo', 'Red Hot'] } }],
    orderType: 'EAT_IN'
  }, carlosToken);
  logTest('4.4', '3 Sabores (Max 2)', 400, r.status, r.status === 400);
  
  r = await req('/orders', 'POST', {
    items: [{ productId: alitas.id, variantName: '12pz', quantity: 1, config: { variants: [] } }],
    orderType: 'EAT_IN'
  }, carlosToken);
  logTest('4.4', '0 Sabores', 'ERROR', r.status >= 400 ? 'ERROR' : 'SUCCESS', r.status >= 400);

  console.log('--- FASE 5: SEGURIDAD Y AUTENTICACIÓN ---');
  
  const adminEndpoints = [
    { path: '/shifts/open', method: 'POST', body: { openingBalance: 100 } },
    { path: '/shifts/close', method: 'POST', body: { actualBalance: 100 } },
    { path: '/cash/expense', method: 'POST', body: { amount: 50, description: 'test' } },
    { path: '/users', method: 'GET' },
    { path: '/users', method: 'POST', body: { name: 'X', username: 'X', password: 'X', role: 'WAITER' } },
    { path: `/tables/${tables[0].id}`, method: 'DELETE' }
  ];
  let adminEndpointsPass = true;
  for(const e of adminEndpoints) {
    const res = await req(e.path, e.method, e.body, carlosToken);
    if (res.status !== 403) adminEndpointsPass = false;
  }
  logTest('5.1', 'Admin Endpoints with Waiter Token', '403xALL', adminEndpointsPass ? '403xALL' : 'FAIL', adminEndpointsPass);

  r = await req('/users', 'GET', null, 'eyJhbGciOiJIUzI1NiJ9.e30.FAKE'); // Invalid format token
  logTest('5.2', 'Invalid Token', 401, r.status, r.status === 401);

  const t1 = tables.find((t: any) => t.number === 1);
  r = await req(`/tables/${t1.id}`, 'DELETE', null, adminToken);
  logTest('5.3', 'Delete Mesa with Active Order', 400, r.status, r.status === 400);

  console.log('--- FASE 6: AUDITORÍA FINANCIERA ---');
  
  await req('/cash/expense', 'POST', { amount: 75, description: 'Insumos de cocina' }, adminToken);
  const payRest = (await req('/tables', 'GET', null, adminToken)).data.filter((t: any) => t.status === 'OCCUPIED');
  for(const t of payRest) await req(`/tables/${t.id}/pay`, 'POST', {}, adminToken);
  
  const currentShift = (await req('/shifts/current', 'GET', null, adminToken)).data;
  const incomes = currentShift.cashFlows.filter((cf: any) => cf.type === 'INCOME').reduce((acc: number, cf: any) => acc + Number(cf.amount), 0);
  const expenses = currentShift.cashFlows.filter((cf: any) => cf.type === 'EXPENSE').reduce((acc: number, cf: any) => acc + Number(cf.amount), 0);
  const expectedBalance = 500 + incomes - expenses;
  
  r = await req('/shifts/close', 'POST', { actualBalance: expectedBalance }, adminToken);
  const closedShift = r.data;
  logTest('6', 'Final Balance Matches', expectedBalance, Number(closedShift.expectedBalance), Math.abs(Number(closedShift.expectedBalance) - expectedBalance) < 0.01);

  console.log('\n--- REPORTE FINAL ---');
  console.table(tests);
}

run().catch(console.error);
