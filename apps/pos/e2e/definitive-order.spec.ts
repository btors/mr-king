import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test('Definitive Order Flow: Pizza Half-and-Half + Burger Combo', async ({ page }) => {
  // Go to POS
  await page.goto('http://localhost:3000');
  
  // Login as Waiter (PIN 1234)
  for (const digit of '1234') {
    await page.click(`button:has-text("${digit}")`, { delay: 100, force: true });
  }
  
  // Wait for Table Map
  await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();

  // Select Table #1
  await page.click('button:has-text("#1")');
  
  // 1. Add Pizza Mitad y Mitad
  await page.click('button:has-text("PIZZAS")');
  await page.click('button:has-text("MITAD Y MITAD")');
  
  // Select Size MD
  await page.click('button:has-text("Mediana")');
  
  // Select Flavor A: Pepperoni (Price $160)
  await page.click('button:has-text("Pepperoni")');
  
  // Select Flavor B: La Mr King (Price $190)
  // Note: Step should automatically move to B after A
  await page.click('button:has-text("La Mr King")');
  
  // Confirm Pizza
  // Expected Price: max(160, 190) + 15 = 205
  await expect(page.locator('span:has-text("205")')).toBeVisible();
  await page.click('button:has-text("Confirmar Pizza!")');

  // 2. Add Burger Combo
  await page.click('button:has-text("HAMBURGUESAS")');
  
  // Click "+ Papas" on Sencilla ($60 + $20 = $80)
  // We use the .group class which is unique to product cards in MenuView
  const sencillacard = page.locator('div.group').filter({ has: page.locator('h3', { hasText: /^Sencilla$/ }) });
  await sencillacard.getByRole('button', { name: '+ Papas' }).click();

  // Verify Cart Total
  // 205 + 80 = 285
  await expect(page.locator('span:has-text("285")')).toBeVisible();
  
  // 3. Finalize Order
  // Handle the alert
  let alertMessage = '';
  page.on('dialog', async dialog => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  
  await page.click('button:has-text("Finalizar Orden")');
  
  // Verify Alert
  // The code in usePOSStore/OrderSidebar might show a generic browser alert or a custom one.
  // In the previous sessions, I saw "Orden enviada a cocina!".
  // Let's wait a bit for the dialog to trigger.
  await page.waitForTimeout(1000);
  expect(alertMessage).toBe('Orden enviada a cocina!');
  
  // 4. Verify in DB
  // I will use a separate script or command to verify DB, 
  // but I'll add a placeholder comment here if I were to use Prisma in test.
  console.log('Order submitted successfully. Verifying in DB...');
});
