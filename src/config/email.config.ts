import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'AppForge <noreply@appforge.dev>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
