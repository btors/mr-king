import { test, expect } from '@playwright/test';

test.describe('E2E Admin Products Usability & Stress', () => {
  const adminUrl = 'http://localhost:3000/admin/products';

  test.beforeEach(async ({ page }) => {
    await page.goto(adminUrl);
  });

  test('Acceso: Debe rechazar PIN incorrecto y aceptar 9999', async ({ page }) => {
    // Ingresar PIN incorrecto: 1234
    await page.getByRole('button', { name: '1' }).click({ delay: 50, force: true });
    await page.getByRole('button', { name: '2' }).click({ delay: 50, force: true });
    await page.getByRole('button', { name: '3' }).click({ delay: 50, force: true });
    await page.getByRole('button', { name: '4' }).click({ delay: 50, force: true });
 
    // Debe mostrar error
    await expect(page.getByText('Acceso Denegado')).toBeVisible();
 
    // Esperar a que se limpie (1 segundo)
    await page.waitForTimeout(1100);
 
    // Ingresar PIN correcto: 9999
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: '9' }).click({ delay: 50, force: true });
    }
 
    // Debe acceder al panel
    await expect(page.getByRole('heading', { name: 'Gestión de Productos' })).toBeVisible();
  });

  test('Creación Dinámica y Prueba Destructiva (Toggle)', async ({ page }) => {
    // Definimos el estado simulado (Mock DB)
    let mockProducts: any[] = [];
    
    // Mock /categories
    await page.route('**/categories', async (route) => {
      await route.fulfill({ json: [{ id: 'cat-1', name: 'Alimentos' }] });
    });

    // Mock GET /products
    await page.route('**/products', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: mockProducts });
      } else if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        const newProd = {
          id: 'mock-id-123',
          ...payload,
          price: parseFloat(payload.price),
        };
        mockProducts.push(newProd);
        await route.fulfill({ json: newProd, status: 201 });
      }
    });

    // Mock PATCH /products/*
    await page.route('**/products/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        const payload = route.request().postDataJSON();
        const urlSegments = route.request().url().split('/');
        const idToEdit = urlSegments[urlSegments.length - 1];
        mockProducts = mockProducts.map(p => p.id === idToEdit ? { ...p, ...payload } : p);
        await route.fulfill({ json: mockProducts.find(p => p.id === idToEdit) });
      }
    });

    // 1. Acceder con PIN
    for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: '9' }).click({ delay: 50, force: true });
    }
    await expect(page.getByRole('heading', { name: 'Gestión de Productos' })).toBeVisible();

    // 2. Click a Nuevo Producto
    await page.getByRole('button', { name: /Nuevo Producto/i }).click();

    // 3. Llenar formulario (Alitas, precio 100)
    await page.getByPlaceholder('Ej. Pizza Mexicana').fill('Alitas de Prueba');
    
    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('100');

    // 4. Activar allowMultipleSauces y verificar reacción
    await page.getByText('Múltiples Salsas').click();

    // Input maxSauces debería aparecer
    const maxSaucesInput = page.locator('input[type="number"]').nth(1);
    await expect(maxSaucesInput).toBeVisible();
    await maxSaucesInput.fill('2');

    // 5. Submit
    await page.getByRole('button', { name: /Guardar Producto/i }).click();

    // 6. Verificación Visual: Debe aparecer en la tabla
    const row = page.getByRole('row', { name: /Alitas de Prueba/i });
    await expect(row).toBeVisible();
    await expect(row.getByText('MULTISALSA (MAX 2)')).toBeVisible();
    await expect(row.getByText('ACTIVO')).toBeVisible();

    // 7. Prueba Destructiva: Cambiar isActive a falso
    const toggleButton = row.getByRole('button', { name: /Desactivar de Ventas/i });
    await toggleButton.click();

    // 8. Verificar que el estatus cambia a INACTIVO al instante sin F5
    await expect(row.getByText('INACTIVO')).toBeVisible();
  });
});
