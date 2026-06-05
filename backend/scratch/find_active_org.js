const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findActiveOrg() {
  try {
    const orgsWithTimesheets = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { timesheets: true, projects: true }
        }
      }
    });
    
    console.log('Organizations with counts:');
    orgsWithTimesheets.forEach(o => {
      console.log(`${o.name} (${o.id}): ${o._count.projects} projects, ${o._count.timesheets} timesheets`);
    });

  } catch (err) {
    console.error('Error finding active org:', err);
  } finally {
    await prisma.$disconnect();
  }
}

findActiveOrg();
