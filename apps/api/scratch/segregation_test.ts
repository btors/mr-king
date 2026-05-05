
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
  console.log('--- FASE 0: PREPARACIÓN ---');
  
  // 1. Login Admin
  let r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data.access_token;
  if (!adminToken) throw new Error('Admin login failed');
  
  // 2. Open Shift
  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);
  
  // 3. Create Waiter Carlos if missing
  await req('/users', 'POST', { name: 'Carlos', username: '1001', password: '1001', role: 'WAITER' }, adminToken);
  
  // 4. Login Waiter Carlos (1001)
  r = await req('/auth/login', 'POST', { username: '1001', password: '1001' });
  const carlosToken = r.data.access_token;
  if (!carlosToken) throw new Error('Carlos login failed');

  console.log('--- FASE 1: PRUEBA DE BARRA ---');
  
  const products = (await req('/products')).data;
  const findP = (name: string) => products.find((p: any) => p.name === name);
  
  const pizza = findP('Pepperoni'); // KITCHEN
  const beer = findP('Pacifico Lata/Media'); // WAITER_BAR (Bebidas)
  
  if (!pizza || !beer) throw new Error('Products not found in seed');
  
  const tables = (await req('/tables', 'GET', null, adminToken)).data;
  const stool1 = tables.find((t: any) => t.type === 'STOOL' && t.number === 1);
  
  if (!stool1) throw new Error('Stool 1 not found in seed');
  logTest('1.1', 'Stool 1 Visibility', 'STOOL', stool1.type, stool1.type === 'STOOL');

  // Create order: 1 Pizza ($160 MD) + 1 Beer ($35) = $195
  r = await req('/orders', 'POST', {
    tableId: stool1.id,
    orderType: 'EAT_IN',
    items: [
      { productId: pizza.id, variantName: 'MD', quantity: 1 },
      { productId: beer.id, variantName: 'Única', quantity: 1 }
    ]
  }, carlosToken);
  
  if (r.status >= 400) {
    console.error('Order Creation Failed:', r.status, r.data);
  }

  const orderId = r.data?.id;
  const expectedTotal = 160 + 35;
  logTest('1.2', 'Order Created Total', expectedTotal, Number(r.data?.total), Number(r.data?.total) === expectedTotal);

  // 5. Verification KDS (KITCHEN)
  r = await req('/orders?place=KITCHEN', 'GET', null, adminToken);
  const kitchenOrder = r.data.find((o: any) => o.id === orderId);
  const kitchenItems = kitchenOrder ? kitchenOrder.items : [];
  logTest('1.3', 'KDS Visibility (Pizza only)', 1, kitchenItems.length, kitchenItems.length === 1 && kitchenItems[0].product.name === 'Pepperoni');
  const beerInKitchen = kitchenItems.find((i: any) => i.product.name === 'Pacifico Lata/Media');
  logTest('1.4', 'KDS Exclusion (No Beer)', 'undefined', String(beerInKitchen), !beerInKitchen);

  // 6. Verification WAITER_BAR
  r = await req('/orders?place=WAITER_BAR', 'GET', null, adminToken);
  const barOrder = r.data.find((o: any) => o.id === orderId);
  const barItems = barOrder ? barOrder.items : [];
  logTest('1.5', 'Bar Visibility (Beer only)', 1, barItems.length, barItems.length === 1 && barItems[0].product.name === 'Pacifico Lata/Media');

  // 7. Verification Cobro
  r = await req(`/tables/${stool1.id}/pay`, 'POST', {}, adminToken);
  logTest('1.6', 'Pay Bill Success', 200, r.status, r.status === 200 || r.status === 201);
  
  const finalStool1 = (await req('/tables', 'GET', null, adminToken)).data.find((t: any) => t.id === stool1.id);
  logTest('1.7', 'Stool 1 Liberated', 'AVAILABLE', finalStool1.status, finalStool1.status === 'AVAILABLE');

  console.log('\n--- REPORTE FINAL ---');
  console.table(tests);
}

run().catch(console.error);
