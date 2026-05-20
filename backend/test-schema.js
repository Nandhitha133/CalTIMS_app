const Joi = require('joi');
const { ROLES } = require('./src/constants');

const createUserSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(...Object.values(ROLES)).default('employee'),
  department: Joi.string().trim().max(100),
  designation: Joi.string().trim().max(100),
  managerId: Joi.string().hex().length(24).allow(null, ''),
  phone: Joi.string().trim().pattern(/^\d{10}$/).messages({
    'string.pattern.base': 'Phone number must be exactly 10 digits',
  }),
  employeeId: Joi.string().trim().max(50),
  joinDate: Joi.date().iso(),
  bankName: Joi.string().trim().required(),
  accountNumber: Joi.string().trim().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Account number must be numeric',
  }),
  branchName: Joi.string().trim().required(),
  ifscCode: Joi.string().trim().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required().messages({
    'string.pattern.base': 'Invalid IFSC code format',
  }),
  uan: Joi.string().trim().pattern(/^\d{12}$/).required().messages({
    'string.pattern.base': 'UAN number must be exactly 12 digits',
  }),
  pan: Joi.string().trim().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).required().messages({
    'string.pattern.base': 'Invalid PAN number format',
  }),
  aadhaar: Joi.string().trim().pattern(/^\d{12}$/).required().messages({
    'string.pattern.base': 'Aadhaar number must be 12 digits',
  }),
});

const payload = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  role: 'manager',
  department: 'IT',
  designation: 'Manager',
  phone: '1234567890',
  employeeId: 'EMP001',
  joinDate: '2023-01-01',
  bankName: 'Test Bank',
  accountNumber: '1234567890123456',
  branchName: 'Test Branch',
  ifscCode: 'SBIN0001234',
  uan: '123456789012',
  pan: 'ABCDE1234F',
  aadhaar: '123456789012'
};

const result = createUserSchema.validate(payload);
console.log(result.error ? result.error.message : 'Valid');
