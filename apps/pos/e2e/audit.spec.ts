import { test, expect } from '@playwright/test';

test.describe('Auditoría de Roles y Validaciones', () => {
  
  test('Flujo de Seguridad y Trazabilidad', async ({ page, context }) => {
    test.setTimeout(300000);

    // --- STEP 1: Prueba Negativa (Abrir caja con -100) ---
    await page.goto('http://localhost:3000');
    
    // Login as Admin
    await page.waitForSelector('button:has-text("1")');
    for (const digit of '1234') {
      await page.click(`button:has-text("${digit}")`, { force: true });
      await page.waitForTimeout(300);
    }
    
    // Attempt opening with -100 (UI Check)
    await expect(page.locator('h2:has-text("Caja Cerrada")')).toBeVisible({ timeout: 15000 });
    
    const input = page.locator('input[type="number"]');
    await input.fill('-100');
    
    const openBtn = page.locator('button:has-text("Abrir Turno")');
    await expect(openBtn).toBeDisabled();
    console.log('UI properly disabled for negative values');

    // Backend Check: Test the API directly
    const adminToken = await page.evaluate(() => localStorage.getItem('mr-king-token'));
    const backendRes = await page.request.post('http://localhost:4000/shifts/open', {
      data: { openingBalance: -100 },
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log('Backend Response for -100:', backendRes.status());
    expect(backendRes.status()).toBe(400); 
    
    // Now open correctly to proceed
    await input.fill('500');
    await page.click('button:has-text("Abrir Turno")', { force: true });
    await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible({ timeout: 15000 });

    // --- STEP 2: Prueba de Creación (Admin crea 'Mostrador 1') ---
    await page.locator('a, button').filter({ hasText: /Configuración/i }).first().click({ force: true });
    
    // Admin Pin Gate
    await page.waitForSelector('h1:has-text("Acceso Restringido")');
    for (const digit of '1234') {
      await page.click(`button:has-text("${digit}")`, { force: true });
      await page.waitForTimeout(300);
    }
    
    await page.locator('nav a').filter({ hasText: /Personal/i }).click({ force: true });
    await page.click('button:has-text("Añadir Usuario")');
    
    await page.fill('input[placeholder*="Juan"]', 'Mostrador 1');
    const pinInput = page.locator('input[placeholder="••••"]');
    await pinInput.click();
    await pinInput.type('5555', { delay: 100 });
    
    await page.click('button:has-text("Guardar")', { force: true });
    await expect(page.locator('h3:has-text("Mostrador 1")')).toBeVisible({ timeout: 15000 });
    console.log('User Mostrador 1 created');

    // --- STEP 3: Prueba de Rol (Mesero '5555') ---
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:3000');

    // Login as Mostrador 1
    await page.waitForSelector('button:has-text("1")', { timeout: 30000 });
    for (const digit of '5555') {
      await page.click(`button:has-text("${digit}")`, { force: true });
      await page.waitForTimeout(300);
    }

    await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible({ timeout: 15000 });
    
    // Check A: NO Gasto button
    await expect(page.locator('button:has-text("Gasto")')).not.toBeVisible();
    // Check B: NO Corte button
    await expect(page.locator('button:has-text("Corte (Z)")')).not.toBeVisible();
    
    // Check C: NO Corte button inside table
    await page.click('button:has-text("#2")');
    await expect(page.locator('button:has-text("Corte")')).not.toBeVisible();
    console.log('Waiter role restrictions verified');

    // --- STEP 4: Prueba de Trazabilidad ---
    await page.click('button:has-text("BEBIDAS")');
    await page.locator('h3').filter({ hasText: /Coca Cola/i }).first().click({ force: true });
    
    await page.locator('button:has-text("Lata")').first().click({ force: true }).catch(() => {});
    
    page.on('dialog', d => d.accept());
    await page.locator('button').filter({ hasText: /SOLICITAR/i }).click({ force: true });
    await expect(page.locator('p:has-text("En Cocina")').first()).toBeVisible({ timeout: 15000 });
    
    // Verify in Backend
    const waiterToken = await page.evaluate(() => localStorage.getItem('mr-king-token'));
    const ordersResponse = await page.request.get('http://localhost:4000/orders', {
      headers: { 'Authorization': `Bearer ${waiterToken}` }
    });
    
    const orders = await ordersResponse.json();
    console.log('Orders Count:', orders.length);
    const lastOrder = Array.isArray(orders) ? orders.find(o => o.table?.number === 2) : null;
    
    if (!lastOrder) throw new Error('Order not found in backend');
    
    console.log('Last Order Waiter:', lastOrder.waiter.name);
    expect(lastOrder.waiter.name).toBe('Mostrador 1');
    
    console.log('Audit PASS');
  });
});
