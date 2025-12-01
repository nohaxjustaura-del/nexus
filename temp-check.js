const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const inv = await prisma.investor.findFirst();
  console.log(inv);
  await prisma.();
})();
