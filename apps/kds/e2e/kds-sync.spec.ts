import { test, expect } from '@playwright/test';

test('Kitchen receives order from POS in real-time', async ({ browser }) => {
  // 1. Create a context for POS
  const posContext = await browser.newContext();
  const posPage = await posContext.newPage();
  
  // 2. Create a context for KDS
  const kdsContext = await browser.newContext();
  const kdsPage = await kdsContext.newPage();
  
  // Go to POS and Login
  await posPage.goto('http://localhost:3000');
  
  // Enter PIN 1234 (Waiter)
  for (const digit of '1234') {
    await posPage.click(`button:has-text("${digit}")`, { delay: 100, force: true });
  }
  
  // Wait for navigation to TableView
  await expect(posPage.locator('h2:has-text("Mapa de Mesas")')).toBeVisible();

  // Select Table #1
  await posPage.click('button:has-text("#1")');
  
  // Wait for categories to load
  await posPage.waitForTimeout(2000);

  // Add a Burger
  await posPage.click('button:has-text("HAMBURGUESAS")');
  await posPage.getByText('SOLO').first().click({ force: true });
  
  // Verify it's in the cart before proceeding
  await expect(posPage.locator('h4:has-text("Sencilla")')).toBeVisible();
  
  // Open KDS
  await kdsPage.goto('http://localhost:3001');
  await kdsPage.waitForSelector('text=MR-KING KITCHEN');
  
  // Submit order in POS
  // Handle the alert
  posPage.on('dialog', async dialog => {
    console.log('Dialog opened:', dialog.message());
    await dialog.accept();
  });
  
  const finalizeBtn = posPage.locator('button:has-text("Finalizar Orden")');
  await expect(finalizeBtn).toBeEnabled();
  await finalizeBtn.click({ force: true });
  
  // Verify in KDS (Mesa 1 and Sencilla)
  const orderCard = kdsPage.locator('div:has-text("Mesa 1")').first();
  await expect(orderCard).toBeVisible({ timeout: 15000 });
  
  await expect(kdsPage.getByText('1x Sencilla').first()).toBeVisible();
  
  // Change status to Preparing
  const startBtn = kdsPage.locator('button:has-text("Comenzar Cocina")').first();
  await expect(startBtn).toBeVisible();
  await startBtn.click({ force: true, delay: 200 });
  
  // Verify Preparing state by presence of Ready button
  const readyBtn = kdsPage.locator('button:has-text("¡Orden Lista!")').first();
  await expect(readyBtn).toBeVisible({ timeout: 10000 });
  
  // Change status to Ready
  await readyBtn.click({ force: true, delay: 200 });
  
  // Verify Ready state by presence of Archivar button
  const archiveBtn = kdsPage.locator('button:has-text("Archivar Ticket")').first();
  await expect(archiveBtn).toBeVisible({ timeout: 10000 });
});
