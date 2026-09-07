import { generateToken } from "../config/generateToken.js";
import { publishToQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import type { AuthenticateRequest } from "../middleware/isAuth.js";
import { User } from "../model/User.js";

export const loginUser = TryCatch(async(req, res)=>{
    const {email} = req.body;

    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if(rateLimit){
        res.status(429).json({
            message: "Too many request. Please wait before request the new otp"
        });
        return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const otpKey = `otp:${email}`
    await redisClient.set(otpKey,otp,{
        EX: 300,
    });

    await redisClient.set(rateLimitKey, "true",{
        EX: 60,
    });

    const message = {
        to: email,
        subject: "Your Have-it Verification Code",
        otp: String(otp),
        body: `Your Have-it verification OTP code is: ${otp}. It is valid for 5 minutes. Do not share this code with anyone.`
    };

    await publishToQueue("send-otp", message);

    res.status(200).json({
        message: "Otp send to your mail"
    });
});

export const verifyUser = TryCatch(async(req, res) =>{
    const {email, otp: enteredOtp} = req.body;

    if(!email || !enteredOtp){
        res.status(400).json({
            message: "Email and otp is required"
        });
        return;
    }

    const otpKey =`otp:${email}`

    const storedOtp = await redisClient.get(otpKey);

    if(!storedOtp || storedOtp !== enteredOtp){
        res.status(400).json({
            message: 'Invalid or expired OTP'
        });
        return;
    }

    await redisClient.del(otpKey);

    let user = await User.findOne({email});

    if(!user){
        const name = email.slice(0,8);
        user = await User.create({name,email});
    }

    if (user.isBanned) {
        res.status(403).json({
            message: "Your account has been suspended. Please contact Have-it support.",
        });
        return;
    }

    const token = generateToken(user);

    res.status(200).json({
        message: "User verified",
        user,
        token
    });
});

export const myProfile = TryCatch(async(req: AuthenticateRequest, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    res.json({ user });
});

export const updateName = TryCatch(async(req: AuthenticateRequest, res) => {
    const user = await User.findById(req.user?._id);

    if(!user){
        res.status(404).json({
            message: "User Not found"
        });
        return;
    }

    if (req.body.name) {
        user.name = req.body.name.trim();
    }
    if (req.body.about !== undefined) {
        user.about = req.body.about.trim();
    }

    await user.save();

    const token = generateToken(user);
    
    res.status(200).json({
        message: "User Updated",
        user,
        token
    });
});

export const updateProfile = TryCatch(async (req: AuthenticateRequest, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    const { name, about } = req.body;
    if (name) user.name = name.trim();
    if (about !== undefined) user.about = about.trim();

    await user.save();

    res.status(200).json({
        message: "Profile updated successfully",
        user,
    });
});

export const updateAvatar = TryCatch(async (req: AuthenticateRequest, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if (!req.file) {
        res.status(400).json({ message: "No avatar image provided" });
        return;
    }

    user.avatar = {
        url: req.file.path,
        publicId: req.file.filename,
    };

    await user.save();

    res.status(200).json({
        message: "Avatar updated successfully",
        user,
    });
});

export const removeAvatar = TryCatch(async (req: AuthenticateRequest, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    user.avatar = {
        url: "",
        publicId: "",
    };

    await user.save();

    res.status(200).json({
        message: "Avatar removed successfully",
        user,
    });
});

export const getAllUsers = TryCatch(async(req: AuthenticateRequest, res)=>{
    const users = await User.find().select("-__v");

    res.json(users);
});

export const getUserByID = TryCatch(async (req, res) => {
    const { id } = req.params;
    if (!id || id === "undefined" || id === "null") {
        res.status(200).json({ _id: id, name: "Contact", about: "Hey there! I am using Have-it." });
        return;
    }

    try {
        const user = await User.findById(id).select("-__v");
        if (!user) {
            res.status(200).json({ _id: id, name: "Deleted User", about: "" });
            return;
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(200).json({ _id: id, name: "Contact", about: "Hey there! I am using Have-it." });
    }
});

// Update Theme Preference (3-Mode: system, dark, light)
export const updateTheme = TryCatch(async (req: AuthenticateRequest, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    const { theme } = req.body;
    if (!theme || !["system", "dark", "light"].includes(theme)) {
        res.status(400).json({
            message: "Invalid theme preference. Must be 'system', 'dark', or 'light'.",
        });
        return;
    }

    user.theme = theme;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
        success: true,
        message: `Theme preference updated to '${theme}' successfully`,
        theme: user.theme,
        user,
        token,
    });
});

export const getSystemConfig = TryCatch(async (req, res) => {
    const { SystemConfig } = await import("../model/SystemConfig.js");
    let config = await SystemConfig.findOne();
    if (!config) {
        config = await SystemConfig.create({});
    }
    res.status(200).json({
        success: true,
        config,
    });
});