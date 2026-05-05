
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
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

async function run() {
  console.log('--- INICIANDO PRUEBA DE SEGREGACIÓN TOTAL DE INVENTARIO ---');

  // 1. Setup
  let r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data.access_token;
  await req('/shifts/open', 'POST', { openingBalance: 500 }, adminToken);
  
  const products = (await req('/products')).data;
  const findP = (name: string) => products.find((p: any) => p.name === name);

  const pizza = findP('Pepperoni'); // $160
  const soda = findP('Coca Cola 600'); // $30
  const miche = findP('Michelada GD Clasica'); // $80
  const postre = findP('Matilda'); // $40
  const sabritas = findP('Sabritas Originales'); // $25
  const beer = findP('Pacifico Lata/Media'); // $35
  
  const tables = (await req('/tables', 'GET', null, adminToken)).data;
  const b5 = tables.find((t: any) => t.type === 'STOOL' && t.number === 5);

  // 2. Create Order
  console.log('Creando orden en Banco 5...');
  r = await req('/orders', 'POST', {
    tableId: b5.id,
    orderType: 'EAT_IN',
    items: [
      { productId: pizza.id, variantName: 'MD', quantity: 1 },
      { productId: soda.id, variantName: 'Única', quantity: 1 },
      { productId: miche.id, variantName: 'Única', quantity: 1 },
      { productId: postre.id, variantName: 'Única', quantity: 1 },
      { productId: sabritas.id, variantName: 'Única', quantity: 1 },
      { productId: beer.id, variantName: 'Única', quantity: 1 }
    ]
  }, adminToken);
  
  const orderId = r.data.id;
  const total = Number(r.data.total);
  const expectedTotal = 160 + 30 + 80 + 40 + 25 + 35; // 370
  console.log(`Orden Creada: ${orderId} | Total: ${total} | Esperado: ${expectedTotal}`);
  
  if (total !== expectedTotal) {
    console.error('FAIL: El total no coincide.');
    process.exit(1);
  }

  // 3. Verify KDS
  console.log('Verificando KDS (Chef)...');
  r = await req('/orders?place=KITCHEN', 'GET', null, adminToken);
  const kitchenOrder = r.data.find((o: any) => o.id === orderId);
  const itemsCount = kitchenOrder ? kitchenOrder.items.length : 0;
  console.log(`Items en KDS: ${itemsCount}`);
  
  if (itemsCount !== 1 || kitchenOrder.items[0].product.name !== 'Pepperoni') {
    console.error('FAIL: El Chef ve más productos de los permitidos o no ve la pizza.');
    process.exit(1);
  }
  console.log('PASS: El Chef solo ve la Pizza.');

  // 4. Verify Bar
  console.log('Verificando Barra (Mesero)...');
  r = await req('/orders?place=WAITER_BAR', 'GET', null, adminToken);
  const barOrder = r.data.find((o: any) => o.id === orderId);
  const barCount = barOrder ? barOrder.items.length : 0;
  console.log(`Items en Barra: ${barCount}`);
  
  if (barCount !== 5) {
    console.error(`FAIL: La barra debería ver 5 items, pero ve ${barCount}.`);
    process.exit(1);
  }
  console.log('PASS: La Barra ve los 5 productos de despacho directo.');

  // 5. Pay
  console.log('Cobrando Banco 5...');
  r = await req(`/tables/${b5.id}/pay`, 'POST', {}, adminToken);
  if (r.status === 201 || r.status === 200) {
    console.log('PASS: Cobro realizado con éxito.');
  } else {
    console.error('FAIL: Error en el cobro.');
    process.exit(1);
  }

  console.log('--- PRUEBA DE SEGREGACIÓN COMPLETADA CON ÉXITO ---');
}

run().catch(console.error);
