const mongoose = require('mongoose');

const PayrollPolicySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: { type: String, default: 'Unified Payroll Policy' },
  version: { type: Number, default: 1 },
  effectiveFrom: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },

  salaryComponents: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['EARNING', 'DEDUCTION'], required: true },
    calculationType: { type: String, enum: ['fixed', 'percentage', 'formula'], default: 'fixed' },
    value: { type: Number, default: 0 },
    formula: { type: String, default: '' },
    condition: { type: String, default: '' },
    isStatutory: { type: Boolean, default: false }
  }],

  statutory: {
    pf: {
      enabled: { type: Boolean, default: true },
      employeeRate: { type: Number, default: 12 },
      employerRate: { type: Number, default: 12 },
      wageLimit: { type: Number, default: 15000 },
      restrictToCeiling: { type: Boolean, default: true },
      includeBonus: { type: Boolean, default: false }
    },
    pt: {
      enabled: { type: Boolean, default: true },
      state: { type: String, default: 'TN' },
      mode: { type: String, default: 'MONTHLY' },
      slabs: [{
        min: { type: Number },
        max: { type: Number },
        amount: { type: Number }
      }]
    },
    esi: {
      enabled: { type: Boolean, default: true },
      employeeRate: { type: Number, default: 0.75 },
      employerRate: { type: Number, default: 3.25 },
      wageLimit: { type: Number, default: 21000 },
      threshold: { type: Number, default: 21000 }
    },
    tds: {
      enabled: { type: Boolean, default: true },
      regime: { type: String, enum: ['OLD', 'NEW'], default: 'OLD' },
      threshold: { type: Number, default: 50000 },
      slabs: [{
        min: { type: Number },
        max: { type: Number },
        rate: { type: Number }
      }]
    },
    gratuity: {
      enabled: { type: Boolean, default: false },
      employeePercent: { type: Number, default: 4.86 },
      employeeRate: { type: Number, default: 4.86 },
      employerPercent: { type: Number, default: 4.86 },
      employerRate: { type: Number, default: 4.86 },
      includeInCTC: { type: Boolean, default: false }
    },
    retirement: {
      enabled: { type: Boolean, default: false },
      employeePercent: { type: Number, default: 5 },
      employeeRate: { type: Number, default: 5 },
      employerPercent: { type: Number, default: 5 },
      employerRate: { type: Number, default: 5 },
      includeInCTC: { type: Boolean, default: false }
    }
  },

  attendance: {
    workingDaysPerMonth: { type: Number, default: 22 },
    workingHoursPerDay: { type: Number, default: 8 },
    lopCalculation: { type: String, enum: ['PER_DAY', 'PER_HOUR', 'STANDARD'], default: 'PER_DAY' },
    includeWeekends: { type: Boolean, default: false },
    prorateSalary: { type: Boolean, default: true },
    workWeek: { type: String, default: 'Mon-Fri' },
    weekStartDay: { type: String, default: 'monday' }
  },

  overtime: {
    enabled: { type: Boolean, default: false },
    multiplier: { type: Number, default: 1.5 },
    maxHours: { type: Number, default: 40 }
  },

  compliance: {
    timesheetFreezeDay: { type: Number, default: 28 },
    allowBackdatedEntries: { type: Boolean, default: true }
  },

  rounding: {
    decimals: { type: Number, default: 2 },
    rule: { type: String, enum: ['ROUND_UP', 'ROUND_DOWN', 'ROUND_OFF'], default: 'ROUND_OFF' }
  },

  leave: {
    types: [{
      name: { type: String },
      paid: { type: Boolean, default: true }
    }],
    allowNegativeBalance: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Ensure only one active policy per company
PayrollPolicySchema.pre('save', async function (next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { organizationId: this.organizationId, _id: { $ne: this._id } },
      { $set: { isActive: false } }
    );
  }
  next();
});

module.exports = mongoose.model('PayrollPolicy', PayrollPolicySchema);
