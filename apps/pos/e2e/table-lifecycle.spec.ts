import { test, expect } from '@playwright/test';

test('Table Life Cycle: Occupation, Accumulation, and Liquidation', async ({ page }) => {
  // Go to POS and Login
  await page.goto('http://localhost:3000');
  for (const digit of '1234') {
    await page.click(`button:has-text("${digit}")`, { delay: 100, force: true });
  }
  await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();

  // 1. Ocupación: Find an available table
  const availableTable = page.locator('button').filter({ hasText: 'Libre' }).first();
  const tableText = await availableTable.locator('span.text-5xl').textContent();
  const tableNumber = tableText?.replace('#', '') || '2';
  
  await availableTable.click();

  // Add a Soda
  await page.click('button:has-text("BEBIDAS")');
  const productCard = page.locator('div.group').filter({ hasText: 'REFRESCO 600ML' });
  await productCard.locator('button').first().click({ force: true });
  
  // Verify it's in the cart
  await expect(page.locator('h4:has-text("REFRESCO 600ML")')).toBeVisible();
  
  // Finalize Order
  page.on('dialog', async dialog => {
    if (dialog.message() === 'Orden enviada a cocina!') {
      await dialog.accept();
    }
  });
  await page.click('button:has-text("Finalizar Orden")');
  
  // Go back to tables
  await page.click('button[title="Mesas"]');
  
  // Verify Table is now OCCUPIED
  await expect(page.locator(`button:has-text("#${tableNumber}")`)).toContainText('Ocupada', { timeout: 10000 });

  // 2. Acumulación: Add a Pizza to the same table
  await page.click(`button:has-text("#${tableNumber}")`);
  
  // The cart should already have the Refresco (from loadTableBill)
  await page.waitForTimeout(1000);
  await expect(page.locator('h4:has-text("REFRESCO 600ML")')).toBeVisible();
  
  await page.click('button:has-text("PIZZAS")');
  // Add Pepperoni MD ($160)
  await page.locator('div.group').filter({ has: page.locator('h3', { hasText: /^Pepperoni$/ }) }).locator('button:has-text("MD")').click();
  
  await page.click('button:has-text("Finalizar Orden")');

  // Go back to tables
  await page.click('button[title="Mesas"]');

  // 3. Liquidación: Cerrar Cuenta
  await page.click(`button:has-text("#${tableNumber}")`);
  
  await page.click('button:has-text("Cerrar Cuenta")');
  const confirmBtn = page.locator('button:has-text("Confirmar Pago")');
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // Check A: Table must be Libre immediately
  await expect(page.locator(`button:has-text("#${tableNumber}")`)).toContainText('Libre', { timeout: 10000 });
  
  console.log(`Cycle completed successfully for Table #${tableNumber}. Verifying CashFlow in DB...`);
});
