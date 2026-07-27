import { prisma } from "../src/lib/prisma";

const PESO_COOKIE_RELLENA = 120;
const PESO_COOKIE_CLASICA = 40;

const COOKIES_CLASICAS = [
  "Cookie chip",
  "Cookie vainilla",
  "Cookie red velvet",
  "Cookie limón",
  "Cookie chocolate",
  "Cookie oreo",
  "Cookie franui",
];

const BROWNIES = ["Brownie clásico", "Brownie red velvet", "Brownie oreo"];

const ADMIN_EMAIL = "mesadulce.reposteria@gmail.com";

async function main() {
  let orden = 0;

  for (const nombre of COOKIES_CLASICAS) {
    await prisma.productVariety.upsert({
      where: { nombre },
      update: {},
      create: {
        nombre,
        categoria: "COOKIE_CLASICA",
        pesoUnitarioGramos: PESO_COOKIE_CLASICA,
        orden: orden++,
      },
    });
  }

  for (const nombre of BROWNIES) {
    await prisma.productVariety.upsert({
      where: { nombre },
      update: {},
      create: {
        nombre,
        categoria: "BROWNIE",
        pesoUnitarioGramos: null,
        orden: orden++,
      },
    });
  }

  // La única variedad "rellena" de referencia del negocio; se puede ampliar
  // desde el panel de administración con otros sabores rellenos a futuro.
  await prisma.productVariety.upsert({
    where: { nombre: "Cookie rellena" },
    update: {},
    create: {
      nombre: "Cookie rellena",
      categoria: "COOKIE_RELLENA",
      pesoUnitarioGramos: PESO_COOKIE_RELLENA,
      orden: orden++,
    },
  });

  const varieties = await prisma.productVariety.findMany();
  for (const variety of varieties) {
    const etapas =
      variety.categoria === "BROWNIE"
        ? (["BROWNIE_PORCIONES"] as const)
        : variety.categoria === "COOKIE_RELLENA"
          ? (["CRUDO", "HORNEADO_CONGELADO"] as const)
          : (["CRUDO"] as const);

    for (const etapa of etapas) {
      await prisma.stock.upsert({
        where: { varietyId_etapa: { varietyId: variety.id, etapa } },
        update: {},
        create: { varietyId: variety.id, etapa, cantidad: 0 },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Administrador Mesa Dulce",
      role: "ADMIN",
      isAuthorized: true,
    },
  });

  console.log("Seed completo: variedades, stock inicial y usuario admin listos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
