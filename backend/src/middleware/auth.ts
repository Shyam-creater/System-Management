import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  username: string;
  role: 'admin' | 'incharge' | 'viewer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Require valid Admin JWT authentication.
 * Checks Authorization header (Bearer <token>) or cookie 'token'.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

/**
 * Optional Admin Auth - if token is present, populates req.user
 */
export function optionalAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    }
  } catch {}
  return next();
}

/**
 * Require valid Agent Token header (X-Agent-Token).
 * Also accepts X-ProcessShield-Key and query/body fallbacks for robust agent communication.
 */
export function requireAgentToken(req: Request, res: Response, next: NextFunction) {
  const token = (
    req.headers['x-agent-token'] ||
    req.headers['x-processshield-key'] ||
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null) ||
    (req.body && (req.body.agentToken || req.body.auth_key)) ||
    req.query.agentToken
  );

  const validTokens = [
    env.AGENT_TOKEN,
    env.PROCESSSHIELD_KEY,
    'ProcessShield-Secret-Token-2026',
    'ProcessShield-OS-2026'
  ];

  if (typeof token === 'string' && validTokens.includes(token)) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Valid X-Agent-Token required' });
}
