import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const TryCatch = (handler: AsyncRequestHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error: any) {
            console.error("Controller Error:", error);
            res.status(500).json({
                message: error.message || "Internal Server Error",
                error: process.env.NODE_ENV === "development" ? error : undefined,
            });
        }
    };
};

export default TryCatch;
