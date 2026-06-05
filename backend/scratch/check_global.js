const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGlobal() {
  try {
    const [projects, timesheets, employees, orgs] = await Promise.all([
      prisma.project.count(),
      prisma.timesheet.count(),
      prisma.employee.count(),
      prisma.organization.count()
    ]);
    
    console.log(`Global Stats:`);
    console.log(`Organizations: ${orgs}`);
    console.log(`Projects: ${projects}`);
    console.log(`Timesheets: ${timesheets}`);
    console.log(`Employees: ${employees}`);

  } catch (err) {
    console.error('Error checking global:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkGlobal();
