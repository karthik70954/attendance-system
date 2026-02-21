const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const manager = await prisma.manager.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      name: 'Store Manager',
      email: 'admin@store.com',
      password: hashedPassword,
    },
  });

  console.log('✅ Manager created:', manager.email);
  console.log('✅ Password: admin123');
  console.log('⚠️  Change your password after first login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
