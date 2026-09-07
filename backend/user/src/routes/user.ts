import express from "express";
import {
    getAllUsers,
    getUserByID,
    loginUser,
    myProfile,
    updateName,
    updateProfile,
    updateAvatar,
    removeAvatar,
    verifyUser,
    updateTheme,
    getSystemConfig,
} from "../controller/user.js";
import {
    getOAuthProviders,
    googleAuth,
    googleCallback,
    microsoftAuth,
    microsoftCallback,
} from "../controller/oauth.js";
import { isAuth } from "../middleware/isAuth.js";
import { uploadAvatar } from "../middleware/multer.js";

const router = express.Router();

// System & Health
router.get('/system/config', getSystemConfig);

// Authentication — Email & OTP
router.post('/login', loginUser);
router.post('/verify', verifyUser);

// Authentication — Social OAuth (Google & Microsoft)
router.get('/auth/providers', getOAuthProviders);
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleCallback);
router.get('/auth/microsoft', microsoftAuth);
router.get('/auth/microsoft/callback', microsoftCallback);

// User Profile & Management
router.get('/me', isAuth, myProfile);
router.post('/update/user', isAuth, updateName);
router.put('/user/profile', isAuth, updateProfile);
router.put('/user/theme', isAuth, updateTheme);
router.post('/user/avatar', isAuth, uploadAvatar.single('avatar'), updateAvatar);
router.delete('/user/avatar', isAuth, removeAvatar);
router.get('/user/all', isAuth, getAllUsers);
router.get('/user/:id', getUserByID);

export default router;