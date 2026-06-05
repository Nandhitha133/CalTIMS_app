const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const orgId = '10c6ce96-ec44-4a1d-abe2-60701f7e5863';
    
    const [projects, timesheets, employees] = await Promise.all([
      prisma.project.count({ where: { organizationId: orgId } }),
      prisma.timesheet.count({ where: { organizationId: orgId } }),
      prisma.employee.count({ where: { organizationId: orgId } })
    ]);
    
    console.log(`Stats for Organization ${orgId}:`);
    console.log(`Projects: ${projects}`);
    console.log(`Timesheets: ${timesheets}`);
    console.log(`Employees: ${employees}`);

    const allOrgs = await prisma.organization.findMany({
        select: { id: true, name: true }
    });
    console.log('Available Organizations:', allOrgs);

  } catch (err) {
    console.error('Error checking data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
