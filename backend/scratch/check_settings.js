const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
  try {
    const orgId = 'af4abf17-3f53-41ba-b402-6fc38af2cb89';
    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: orgId }
    });
    
    if (settings) {
      console.log('Settings found for org:', orgId);
      console.log(JSON.stringify(settings.data, null, 2));
    } else {
      console.log('Settings NOT found for org:', orgId);
    }

  } catch (err) {
    console.error('Error checking settings:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSettings();
