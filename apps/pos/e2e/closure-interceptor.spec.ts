import { test, expect } from '@playwright/test';

test.describe('Closure Interceptor Certification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    for (const digit of '1234') {
      await page.click(`button:has-text("${digit}")`, { delay: 100, force: true });
    }
    await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();
  });

  test('Case 1: Descartar y Cobrar', async ({ page }) => {
    // 1. Open Mesa 3
    await page.click('button:has-text("#3")');
    
    // Add Pizza and Send
    await page.click('button:has-text("PIZZAS")');
    await page.locator('div.group').filter({ has: page.locator('h3', { hasText: /^Pepperoni$/ }) }).locator('button:has-text("MD")').click();
    
    page.on('dialog', async d => d.accept());
    await page.click('button:has-text("ENVIAR A COCINA")');
    
    // 2. Add Refresco (DRAFT)
    await page.click('button:has-text("BEBIDAS")');
    const sodaCard = page.locator('div.group').filter({ hasText: 'REFRESCO 600ML' });
    await sodaCard.locator('button').first().click({ force: true });
    
    // 3. Click Cerrar Cuenta
    await page.click('button:has-text("Cerrar Cuenta")');
    
    // Verify Warning Modal
    await expect(page.locator('h2:has-text("Productos Pendientes")')).toBeVisible();
    
    // 4. Descartar y Cobrar
    await page.click('button:has-text("Descartar y Cobrar")');
    
    // Verify Payment Modal Total is only the Pizza ($160)
    // Wait for the payment modal to show
    await expect(page.locator('h2:has-text("Cobrar Mesa #3")')).toBeVisible();
    const totalText = await page.locator('div.bg-black\\/40 span.text-7xl').textContent();
    expect(totalText).toBe('160');
    
    // Verify Refresco is GONE from the cart in the background/state
    // (Cart items are still rendered behind the modal or in the store)
    await expect(page.locator('h4:has-text("REFRESCO 600ML")')).not.toBeVisible();
  });

  test('Case 2: Enviar y Cobrar', async ({ page }) => {
    // 1. Open Mesa 4
    await page.click('button:has-text("#4")');
    
    // Add Pizza and Send
    await page.click('button:has-text("PIZZAS")');
    await page.locator('div.group').filter({ has: page.locator('h3', { hasText: /^Pepperoni$/ }) }).locator('button:has-text("MD")').click();
    page.on('dialog', async d => d.accept());
    await page.click('button:has-text("ENVIAR A COCINA")');
    
    // 2. Add Refresco (DRAFT)
    await page.click('button:has-text("BEBIDAS")');
    const sodaCard = page.locator('div.group').filter({ hasText: 'REFRESCO 600ML' });
    await sodaCard.locator('button').first().click({ force: true });
    
    // 3. Click Cerrar Cuenta
    await page.click('button:has-text("Cerrar Cuenta")');
    
    // 4. Enviar y Cobrar
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().endsWith('/orders') && req.method() === 'POST'),
      page.click('button:has-text("Enviar y Cobrar")')
    ]);
    
    // Verify API was called for the Refresco
    const payload = JSON.parse(request.postData() || '{}');
    expect(payload.items.length).toBe(1);
    expect(payload.items[0].price).toBe(30);
    
    // Verify Payment Modal Total is both ($190)
    await expect(page.locator('h2:has-text("Cobrar Mesa #4")')).toBeVisible();
    const totalText = await page.locator('div.bg-black\\/40 span.text-7xl').textContent();
    expect(totalText).toBe('190');
    
    // Verify both products are now in SENT status (grayed out)
    await expect(page.locator('h4:has-text("Pepperoni")')).toBeVisible();
    await expect(page.locator('h4:has-text("REFRESCO 600ML")')).toBeVisible();
  });
});
