/**
 * Dashboard Authentication Middleware
 * Simple HTTP Basic Auth for analytics dashboard
 */

import { Request, Response, NextFunction } from 'express';

export function dashboardAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="OEM Tech Talk Analytics"');
    return res.status(401).send('Authentication required');
  }

  // Decode Base64 credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Check against environment variables
  const validUsername = process.env.DASH_USERNAME || 'oemtt';
  const validPassword = process.env.DASH_PASSWORD || 'oemtt2026';

  if (username === validUsername && password === validPassword) {
    return next();
  }

  // Invalid credentials
  res.setHeader('WWW-Authenticate', 'Basic realm="OEM Tech Talk Analytics"');
  return res.status(401).send('Invalid credentials');
}
