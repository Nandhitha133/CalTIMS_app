const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    
    const admin = await prisma.user.findUnique({
      where: { email: 'superadmin@timesheetpro.com' }
    });
    
    if (admin) {
      console.log('Admin user found:', {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        organizationId: admin.organizationId
      });
    } else {
      console.log('Admin user NOT found.');
    }

    const allUsers = await prisma.user.findMany({
        take: 5,
        select: { email: true, role: true }
    });
    console.log('First 5 users:', allUsers);

  } catch (err) {
    console.error('Error checking user:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
