const emailService = require('./src/shared/services/email.service');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  try {
    const transporter = require('nodemailer').createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    await transporter.verify();
    console.log("SMTP Connection successful.");
  } catch(e) {
    console.error("SMTP Error:", e);
  }
}

test();
