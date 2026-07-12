import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    username: string;
  };
}

export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || "fairstake_super_secure_jwt_secret_key_1337";

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }

      req.user = decoded as AuthenticatedRequest["user"];
      next();
    });
  } else {
    res.status(401).json({ error: "Authentication token required" });
  }
}
