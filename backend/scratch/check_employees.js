const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployees() {
  try {
    const orgId = 'af4abf17-3f53-41ba-b402-6fc38af2cb89';
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { email: true, name: true } } }
    });
    
    console.log(`Employees for Org ${orgId}:`);
    employees.forEach(e => {
      console.log(`- ${e.user.name} (${e.user.email}): ID=${e.id}, Code=${e.employeeCode}`);
    });

  } catch (err) {
    console.error('Error checking employees:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployees();
