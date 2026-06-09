import nodemailer from 'nodemailer';
import { getActiveAccount } from './accounts.js';

export async function createTransporter() {
  const account = await getActiveAccount();
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
