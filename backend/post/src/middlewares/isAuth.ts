import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface IAuthUser {
    _id: string;
    name: string;
    email: string;
    about?: string;
    avatar?: {
        url?: string;
        publicId?: string;
    } | string;
}

export interface AuthenticatedRequest extends Request {
    user?: IAuthUser | null;
}

export const isAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - Token not found",
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({
                message: "Authentication token missing",
            });
            return;
        }

        const secret = process.env.JWT_TOKEN;
        if (!secret) {
            throw new Error("JWT_TOKEN secret is not defined in environment");
        }

        const decodedValue = jwt.verify(token, secret) as JwtPayload;

        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                message: "Invalid or expired token",
            });
            return;
        }

        req.user = decodedValue.user;
        next();
    } catch (error) {
        res.status(401).json({
            message: "Authentication failed - Invalid token",
        });
    }
};
