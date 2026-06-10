// src/screens/payrollUtils.ts

export const ROLE_TEMPLATES: Record<string, any> = {
  employee: {
    earnings: [
      { name: 'Basic Salary', value: 50, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'House Rent Allowance', value: 20, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'Special Allowance', value: 30, calculationType: 'Percentage', basedOn: 'CTC' },
    ],
    deductions: [
      { name: 'Provident Fund', value: 12, calculationType: 'Percentage', basedOn: 'Basic Salary' },
      { name: 'Professional Tax', value: 200, calculationType: 'Fixed' },
    ],
  },
  intern: {
    earnings: [
      { name: 'Stipend', value: 100, calculationType: 'Percentage', basedOn: 'CTC' },
    ],
    deductions: [],
  },
  manager: {
    earnings: [
      { name: 'Basic Salary', value: 40, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'House Rent Allowance', value: 20, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'Special Allowance', value: 30, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'Bonus', value: 10, calculationType: 'Percentage', basedOn: 'CTC' },
    ],
    deductions: [
      { name: 'Provident Fund', value: 12, calculationType: 'Percentage', basedOn: 'Basic Salary' },
      { name: 'Professional Tax', value: 200, calculationType: 'Fixed' },
    ],
  },
};

export const calculateSalaryBreakdown = (
  earnings: any[],
  deductions: any[],
  monthlyCTC: number,
  policyConfig: any
) => {
  let grossPay = 0;
  let totalDeductions = 0;
  let basicSalary = 0;

  // Process Earnings
  const calculatedEarnings = earnings.map(e => {
    let calculatedValue = 0;
    if (e.calculationType === 'Fixed') {
      calculatedValue = parseFloat(e.value || 0);
    } else if (e.calculationType === 'Percentage') {
      // Simplified: basedOn basic salary uses basicSalary if it was calculated first
      const base = e.basedOn === 'Basic Salary' ? basicSalary : monthlyCTC;
      calculatedValue = (parseFloat(e.value || 0) / 100) * base;
    }
    grossPay += calculatedValue;
    if (e.name === 'Basic Salary') {
      basicSalary = calculatedValue;
    }
    return { ...e, calculatedValue };
  });

  // Process Deductions
  const calculatedDeductions = deductions.map(d => {
    let calculatedValue = 0;
    if (d.calculationType === 'Fixed') {
      calculatedValue = parseFloat(d.value || 0);
    } else if (d.calculationType === 'Percentage') {
      const base = d.basedOn === 'Basic Salary' ? basicSalary : (d.basedOn === 'Gross' ? grossPay : monthlyCTC);
      calculatedValue = (parseFloat(d.value || 0) / 100) * base;
    }
    totalDeductions += calculatedValue;
    return { ...d, calculatedValue };
  });

  // Statutory Mock
  const statutoryDeductions: any[] = [];
  const employerContributions: any[] = [];

  // PF logic (mocked)
  if (policyConfig?.statutory?.pf?.enabled && policyConfig?.profile?.pf?.enabled !== false) {
    const pfValue = (12 / 100) * basicSalary;
    statutoryDeductions.push({ name: 'Provident Fund', calculatedValue: pfValue, includeInCTC: true });
    totalDeductions += pfValue;
  }

  // ESI logic (mocked)
  if (policyConfig?.statutory?.esi?.enabled && policyConfig?.profile?.esi?.enabled !== false) {
    const esiValue = (0.75 / 100) * grossPay;
    statutoryDeductions.push({ name: 'ESI', calculatedValue: esiValue, includeInCTC: true });
    totalDeductions += esiValue;
  }

  // PT logic (mocked)
  if (policyConfig?.statutory?.pt?.enabled && policyConfig?.profile?.pt?.enabled !== false) {
    const ptValue = grossPay > 15000 ? 200 : 0; // standard mock rule
    if (ptValue > 0) {
      statutoryDeductions.push({ name: 'Professional Tax', calculatedValue: ptValue, includeInCTC: false });
      totalDeductions += ptValue;
    }
  }

  return {
    earnings: calculatedEarnings,
    deductions: calculatedDeductions,
    statutoryDeductions,
    employerContributions,
    grossPay,
    totalDeductions,
    netPay: grossPay - totalDeductions,
  };
};
