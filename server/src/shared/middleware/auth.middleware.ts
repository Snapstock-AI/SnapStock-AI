import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRepository } from "../../modules/auth/auth.repository";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    system_role: string;
    sessionId: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      message: "Invalid token format",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      system_role: string;
      sessionId: string;
    };

    if (!decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const session = await AuthRepository.findActiveSessionById(decoded.sessionId);

    if (!session || new Date() > session.expires_at) {
      return res.status(401).json({
        success: false,
        message: "Session expired or revoked",
      });
    }

    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      system_role: decoded.system_role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const requireRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.system_role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
    next();
  };
};
