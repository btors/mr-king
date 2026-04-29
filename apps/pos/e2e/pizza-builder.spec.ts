import { test, expect } from '@playwright/test';

test('pizza builder flow', async ({ page }) => {
  // Go to the POS login page
  await page.goto('http://localhost:3000');

  // Login using Keypad (9999 is Admin PIN)
  for (const digit of '9999') {
    await page.click(`button:has-text("${digit}")`, { delay: 100, force: true });
  }

  // Wait for navigation to TableView
  await expect(page.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();

  // Select Table #1
  await page.click('button:has-text("#1")');

  // Wait for categories to load
  await page.waitForTimeout(2000);

  // Ensure we are in PIZZAS category
  await page.click('button:has-text("PIZZAS")');
  await expect(page.locator('h2:has-text("PIZZAS")')).toBeVisible();

  // Open Pizza Builder
  await page.click('button:has-text("Mitad y Mitad")');
  const modal = page.locator('div.fixed.inset-0');

  // Step 1: Select size GD (Grande)
  await modal.getByText('Grande', { exact: true }).click({ force: true });
  await page.waitForTimeout(500);

  // Step 2: Select Mitad A - Pepperoni
  await modal.locator('button:has-text("Pepperoni")').first().click({ force: true });
  await page.waitForTimeout(800);
  
  // Wait for the main selection header to specifically show Mitad B (excluding sidebar)
  await expect(modal.locator('h3:has-text("Seleccionar sabor para") >> text=B')).toBeVisible();

  // Step 3: Select Mitad B - La Mr King
  await modal.locator('button:has-text("La Mr King")').first().click({ force: true });
  await page.waitForTimeout(1000);

  // Verify that the final price is $205 (max(160, 190) + 15)
  await expect(modal.locator('div:has-text("Precio Final") >> text=205')).toBeVisible();

  // Confirm the selection
  await modal.locator('button:has-text("Confirmar Pizza!")').click({ force: true });

  // Wait for modal to close
  await expect(modal).not.toBeVisible();

  // Verify it was added to the cart
  await expect(page.locator('text=Mitad y Mitad (GD)')).toBeVisible();
  await expect(page.locator('footer').getByText('$205.00')).toBeVisible();
});
