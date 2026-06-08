import nodemailer from 'nodemailer';
import { getActiveAccount } from './accounts.js';

export function createTransporter() {
  const account = getActiveAccount();
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.smtp.user,
      pass: account.smtp.password
    }
  });
}
