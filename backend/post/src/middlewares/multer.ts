import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "haveit-posts",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm", "m4v"],
    } as any,
});

export const uploadMedia = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max per file for high-res videos & multi-carousels
        files: 10, // Up to 10 media items per carousel post
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("video/") ||
            file.mimetype.includes("mp4") ||
            file.mimetype.includes("quicktime") ||
            file.mimetype.includes("webm")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file format. Please upload valid image or video files."));
        }
    },
});
