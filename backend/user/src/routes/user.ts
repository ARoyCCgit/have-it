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
import { isAuth } from "../middleware/isAuth.js";
import { uploadAvatar } from "../middleware/multer.js";

const router = express.Router();

router.get('/system/config', getSystemConfig);
router.post('/login', loginUser);
router.post('/verify', verifyUser);
router.get('/me', isAuth, myProfile);
router.post('/update/user', isAuth, updateName);
router.put('/user/profile', isAuth, updateProfile);
router.put('/user/theme', isAuth, updateTheme);
router.post('/user/avatar', isAuth, uploadAvatar.single('avatar'), updateAvatar);
router.delete('/user/avatar', isAuth, removeAvatar);
router.get('/user/all', isAuth, getAllUsers);
router.get('/user/:id', getUserByID);

export default router;