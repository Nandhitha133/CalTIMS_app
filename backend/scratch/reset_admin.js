const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    const email = 'superadmin@timesheetpro.com';
    const password = 'SuperAdmin@1234';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, isActive: true },
      create: {
        email,
        password: hashedPassword,
        name: 'Super Administrator',
        role: 'super_admin',
        isActive: true,
        isOnboardingComplete: true
      }
    });
    
    console.log('Super admin password reset successful:', user.email);
  } catch (err) {
    console.error('Error resetting admin:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
