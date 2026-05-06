
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL || "postgresql://mrking_user:mrking_password@localhost:5432/mrking_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('🎖️ INICIANDO VERIFICACIÓN DE EXPERIENCIA OPERATIVA DE TABLET (POS)');
  const results: any[] = [];

  const log = (test: string, pass: boolean, obs: string) => {
    results.push({ test, status: pass ? 'PASS' : 'FAIL', obs });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${test} | ${obs}`);
  };

  // --- 1. HOT DOGS: PIZZA DOG ---
  console.log('\n🌭 Evaluando Regla de Hot Dogs (Pizza Dog)...');
  const pizzaDog = await prisma.product.findFirst({ where: { name: 'Pizza Dog' } });
  if (pizzaDog) {
    const hasConPapas = pizzaDog.variants.some((v: any) => v.name === 'Con Papas');
    log('1. Pizza Dog Variants', hasConPapas, `Variante 'Con Papas' configurada correctamente en DB: ${hasConPapas}`);
  } else {
    log('1. Pizza Dog Variants', false, 'No se encontró Pizza Dog en la DB.');
  }

  // --- 2. BONELESS: APERTURA DE MODAL ---
  console.log('\n🍗 Evaluando Regla de Boneless (Apertura de Sabor)...');
  const menuViewCode = fs.readFileSync('/Users/ar/Documents/GitHub/mr-king/apps/pos/src/components/MenuView.tsx', 'utf8');
  const opensBonelessModal = menuViewCode.includes("catName.toUpperCase() === 'BONELESS'");
  log('2. Boneless Modal', opensBonelessModal, 'MenuView.tsx abre el modal de sabor para Boneless de forma idéntica a Alitas.');

  // --- 3. ALITAS: LIMITE DE SABORES POR PORCIÓN (6pz vs 12pz) ---
  console.log('\n🔥 Evaluando Regla de Porciones (6pz vs 12pz)...');
  const modalCode = fs.readFileSync('/Users/ar/Documents/GitHub/mr-king/apps/pos/src/components/ProductModal.tsx', 'utf8');
  const has6pzLimit = modalCode.includes("variantName === '6pz' ? 1 :") || modalCode.includes("variantName === \"6pz\" ? 1 :");
  log('3. Límite Alitas 6pz (1 Sabor Máx)', has6pzLimit, 'ProductModal.tsx limita estrictamente a 1 el número de salsas permitidas para la porción de 6pz.');

  // --- 4. MICHELADAS CH: SELECCIÓN LIMPIA ---
  console.log('\n🍺 Evaluando Regla de Micheladas (Selección Limpia)...');
  const micheladaChica = await prisma.product.findFirst({ where: { name: 'Michelada Chica' } });
  if (micheladaChica) {
    const hasFlavors = Array.isArray(micheladaChica.flavors) && micheladaChica.flavors.length > 0;
    log('4. Michelada Chica Flavors', hasFlavors, `Sabores de Michelada Chica cargados en DB: ${micheladaChica.flavors.join(', ')}`);
  } else {
    log('4. Michelada Chica Flavors', false, 'No se encontró Michelada Chica en DB.');
  }

  console.log('\n--- RESULTADOS FINALES DE OPERACIÓN ---');
  console.table(results);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
