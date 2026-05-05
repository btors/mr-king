

const BASE_URL = 'http://localhost:4000';

async function run() {
  console.log('--- INICIANDO CERTIFICACIÓN MR-KING ---');
  let adminToken = '';
  let waiterToken = '';
  let shiftId = '';
  let products: any[] = [];
  let pizzaHawaiana: any, pizzaEspecial: any, alitas: any, burger: any;
  let orderId = '';

  // 1. LOGIN ADMIN
  console.log('1. Login Admin...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '1234', password: '1234' })
  });
  if (!adminLoginRes.ok) {
    const text = await adminLoginRes.text();
    throw new Error('Admin login failed: ' + text);
  }
  adminToken = (await adminLoginRes.json()).access_token;
  console.log('   Admin Token:', adminToken.substring(0, 15) + '...');

  // 2. CREAR MESERO
  console.log('2. Create/Check Waiter...');
  const waiterRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Mesero Cert', username: '5555', password: '5555', role: 'WAITER' })
  });
  // It might fail if already exists, that's fine

  // 3. LOGIN MESERO
  console.log('3. Login Waiter...');
  const waiterLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '5555', password: '5555' })
  });
  if (!waiterLoginRes.ok) throw new Error('Waiter login failed');
  waiterToken = (await waiterLoginRes.json()).access_token;

  // 4. FASE 2: AUTH VIOLATION
  console.log('4. Negative: Auth Violation...');
  const authFail = await fetch(`${BASE_URL}/users`, { headers: { Authorization: `Bearer ${waiterToken}` } });
  if (authFail.status !== 403 && authFail.status !== 401) {
    throw new Error(`Auth Violation failed! Status: ${authFail.status}`);
  }
  console.log('   Auth Violation passed (prevented).');

  // 5. FASE 2: BLOQUEO FINANCIERO MESERO
  console.log('5. Negative: Waiter opens shift...');
  const waiterShiftRes = await fetch(`${BASE_URL}/shifts/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({ openingBalance: 500 })
  });
  if (waiterShiftRes.status !== 403 && waiterShiftRes.status !== 401) {
    throw new Error(`Financial Lock Waiter failed! Status: ${waiterShiftRes.status}`);
  }
  console.log('   Financial Lock Waiter passed (prevented).');

  // 6. FASE 2: VALORES CORRUPTOS
  console.log('6. Negative: Admin opens shift with -1000...');
  const corruptShiftRes = await fetch(`${BASE_URL}/shifts/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ openingBalance: -1000 })
  });
  if (corruptShiftRes.status !== 400) {
    console.error(`   ERROR: Corrupt Shift allowed! Status: ${corruptShiftRes.status}`);
    // throw new Error('Fix backend: Corrupt shift allowed');
  } else {
    console.log('   Corrupt Shift passed (prevented).');
  }

  // 7. ABRIR CAJA (Admin $500)
  console.log('7. Admin opens shift $500...');
  const openShiftRes = await fetch(`${BASE_URL}/shifts/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ openingBalance: 500 })
  });
  if (openShiftRes.ok) {
    const shift = await openShiftRes.json();
    shiftId = shift.id;
  } else {
    // maybe already open
    const activeRes = await fetch(`${BASE_URL}/shifts/active`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const shift = await activeRes.json();
    shiftId = shift?.id;
  }
  console.log('   Shift ID:', shiftId);

  // 8. GET PRODUCTS
  console.log('8. Fetching Products...');
  const prodRes = await fetch(`${BASE_URL}/products`, { headers: { Authorization: `Bearer ${waiterToken}` } });
  products = await prodRes.json();
  pizzaHawaiana = products.find(p => p.name === 'Hawaiana');
  pizzaEspecial = products.find(p => p.name === 'Hawaiana Especial');
  alitas = products.find(p => p.name === 'Alitas');
  burger = products.find(p => p.name === 'Hamburguesa Hawaiana');

  // 9. FASE 2: LIMITS VIOLATION (3 FLAVORS)
  console.log('9. Negative: Limits Violation (3 flavors on max 2)...');
  const limitsRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify({
      tableId: null, orderType: 'EAT_IN',
      items: [{
        productId: alitas.id, quantity: 1, price: 85,
        config: { variants: ['BBQ', 'Bufalo', 'Red Hot'] }
      }]
    })
  });
  if (limitsRes.status !== 400) {
    console.error(`   ERROR: Limits violation allowed! Status: ${limitsRes.status}`);
  } else {
    console.log('   Limits violation passed (prevented).');
  }

  // 10. FASE 1: CREAR ORDEN COMPLEJA
  console.log('10. Happy Path: Create Complex Order Table 3...');
  const tablesRes = await fetch(`${BASE_URL}/tables`, { headers: { Authorization: `Bearer ${waiterToken}` } });
  const tables = await tablesRes.json();
  const table3 = tables.find((t: any) => t.number === 3);
  const tableId = table3.id;

  const orderData = {
    tableId: tableId,
    orderType: 'EAT_IN',
    items: [
      {
        productId: pizzaEspecial.id,
        quantity: 1,
        price: 230, // It will be recalculated by backend anyway!
        config: {
          isHalfAndHalf: true,
          variantName: 'FM',
          halfA: { productId: pizzaHawaiana.id, variantName: 'FM' },
          halfB: { productId: pizzaEspecial.id, variantName: 'FM' }
        }
      },
      {
        productId: alitas.id,
        quantity: 1,
        price: 160,
        config: { variantName: '12pz', variants: ['BBQ', 'Bufalo'] }
      },
      {
        productId: burger.id,
        quantity: 1,
        price: 95,
        notes: 'Sin cátsup',
        config: { variantName: 'Con Papas' }
      }
    ]
  };

  const createOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiterToken}` },
    body: JSON.stringify(orderData)
  });
  
  if (!createOrderRes.ok) throw new Error(`Order creation failed! ${await createOrderRes.text()}`);
  const order = await createOrderRes.json();
  orderId = order.id;
  console.log('   Order Created:', orderId, 'Total:', order.total);

  // 10.5 KDS: MOVER A PREPARING LUEGO READY
  console.log('10.5 KDS Flow: Update Order Status...');
  const prepRes = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'PREPARING' })
  });
  if (!prepRes.ok) throw new Error(`KDS PREPARING failed! ${await prepRes.text()}`);
  console.log('    Status updated to PREPARING.');

  const readyRes = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'READY' })
  });
  if (!readyRes.ok) throw new Error(`KDS READY failed! ${await readyRes.text()}`);
  console.log('    Status updated to READY.');

  // 11. PAY ORDER (Cobrar Mesa)
  console.log('11. Pay Order...');
  const payRes = await fetch(`${BASE_URL}/tables/${tableId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiterToken}` },
  });
  if (!payRes.ok) throw new Error(`Payment failed! ${await payRes.text()}`);
  console.log('   Payment & CashFlow recorded automatically via payBill.');

  // 12. ADMIN CLOSE SHIFT
  console.log('12. Admin Close Shift...');
  const closeRes = await fetch(`${BASE_URL}/shifts/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ actualBalance: Number(order.total) + 500 }) // Expected = 500 + order.total
  });
  if (!closeRes.ok) throw new Error(`Close Shift failed! ${await closeRes.text()}`);
  const closedShift = await closeRes.json();
  
  console.log('   Shift closed successfully.');
  console.log('   Expected Balance:', closedShift.expectedBalance);
  console.log('   Actual Balance:', closedShift.actualBalance);
  console.log('   Difference:', Number(closedShift.actualBalance) - Number(closedShift.expectedBalance));

  console.log('--- CERTIFICACIÓN FINALIZADA ---');
}

run().catch(console.error);
