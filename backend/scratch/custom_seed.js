const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedData() {
  const orgId = 'af4abf17-3f53-41ba-b402-6fc38af2cb89';
  const superAdminId = 'b68105c5-afa6-4613-a988-d1dcfa51762e';
  const johnId = '90af24ac-9a87-475e-b0e6-5b2e680e7a16';

  console.log('Starting custom seed...');

  try {
    // 1. Create Projects
    const project1 = await prisma.project.upsert({
      where: { organizationId_code: { organizationId: orgId, code: 'PRJ-001' } },
      update: {},
      create: {
        name: 'Internal Development',
        code: 'PRJ-001',
        description: 'CalTIMS Internal Development',
        organizationId: orgId,
        managerId: superAdminId,
        status: 'ACTIVE'
      }
    });

    const project2 = await prisma.project.upsert({
      where: { organizationId_code: { organizationId: orgId, code: 'PRJ-002' } },
      update: {},
      create: {
        name: 'Client Support',
        code: 'PRJ-002',
        description: 'Customer Support and Maintenance',
        organizationId: orgId,
        managerId: superAdminId,
        status: 'ACTIVE'
      }
    });

    console.log('Projects created.');

    // 2. Create Timesheets for Super Admin
    const today = new Date();
    const timesheetData = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      timesheetData.push({
        employeeId: superAdminId,
        projectId: project1.id,
        organizationId: orgId,
        workDate: date,
        hours: 8,
        description: `Development work on day ${i}`,
        status: 'APPROVED'
      });
    }

    // 3. Create Timesheets for John
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      timesheetData.push({
        employeeId: johnId,
        projectId: project2.id,
        organizationId: orgId,
        workDate: date,
        hours: 4,
        description: `Support ticket handling ${i}`,
        status: 'PENDING'
      });
    }

    await prisma.timesheet.createMany({
      data: timesheetData
    });

    console.log(`Created ${timesheetData.length} timesheets.`);

    // 4. Create some Announcements
    await prisma.announcement.create({
        data: {
            title: 'Welcome to CalTIMS!',
            content: 'We are excited to have you on board. Start tracking your time today!',
            organizationId: orgId,
            authorId: '06a107a9-5868-42ae-8e31-3ecd267247a1', // Super Admin User ID
            isActive: true
        }
    });

    console.log('Seed completed successfully.');

  } catch (err) {
    console.error('Error during seed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
