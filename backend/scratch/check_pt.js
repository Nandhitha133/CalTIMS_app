const { connectDB } = require('../src/config/database');
const PayrollPolicy = require('../src/modules/policyEngine/payrollPolicy.model');
require('dotenv').config({ path: '../.env' });

async function run() {
  await connectDB();
  const policy = await PayrollPolicy.findOne({ isActive: true }).lean();
  console.log('Active Policy statutory.pt:', JSON.stringify(policy?.statutory?.pt, null, 2));
  process.exit(0);
}
run().catch(console.error);
