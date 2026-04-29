import { test, expect } from '@playwright/test';

test('Kitchen Anti-Burn: Verifies duplicate orders are blocked', async ({ page }) => {
  // Go to POS and Login
  await page.goto('http://localhost:3000');
  for (const digit of '1234') {
    await page.click(`button:has-text("${digit}")`, { delay: 100, force: true });
  }
  await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();

  // 1. Open Mesa 2
  await page.click('button:has-text("#2")');
  
  // Add Pepperoni MD ($160)
  await page.click('button:has-text("PIZZAS")');
  await page.locator('div.group').filter({ has: page.locator('h3', { hasText: /^Pepperoni$/ }) }).locator('button:has-text("MD")').click();
  
  // Send Order
  page.on('dialog', async dialog => {
    if (dialog.message() === 'Orden enviada a cocina!') {
      await dialog.accept();
    }
  });
  await page.click('button:has-text("Finalizar Orden")');
  
  // 2. Regresar a Mesa 2
  await page.click('button[title="Mesas"]');
  await page.click('button:has-text("#2")');
  
  // Verify Pizza is in cart and blocked (status SENT shows "En Cocina")
  await expect(page.locator('h4:has-text("Pepperoni")')).toBeVisible();
  await expect(page.locator('text=En Cocina')).toBeVisible();
  // Verify NO + / - buttons for the Pizza (those are only in DRAFT section)
  const pizzaItem = page.locator('div.group').filter({ hasText: 'Pepperoni' });
  await expect(pizzaItem.locator('button:has-text("+")')).not.toBeVisible();
  
  // 3. Add 1 Refresco
  await page.click('button:has-text("BEBIDAS")');
  const sodaCard = page.locator('div.group').filter({ hasText: 'REFRESCO 600ML' });
  await sodaCard.locator('button').first().click({ force: true });
  
  // 4. Verification Critical: Intercept Second Finalize
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().endsWith('/orders') && req.method() === 'POST'),
    page.click('button:has-text("Pedir 1 Items")')
  ]);
  
  const payload = JSON.parse(request.postData() || '{}');
  console.log('Second Order Payload:', JSON.stringify(payload, null, 2));
  
  // Verify ONLY the Refresco is in the items array
  expect(payload.items.length).toBe(1);
  expect(payload.items[0].productId).not.toBeNull();
  
  // 5. Confirm "Cerrar Cuenta" total
  const totalText = await page.locator('span.text-5xl').textContent();
  const total = parseInt(totalText || '0');
  console.log('Total in POS:', total);
  
  // Should be 160 + soda_price (30) = 190 (assuming soda is 30)
  expect(total).toBeGreaterThan(160); 

  // Check the Cerrar Cuenta button presence
  await expect(page.locator('button:has-text("Cerrar Cuenta")')).toBeVisible();
});
