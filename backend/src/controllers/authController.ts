import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authController = {
  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const validUser = env.ADMIN_USERNAME;
      const validPass = env.ADMIN_PASSWORD;

      if (username !== validUser || password !== validPass) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const payload = { username, role: 'admin' as const };
      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        status: 'ok',
        token,
        user: payload
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  me: async (req: Request, res: Response) => {
    try {
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      }

      if (!token) {
        return res.json({ authenticated: false, user: null });
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      return res.json({
        authenticated: true,
        user: { username: decoded.username, role: decoded.role || 'admin' }
      });
    } catch {
      return res.json({ authenticated: false, user: null });
    }
  },

  logout: async (_req: Request, res: Response) => {
    res.clearCookie('token');
    return res.json({ status: 'ok' });
  }
};
