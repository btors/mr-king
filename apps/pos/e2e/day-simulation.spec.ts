import { test, expect } from '@playwright/test';

test.describe('Misión: El Día Perfecto - Simulación E2E', () => {
  
  test('Flujo Operativo Completo', async ({ page, context }) => {
    test.setTimeout(180000);

    // --- STEP 1: Login y Bloqueo (Mesero) ---
    await page.goto('http://localhost:3000');
    console.log('Page loaded');
    
    await page.waitForSelector('button:has-text("1")');
    for (const digit of '1234') {
      await page.click(`button:has-text("${digit}")`, { force: true });
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('h2:has-text("Caja Cerrada")')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Volver al Login")');

    // --- STEP 2: Apertura (Admin) ---
    await page.waitForSelector('button:has-text("1")');
    for (const digit of '9999') {
      await page.click(`button:has-text("${digit}")`, { force: true });
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('h2:has-text("Caja Cerrada")')).toBeVisible({ timeout: 15000 });
    await page.fill('input[type="number"]', '500');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Abrir Turno")', { force: true });
    
    await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible({ timeout: 15000 });
    console.log('Shift Opened with $500');

    // --- STEP 3: Venta Compleja (Mesa 1) ---
    await page.click('button:has-text("#1")');
    
    // A. Pizza Mitad y Mitad Familiar
    await page.click('button:has-text("PIZZAS")');
    await page.locator('h3:has-text("MITAD")').first().click({ force: true });
    
    // Step 1: Size
    await page.click('button:has-text("Familiar")', { force: true });
    await expect(page.locator('h3:has-text("Mitad A")').first()).toBeVisible({ timeout: 10000 });

    // Step 2: Flavor A
    await page.locator('p:has-text("PEPERONI")').first().click({ force: true });
    await expect(page.locator('h3:has-text("Mitad B")').first()).toBeVisible({ timeout: 10000 });

    // Step 3: Flavor B
    await page.locator('p:has-text("HAWAIANA")').first().click({ force: true });
    await page.waitForTimeout(1000);

    // Confirm
    await page.click('button:has-text("Confirmar Pizza!")', { force: true });
    await expect(page.locator('text=The Pizza Builder')).not.toBeVisible({ timeout: 10000 });
    console.log('Pizza Added');

    // B. Alitas 12pz
    await page.click('button:has-text("ALITAS")');
    await page.locator('button:has-text("12 piezas")').first().click({ force: true }); 
    await page.waitForTimeout(1500);
    await page.click('button:has-text("BBQ")', { force: true });
    await page.click('button:has-text("Bufalo")', { force: true });
    await page.click('button:has-text("AGREGAR")', { force: true });
    console.log('Wings Added');

    // C. Hamburguesa con Nota
    await page.click('button:has-text("HAMBURGUESAS")');
    await page.click('button:has-text("Sola")', { force: true });
    await page.locator('input[placeholder="Instrucciones especiales..."]').last().fill('Sin Cebolla');
    console.log('Burger Added');

    // D. Enviar a Cocina
    page.on('dialog', d => d.accept());
    await page.click('button:has-text("SOLICITAR")', { force: true });
    await expect(page.locator('p:has-text("En Cocina")').first()).toBeVisible({ timeout: 15000 });
    console.log('Order Sent to Kitchen');

    // --- STEP 4: Cocina (KDS) ---
    const kdsPage = await context.newPage();
    await kdsPage.goto('http://localhost:3001');
    const ticket = kdsPage.locator('div.bg-zinc-900').filter({ hasText: 'Mesa 1' }).first();
    await expect(ticket).toBeVisible({ timeout: 15000 });
    
    await ticket.locator('button:has-text("Comenzar")').click({ force: true });
    await kdsPage.waitForTimeout(1000);
    await ticket.locator('button:has-text("Orden Lista")').click({ force: true });
    await kdsPage.waitForTimeout(1000);
    await ticket.locator('button:has-text("Entregado")').click({ force: true });
    await kdsPage.waitForTimeout(1000);
    
    await expect(ticket).not.toBeVisible({ timeout: 10000 });
    console.log('KDS Workflow Completed');

    // --- STEP 5: Egreso ($100 Hielo) ---
    await page.bringToFront();
    await page.click('button:has-text("Gasto")', { force: true });
    await page.fill('input[placeholder="0.00"]', '100');
    await page.fill('input[placeholder*="hielo"]', 'Hielo');
    await page.click('button:has-text("Confirmar Gasto")', { force: true });
    await expect(page.locator('text=Registrar Gasto')).not.toBeVisible({ timeout: 10000 });
    console.log('Expense Registered');

    // --- STEP 6: Cobro ---
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("Cerrar Cuenta")').last().click({ force: true });
    
    await expect(page.locator('h2:has-text("Cobrar Mesa")')).toBeVisible({ timeout: 15000 });
    const totalSpan = page.locator('div.bg-black\\/40 span.text-7xl');
    const totalValText = await totalSpan.innerText();
    const totalVal = Number(totalValText.replace(/[^0-9]/g, ''));
    console.log('Total Mesa 1:', totalVal);

    await page.click('button:has-text("Confirmar Pago")', { force: true });
    await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible({ timeout: 15000 });
    console.log('Payment Completed');

    // --- STEP 7: Dashboard / Cierre de Turno ---
    await page.click('button:has-text("Corte (Z)")', { force: true });
    const expectedFinalBalance = 500 + totalVal - 100;
    console.log('Expected Final Balance:', expectedFinalBalance);
    
    await page.fill('input[placeholder="0.00"]', expectedFinalBalance.toString());
    await page.click('button:has-text("Confirmar Cierre")', { force: true });

    // --- STEP 8: Final Redirect ---
    await expect(page.locator('h1:has-text("MR-KING")')).toBeVisible({ timeout: 15000 });
    console.log('Simulation Finished Successfully');
  });
});
