import type { Request, Response } from "express";
import { User } from "../model/User.js";
import { generateToken } from "../config/generateToken.js";

const getFrontendUrl = (): string => {
    return process.env.FRONTEND_URL || "http://localhost:3000";
};

const getBackendBaseUrl = (req: Request): string => {
    if (process.env.BACKEND_URL) {
        return process.env.BACKEND_URL.replace(/\/$/, "");
    }
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:5000";
    return `${proto}://${host}`;
};

const getGoogleRedirectUri = (req: Request): string => {
    if (process.env.GOOGLE_CALLBACK_URL) {
        return process.env.GOOGLE_CALLBACK_URL;
    }
    return `${getBackendBaseUrl(req)}/api/v1/auth/google/callback`;
};

const getMicrosoftRedirectUri = (req: Request): string => {
    if (process.env.MICROSOFT_CALLBACK_URL) {
        return process.env.MICROSOFT_CALLBACK_URL;
    }
    return `${getBackendBaseUrl(req)}/api/v1/auth/microsoft/callback`;
};

/**
 * Check which OAuth providers are configured on this server
 */
export const getOAuthProviders = (_req: Request, res: Response): void => {
    res.json({
        google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    });
};

/**
 * 1. Google OAuth — Initiates Google Sign-In redirect
 */
export const googleAuth = (req: Request, res: Response): void => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const frontend = getFrontendUrl();

    if (!clientId || !clientSecret) {
        const errorMsg = "Google Sign-In is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.";
        res.redirect(`${frontend}/login?error=${encodeURIComponent(errorMsg)}`);
        return;
    }

    const redirectUri = getGoogleRedirectUri(req);
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("access_type", "offline");

    res.redirect(googleAuthUrl.toString());
};

/**
 * 2. Google OAuth Callback — Exchanges auth code, creates/links user, redirects with token
 */
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
    const frontend = getFrontendUrl();
    const { code, error, error_description } = req.query;

    if (error) {
        const msg = String(error_description || error || "Google Sign-In was cancelled.");
        res.redirect(`${frontend}/login?error=${encodeURIComponent(msg)}`);
        return;
    }

    if (!code) {
        res.redirect(`${frontend}/login?error=${encodeURIComponent("No authorization code received from Google.")}`);
        return;
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID!;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
        const redirectUri = getGoogleRedirectUri(req);

        // Exchange code for Google Access Token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code: String(code),
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }).toString(),
        });

        const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("Google Token Exchange failed:", tokenData);
            res.redirect(`${frontend}/login?error=${encodeURIComponent("Failed to exchange code with Google.")}`);
            return;
        }

        // Fetch User Profile from Google
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const profile = (await userResponse.json()) as {
            sub?: string;
            name?: string;
            email?: string;
            picture?: string;
        };

        if (!userResponse.ok || !profile.email) {
            console.error("Google UserInfo failed:", profile);
            res.redirect(`${frontend}/login?error=${encodeURIComponent("Could not retrieve email from Google profile.")}`);
            return;
        }

        const email = profile.email.toLowerCase().trim();
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name: profile.name?.trim() || email.split("@")[0] || "User",
                email,
                avatar: profile.picture ? { url: profile.picture } : { url: "" },
                isVerified: true,
                authProvider: "google",
                googleId: profile.sub || "",
            });
        } else {
            let needsSave = false;
            if (!user.googleId && profile.sub) {
                user.googleId = profile.sub;
                needsSave = true;
            }
            if (!user.avatar?.url && profile.picture) {
                user.avatar = { url: profile.picture };
                needsSave = true;
            }
            if (!user.isVerified) {
                user.isVerified = true;
                needsSave = true;
            }
            if (needsSave) {
                await user.save();
            }
        }

        if (user.isBanned) {
            res.redirect(`${frontend}/login?error=${encodeURIComponent("Your account has been suspended. Please contact Have-it support.")}`);
            return;
        }

        const token = generateToken(user);
        res.redirect(`${frontend}/oauth-callback?token=${encodeURIComponent(token)}`);
    } catch (err: unknown) {
        console.error("Error in googleCallback:", err);
        res.redirect(`${frontend}/login?error=${encodeURIComponent("An unexpected error occurred during Google Sign-In.")}`);
    }
};

/**
 * 3. Microsoft OAuth — Initiates Microsoft Sign-In redirect
 */
export const microsoftAuth = (req: Request, res: Response): void => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const frontend = getFrontendUrl();

    if (!clientId || !clientSecret) {
        const errorMsg = "Microsoft Sign-In is not configured yet. Please add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to environment variables.";
        res.redirect(`${frontend}/login?error=${encodeURIComponent(errorMsg)}`);
        return;
    }

    const redirectUri = getMicrosoftRedirectUri(req);
    const msAuthUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    msAuthUrl.searchParams.set("client_id", clientId);
    msAuthUrl.searchParams.set("response_type", "code");
    msAuthUrl.searchParams.set("redirect_uri", redirectUri);
    msAuthUrl.searchParams.set("response_mode", "query");
    msAuthUrl.searchParams.set("scope", "openid email profile User.Read");
    msAuthUrl.searchParams.set("prompt", "select_account");

    res.redirect(msAuthUrl.toString());
};

/**
 * 4. Microsoft OAuth Callback — Exchanges auth code, creates/links user, redirects with token
 */
export const microsoftCallback = async (req: Request, res: Response): Promise<void> => {
    const frontend = getFrontendUrl();
    const { code, error, error_description } = req.query;

    if (error) {
        const msg = String(error_description || error || "Microsoft Sign-In was cancelled.");
        res.redirect(`${frontend}/login?error=${encodeURIComponent(msg)}`);
        return;
    }

    if (!code) {
        res.redirect(`${frontend}/login?error=${encodeURIComponent("No authorization code received from Microsoft.")}`);
        return;
    }

    try {
        const clientId = process.env.MICROSOFT_CLIENT_ID!;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
        const redirectUri = getMicrosoftRedirectUri(req);

        // Exchange code for Microsoft Access Token
        const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: String(code),
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }).toString(),
        });

        const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("Microsoft Token Exchange failed:", tokenData);
            res.redirect(`${frontend}/login?error=${encodeURIComponent("Failed to exchange code with Microsoft.")}`);
            return;
        }

        // Fetch User Profile from Microsoft Graph API
        const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const profile = (await userResponse.json()) as {
            id?: string;
            displayName?: string;
            mail?: string;
            userPrincipalName?: string;
        };

        const rawEmail = profile.mail || profile.userPrincipalName;
        if (!userResponse.ok || !rawEmail) {
            console.error("Microsoft UserInfo failed:", profile);
            res.redirect(`${frontend}/login?error=${encodeURIComponent("Could not retrieve email from Microsoft profile.")}`);
            return;
        }

        const email = rawEmail.toLowerCase().trim();
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name: profile.displayName?.trim() || email.split("@")[0] || "User",
                email,
                avatar: { url: "" },
                isVerified: true,
                authProvider: "microsoft",
                microsoftId: profile.id || "",
            });
        } else {
            let needsSave = false;
            if (!user.microsoftId && profile.id) {
                user.microsoftId = profile.id;
                needsSave = true;
            }
            if (!user.isVerified) {
                user.isVerified = true;
                needsSave = true;
            }
            if (needsSave) {
                await user.save();
            }
        }

        if (user.isBanned) {
            res.redirect(`${frontend}/login?error=${encodeURIComponent("Your account has been suspended. Please contact Have-it support.")}`);
            return;
        }

        const token = generateToken(user);
        res.redirect(`${frontend}/oauth-callback?token=${encodeURIComponent(token)}`);
    } catch (err: unknown) {
        console.error("Error in microsoftCallback:", err);
        res.redirect(`${frontend}/login?error=${encodeURIComponent("An unexpected error occurred during Microsoft Sign-In.")}`);
    }
};
