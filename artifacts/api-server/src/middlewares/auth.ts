import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "loconet-secret-key";

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing or invalid token" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "forbidden", message: "Admin access required" });
      return;
    }
    next();
  });
}

export function generateToken(payload: { id: number; username: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
