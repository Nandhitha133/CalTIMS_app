// src/features/payroll/complianceEngine.ts

export const complianceEngine = {
  calculatePF: (ctc: number, da: number, config: any) => {
    if (!config || !config.enabled) {
      return { employeePF: 0, employerEPS: 0, employerEPF: 0, totalEmployer: 0 };
    }

    const wage = ctc + da;
    const pfWage = wage;

    const employeePF = Math.round(pfWage * ((config.employeePercent || config.employeeRate || 12) / 100));

    return {
      employeePF,
      employerEPS: 0,
      employerEPF: 0,
      totalEmployer: 0
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

    const slab = config.slabs.find((s: any) => {
      const min = parseFloat(s.min) || 0;
      const max = s.max !== undefined && s.max !== null && s.max !== '' ? parseFloat(s.max) : null;
      return salary >= min && (max === null || max === 0 || salary <= max);
    });
    return slab ? slab.amount : 0;
  },

  calculateGratuity: (ctc: number, config: any) => {
    if (!config || !config.enabled) {
      return 0;
    }
    const percent = config.employeePercent !== undefined ? config.employeePercent : (config.employeeRate !== undefined ? config.employeeRate : 4.86);
    return Math.round(ctc * (percent / 100));
  },

  calculateRetirement: (basic: number, config: any) => {
    if (!config || !config.enabled) {
      return 0;
    }
    const percent = config.employeePercent !== undefined ? config.employeePercent : (config.employeeRate !== undefined ? config.employeeRate : 5.0);
    return Math.round(basic * (percent / 100));
  }
};
