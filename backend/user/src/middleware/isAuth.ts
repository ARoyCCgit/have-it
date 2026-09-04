import type { NextFunction, Request, Response } from "express";
import { User, type IUser } from "../model/User.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthenticateRequest extends Request{
    user?: IUser | null;
}

export const isAuth = async(req: AuthenticateRequest, res: Response, next:NextFunction):Promise<void>=>{
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            res.status(401).json({
                message: "Please Login - Token not found"
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        const decodedValue = jwt.verify(token as string,process.env.JWT_TOKEN as string) as JwtPayload;        
        
        if(!decodedValue || !decodedValue.user){
            res.status(401).json({
                message: "Invalid token"
            });
            return;
        }

        if (decodedValue.user.isBanned) {
            res.status(403).json({
                message: "Your account has been suspended. Please contact Have-it support."
            });
            return;
        }

        // Maintenance Mode Killswitch Check
        try {
            const { SystemConfig } = await import("../model/SystemConfig.js");
            const config = await SystemConfig.findOne().select("maintenanceMode maintenanceMessage");
            if (config?.maintenanceMode && decodedValue.user.role !== "admin" && decodedValue.user.role !== "super_admin") {
                res.status(503).json({
                    maintenanceMode: true,
                    message: config.maintenanceMessage || "Have-it is currently undergoing scheduled infrastructure upgrades. We will be back online shortly."
                });
                return;
            }
        } catch {
            // Non-blocking fallback
        }

        req.user = decodedValue.user;
        next();

    } catch (error) {
        res.status(401).json({
            message: "Please Login - JWT Error"
        });
    }
}

export const isAdmin = async (req: AuthenticateRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user._id) {
            res.status(401).json({ message: "Unauthorized - Admin login required" });
            return;
        }

        const user = await User.findById(req.user._id);
        if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
            res.status(403).json({ message: "Forbidden: Admin access required" });
            return;
        }

        if (user.isBanned) {
            res.status(403).json({ message: "Forbidden: Account suspended" });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: "Internal server error in admin verification" });
    }
};