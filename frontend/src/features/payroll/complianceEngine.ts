// src/features/payroll/complianceEngine.ts

export const complianceEngine = {
  calculatePF: (basic: number, da: number, config: any) => {
    if (!config || !config.enabled) {
      return { employeePF: 0, employerEPS: 0, employerEPF: 0, totalEmployer: 0 };
    }

    const wage = basic + da;
    const ceiling = 15000;
    const pfWage = config.restrictToCeiling ? Math.min(wage, ceiling) : wage;

    const employeePF = Math.round(pfWage * (config.employeePercent / 100));

    // Employer split: 8.33% to EPS (capped at ceiling), rest to EPF
    const epsWage = Math.min(wage, ceiling);
    const employerEPS = Math.round(epsWage * (8.33 / 100));
    const totalEmployer = Math.round(pfWage * (config.employerPercent / 100));
    const employerEPF = Math.max(0, totalEmployer - employerEPS);

    return {
      employeePF,
      employerEPS,
      employerEPF,
      totalEmployer
    };
  },

  calculateESI: (gross: number, config: any) => {
    if (!config || !config.enabled || gross > (config.threshold || 21000)) {
      return { employeeESI: 0, employerESI: 0 };
    }

    const employeeESI = Math.ceil(gross * (config.employeePercent / 100));
    const employerESI = Math.ceil(gross * (3.25 / 100)); // Standard employer rate

    return { employeeESI, employerESI };
  },

  calculatePT: (salary: number, config: any, monthIndex?: number) => {
    if (!config || !config.enabled || !config.slabs || config.slabs.length === 0) {
      return 0;
    }

    // Special rule for Maharashtra in February
    if (config.state === 'MH' && monthIndex === 1 && salary > 10000) {
      return 300;
    }

    const slab = config.slabs.find((s: any) => salary >= s.min && salary <= s.max);
    return slab ? slab.amount : 0;
  },

  calculateGratuity: (basic: number, config: any) => {
    if (!config || !config.enabled) {
      return 0;
    }
    const percent = config.employeePercent !== undefined ? config.employeePercent : (config.employeeRate !== undefined ? config.employeeRate : 4.86);
    return Math.round(basic * (percent / 100));
  },

  calculateRetirement: (basic: number, config: any) => {
    if (!config || !config.enabled) {
      return 0;
    }
    const percent = config.employeePercent !== undefined ? config.employeePercent : (config.employeeRate !== undefined ? config.employeeRate : 5.0);
    return Math.round(basic * (percent / 100));
  }
};
