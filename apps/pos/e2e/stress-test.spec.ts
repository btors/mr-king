import { test, expect } from '@playwright/test';

test.describe('Prueba de Estrés de Hora Pico', () => {
  
  test('Monkey Testing: 50 items and Race Conditions', async ({ page }) => {
    test.setTimeout(60000);
    
    // Login
    await page.goto('http://localhost:3000');
    for (const digit of '1234') {
      await page.click(`button:has-text("${digit}")`, { delay: 10, force: true });
    }

    // Open Mesa 6
    await page.click('button:has-text("#6")');
    
    // Add 50 products rapidly
    await page.click('button:has-text("SNACKS")');
    const snackButton = page.locator('div.group').filter({ hasText: 'PAPAS A LA FRANCESA' }).locator('button').first();
    
    for (let i = 0; i < 50; i++) {
      await snackButton.click({ force: true });
    }
    
    // Verify quantity in cart
    const qty = await page.locator('span.w-8.text-center').innerText();
    expect(qty).toBe('50');

    // Simulate rapid submission
    page.on('dialog', d => d.accept());
    
    const submitBtn = page.getByRole('button', { name: /SOLICITAR/i });
    const payBtn = page.getByRole('button', { name: /Cerrar Cuenta/i });
    
    // Delay response
    await page.route('**/orders', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await submitBtn.click();
    
    // Check for spinner - using a class-based selector
    await expect(page.locator('.animate-spin')).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    
    // Attempt to click pay while submitting
    await payBtn.click({ force: true }); 
    const paymentModal = page.locator('h3:has-text("Finalizar Cuenta")');
    await expect(paymentModal).not.toBeVisible();
    
    await page.waitForTimeout(3000);
  });

  test('KDS Recovery Audit: Catch-up on Reconnect', async ({ page, context }) => {
    // 1. Send an order from POS
    await page.goto('http://localhost:3000');
    for (const digit of '1234') {
      await page.click(`button:has-text("${digit}")`, { force: true });
    }
    await page.click('button:has-text("#3")');
    await page.click('button:has-text("SNACKS")');
    await page.locator('div.group').filter({ hasText: 'PAPAS A LA FRANCESA' }).locator('button').first().click();
    
    page.on('dialog', d => d.accept());
    await page.click('button:has-text("SOLICITAR")');

    // 2. Open KDS and wait for order
    const kdsPage = await context.newPage();
    await kdsPage.goto('http://localhost:3001');
    await expect(kdsPage.locator('h3:has-text("MESA 3")')).toBeVisible();

    // 3. Simulate KDS blackout
    await kdsPage.route('**/*', route => route.abort('failed'));
    
    // 4. Send ANOTHER order
    await page.click('button:has-text("Mesas")');
    await page.click('button:has-text("#2")');
    await page.click('button:has-text("BEBIDAS")');
    await page.locator('div.group').filter({ hasText: 'COCA COLA' }).locator('button').first().click();
    await page.click('button:has-text("SOLICITAR")');

    // 5. Restore KDS and verify catch-up
    await kdsPage.unroute('**/*');
    await kdsPage.reload(); 
    await expect(kdsPage.locator('h3:has-text("MESA 2")')).toBeVisible();
    await expect(kdsPage.locator('h3:has-text("MESA 3")')).toBeVisible();
  });
});
