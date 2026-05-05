import { test, expect } from '@playwright/test';

test('KDS Visual Sync Certification', async ({ page }) => {
  // 1. Login to POS
  await page.goto('http://localhost:3000');
  for (const digit of '1234') {
    await page.click(`button:has-text("${digit}")`, { delay: 100, force: true });
  }
  await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();

  // 2. Open Mesa 5
  await page.click('button:has-text("#5")');
  
  // 3. Add Pizza Mitad y Mitad
  await page.click('button:has-text("PIZZAS")');
  await page.click('button:has-text("MITAD Y MITAD")');
  
  // Select size (MD)
  await page.click('button:has-text("Mediana")');
  
  // Select first half (Pepperoni)
  await page.click('button:has-text("Pepperoni")');
  
  // Select second half (Hawaiana)
  await page.click('button:has-text("Hawaiana")');
  
  // Confirm
  await page.click('button:has-text("Confirmar Pizza!")');
  
  // 4. Add Alitas (12 pieces, 2 flavors)
  await page.click('button:has-text("ALITAS")');
  // Alitas 12 pieces card
  const alitas12 = page.locator('div.group').filter({ hasText: 'ALITAS 12 PZ' });
  await alitas12.locator('button:has-text("Toca para elegir sabor")').click({ force: true });
  
  // Select flavors (BBQ, Búfalo)
  await page.click('button:has-text("BBQ")');
  await page.click('button:has-text("Búfalo")');
  await page.click('button:has-text("Agregar ·")');
  
  // 5. Add Burger with Note "TEST: SIN SAL"
  await page.click('button:has-text("HAMBURGUESAS")');
  const burger = page.locator('div.group').filter({ hasText: 'SIRLOIN' });
  await burger.locator('button:has-text("Sencilla")').click();
  
  // Add note to the burger in the cart (right panel)
  const burgerCartItem = page.locator('div.bg-white\\/5, div.bg-zinc-900\\/40').filter({ hasText: 'SIRLOIN' }).last();
  await burgerCartItem.locator('input[placeholder="Instrucciones especiales..."]').fill('TEST: SIN SAL');
  
  // 6. Send Order
  page.on('dialog', async d => d.accept());
  await page.click('button:has-text("SOLICITAR")');
  
  // Wait a bit for processing
  await page.waitForTimeout(2000);
});
