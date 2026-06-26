/**
 * CENTRALIZED STATUTORY COMPLIANCE ENGINE
 * Rules driven by Indian Government Statutory Norms
 */

export const calculatePF = (ctc, daSalary = 0, policy) => {
  if (!policy?.enabled) return { employeePF: 0, employerEPF: 0, employerEPS: 0, totalEmployer: 0 };

  const { employeePercent, employeeRate = 12 } = policy;
  
  const totalBase = (ctc || 0) + (daSalary || 0);

  // Employee Contribution
  const rate = employeePercent !== undefined ? employeePercent : employeeRate;
  const employeePF = Math.round(totalBase * (rate / 100));

  return {
    employeePF,
    employerEPF: 0,
    employerEPS: 0,
    totalEmployer: 0
  };
};

export const calculateESI = (grossSalary, policy, hasPriorEligibility = false) => {
  if (!policy?.enabled) return { employeeESI: 0, employerESI: 0, isEligible: false };

  const { employeeRate = 0.75, employerRate = 3.25, wageLimit = 21000 } = policy;

  // Eligibility Rule: Gross <= Limit OR already eligible in current contribution period
  const isEligible = (grossSalary <= wageLimit) || hasPriorEligibility;

  if (!isEligible) return { employeeESI: 0, employerESI: 0, isEligible: false };

  const employeeESI = Math.ceil(grossSalary * (employeeRate / 100)); // ESI rounded up to next rupee
  const employerESI = Math.ceil(grossSalary * (employerRate / 100));

  return { employeeESI, employerESI, isEligible: true };
};

export const calculatePT = (grossSalary, policy, monthIndex = 0) => {
  if (!policy?.enabled || !policy.slabs) return 0;

  const { slabs = [], state = "MH", mode = "MONTHLY" } = policy;

  const slab = slabs.find((s) => {
    const min = parseFloat(s.min) || 0;
    const max = s.max !== undefined && s.max !== null && s.max !== '' ? parseFloat(s.max) : null;
    return grossSalary >= min && (max === null || max === 0 || grossSalary <= max);
  });

  if (!slab) return 0;

  let amount = slab.amount;

  // Generic Month Overrides Support
  if (slab.overrides && slab.overrides[monthIndex] !== undefined) {
    amount = slab.overrides[monthIndex];
  } else {
    // Legacy Maharashtra February Rule (Applies only in MONTHLY mode or if specifically requested)
    if (state === "MH" && mode === "MONTHLY" && monthIndex === 1) {
      // 1 is February
      if (amount === 200) amount = 300;
    }
  }

  return amount;
};

export const calculateGratuity = (ctc, policy) => {
  if (!policy?.enabled) return 0;
  const percent = policy.employeePercent !== undefined ? policy.employeePercent : (policy.employeeRate !== undefined ? policy.employeeRate : 4.86);
  return Math.round(ctc * (percent / 100));
};

export const calculateRetirement = (basicSalary, policy) => {
  if (!policy?.enabled) return 0;
  const percent = policy.employeePercent !== undefined ? policy.employeePercent : (policy.employeeRate !== undefined ? policy.employeeRate : 5.0);
  return Math.round(basicSalary * (percent / 100));
};

export const complianceEngine = {
  calculatePF,
  calculateESI,
  calculatePT,
  calculateGratuity,
  calculateRetirement
};
