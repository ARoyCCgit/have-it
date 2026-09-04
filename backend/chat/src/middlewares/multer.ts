import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "chat-media",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "mp3", "webm", "ogg", "wav", "m4a"],
    } as any,
});

export const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("audio/") ||
            file.mimetype.includes("audio") ||
            file.mimetype.includes("webm") ||
            file.mimetype.includes("ogg") ||
            file.mimetype.includes("mp3") ||
            file.mimetype.includes("wav") ||
            file.mimetype.includes("octet-stream")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only image and audio files are allowed"));
        }
    },
});