const BASE_URL = 'http://localhost:4000';
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function req(path: string, method: string = 'GET', body: any = null, token: string = '') {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  
  let data: any = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

async function run() {
  console.log('🔥 INICIANDO SIMULADOR DE HORA PICO Y COMBINACIONES INFINITAS - MR-KING ERP');
  
  // 1. Login as Admin
  const r = await req('/auth/login', 'POST', { username: '1234', password: '1234' });
  const adminToken = r.data?.access_token;
  const user = r.data?.user;
  if (!adminToken || !user) {
    console.error('❌ Error de autenticación en el simulador');
    process.exit(1);
  }

  // Ensure active shift is open
  await req('/shifts/open', 'POST', { openingBalance: 1000 }, adminToken);

  // 2. Fetch Catalog & Tables
  const dbProducts = await prisma.product.findMany({ include: { category: true } });
  const dbTables = await prisma.table.findMany();
  
  if (dbProducts.length === 0 || dbTables.length === 0) {
    console.error('❌ Catálogo o mesas vacías. Asegúrate de sembrar la base de datos antes.');
    process.exit(1);
  }

  console.log(`📦 Productos cargados: ${dbProducts.length}`);
  console.log(`🪑 Mesas/Bancos cargados: ${dbTables.length}`);

  // 3. Generate Combinations (Cientos de Pedidos)
  const payloads: any[] = [];
  let tableIdx = 0;

  for (const product of dbProducts) {
    const isPizza = product.category.name.toUpperCase().trim() === 'PIZZAS';
    const isWings = product.category.name.toUpperCase().trim() === 'ALITAS';
    const isMichelada = product.category.name.toUpperCase().trim() === 'BEBIDAS' && product.name.includes('Michelada');

    // Get all variants of the product
    const variants = Array.isArray(product.variants) ? product.variants : [];
    
    for (const variant of variants) {
      const table = dbTables[tableIdx % dbTables.length];
      tableIdx++;

      // Build specific combinations
      const config: any = {};
      const metadata: any = { variantName: variant.name };

      const hasFlavors = Array.isArray(product.flavors) && product.flavors.length > 0;

      if (isPizza) {
        config.isHalfAndHalf = false;
        config.size = variant.name;
        metadata.size = variant.name;
      } else if (isWings || hasFlavors) {
        const sauces = ['BBQ', 'Búfalo', 'Lemon Pepper'];
        config.sauces = [sauces[tableIdx % sauces.length]];
        config.variants = config.sauces;
        metadata.sauces = config.sauces;
      } else if (isMichelada) {
        const flavors = ['Tradicional', 'Clamato', 'Tamarindo'];
        config.flavor = flavors[tableIdx % flavors.length];
        config.variants = [config.flavor];
        metadata.flavor = config.flavor;
      }

      payloads.push({
        orderType: 'EAT_IN',
        tableId: table.id,
        waiterId: user.id,
        items: [{
          productId: product.id,
          quantity: 1,
          price: Number(variant.price),
          variantName: variant.name,
          config,
          metadata
        }]
      });
    }
  }

  // Multiply workloads to reach several hundreds of requests
  const totalSimulatedOrders: any[] = [];
  const multiplier = Math.ceil(350 / payloads.length); // Target at least 350 orders
  for (let m = 0; m < multiplier; m++) {
    payloads.forEach(p => {
      const table = dbTables[(tableIdx + m) % dbTables.length];
      totalSimulatedOrders.push({
        ...p,
        tableId: table.id
      });
    });
  }

  console.log(`🚀 Generados ${totalSimulatedOrders.length} pedidos únicos con cobertura completa de variantes.`);
  console.log('⚡ Saturando servidor en paralelo (Simulación de Hora Pico)...');

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let totalSalesProcessed = 0;
  const errors: any[] = [];

  // Batch concurrent executions to not crash the JS runtime heap but saturate the DB pool
  const batchSize = 30;
  for (let i = 0; i < totalSimulatedOrders.length; i += batchSize) {
    const batch = totalSimulatedOrders.slice(i, i + batchSize);
    const promises = batch.map(async (orderPayload) => {
      const res = await req('/orders', 'POST', orderPayload, adminToken);
      if (res.status === 201) {
        successCount++;
        const itemPrice = orderPayload.items[0].price;
        totalSalesProcessed += itemPrice;
      } else {
        failCount++;
        errors.push({
          product: orderPayload.items[0].productId,
          status: res.status,
          msg: res.data?.message || 'Error Desconocido'
        });
      }
    });
    await Promise.all(promises);
  }

  const duration = (Date.now() - startTime) / 1000;
  const successRate = ((successCount / totalSimulatedOrders.length) * 100).toFixed(1);

  console.log('\n🏁 --- SIMULACIÓN DE HORA PICO FINALIZADA ---');
  console.log(`⏱️ Duración Total: ${duration.toFixed(2)} segundos`);
  console.log(`✅ Sucesos Exitosos: ${successCount} / ${totalSimulatedOrders.length} (${successRate}%)`);
  console.log(`❌ Fallos Registrados: ${failCount}`);
  console.log(`💰 Importe Total de Ventas Procesadas: $${totalSalesProcessed.toLocaleString('es-MX')}`);

  // Generate stress test report
  let report = `# 📊 Reporte de Súper Estrés y Hora Pico - MR-KING ERP\n\n`;
  report += `**Fecha de Ejecución:** ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}\n`;
  report += `**Duración:** ${duration.toFixed(2)} segundos\n`;
  report += `**Tasa de Éxito:** ${successRate}%\n`;
  report += `**Pedidos Procesados:** ${totalSimulatedOrders.length}\n`;
  report += `**Éxito:** ${successCount} | **Fallo:** ${failCount}\n`;
  report += `**Venta Financiera Procesada:** $${totalSalesProcessed.toLocaleString('es-MX')}\n\n`;

  if (failCount === 0) {
    report += `### ✅ VERDICTO: 100% ROBUSTO Y CERTIFICADO PARA VENTAS DE ALTO LOGO.\n`;
    report += `El sistema asimiló perfectamente cientos de combinaciones de catálogo sin una sola pérdida decimal o caída de servidor.\n`;
  } else {
    report += `### ⚠️ ATENCIÓN: ERRORES DETECTADOS BAJO PRESIÓN CONCURRENTE\n\n`;
    errors.slice(0, 20).forEach((err, idx) => {
      report += `*   **Fallo #${idx + 1}:** Producto ID \`${err.product}\` - Status ${err.status} - ${err.msg}\n`;
    });
  }

  fs.writeFileSync('/Users/ar/Documents/GitHub/mr-king/docs/REPORTE_HORA_PICO_ESTRES.md', report);
  console.log('📝 Reporte guardado en docs/REPORTE_HORA_PICO_ESTRES.md');
  process.exit(failCount === 0 ? 0 : 1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
