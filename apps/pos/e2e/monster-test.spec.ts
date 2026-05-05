import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

test('The Monster Test: Selling a dynamic product', async ({ page }) => {
  // 1. POS Login
  await page.goto('http://localhost:3000');
  for (const digit of '1234') {
    await page.click(`button:has-text("${digit}")`, { delay: 10, force: true });
  }

  // 2. Open Mesa #5
  await page.click('button:has-text("#5")');

  // 3. Navigate to SNACKS
  await page.click('button:has-text("SNACKS")');
  
  // Wait for the specific snack
  const menuGrid = page.locator('div.grid');
  const nachosCard = menuGrid.locator('div.group').filter({ hasText: 'Super Nachos King' });
  await expect(nachosCard).toBeVisible({ timeout: 10000 });
  
  const variantBandeja = nachosCard.locator('button:has-text("Bandeja")');
  await variantBandeja.click();

  // 6. Verify cart item
  const cartRow = page.locator('div.bg-zinc-900\\/40, div.bg-white\\/5').filter({ hasText: 'Super Nachos King' }).last();
  await expect(cartRow).toBeVisible();
  await expect(cartRow.locator('p:has-text("Bandeja")')).toBeVisible();
  
  // 7. Submit to Kitchen
  page.on('dialog', d => d.accept());
  await page.click('button:has-text("SOLICITAR")');
  
  // 8. Close Account
  await page.click('button:has-text("Cerrar Cuenta")');
  await page.click('button:has-text("Confirmar Pago")');

  // 9. Auditoría de Datos
  const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    // Check OrderItem
    const lastItem = await prisma.orderItem.findFirst({
      where: { product: { name: 'Super Nachos King' } },
      orderBy: { createdAt: 'desc' },
      include: { order: true }
    });

    console.log('Last OrderItem Audit:', lastItem);
    if (!lastItem || Number(lastItem.price) !== 200) {
      throw new Error(`Audit failed: Expected $200, got ${lastItem?.price}`);
    }

    // Check CashFlow - Using insensitive search and exact description pattern
    const lastCashFlow = await prisma.cashFlow.findFirst({
      where: { 
        description: { 
          contains: 'Mesa #5',
          mode: 'insensitive'
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Last CashFlow Audit:', lastCashFlow);
    if (!lastCashFlow || Number(lastCashFlow.amount) !== 200) {
      throw new Error(`Audit failed: Expected $200 in CashFlow, got ${lastCashFlow?.amount}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
});
