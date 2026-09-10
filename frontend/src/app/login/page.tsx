"use client";

import Loading from "@/components/loading";
import { useAppData, user_service } from "@/context/Appcontext";
import axios from "axios";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";
import HaveItLogo from "@/components/HaveItLogo";

const LoginForm = () => {
    const { isAuth, loading: userLoading } = useAppData();
    const [email, setEmail] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [oauthLoading, setOauthLoading] = useState<boolean>(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const errorParam = searchParams.get("error");

    useEffect(() => {
        if (errorParam) {
            toast.error(decodeURIComponent(errorParam), {
                duration: 5000,
                id: "oauth-error",
            });
        }
    }, [errorParam]);

    const handleSubmit = async (e: React.FormEvent<HTMLElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await axios.post(`${user_service}/api/v1/login`, {
                email,
            });
            toast.success(data.message);
            router.push(`/verify?email=${encodeURIComponent(email)}`);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message || "Failed to send verification code");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setOauthLoading(true);
        window.location.href = `${user_service}/api/v1/auth/google`;
    };

    if (userLoading) return <Loading />;
    if (isAuth) redirect("/chat");

    return (
        <div className="min-h-[100dvh] bg-[#0b141a] flex items-center justify-center p-3 sm:p-4 selection:bg-[#03cafc]/30 selection:text-white">
            <div className="max-w-md w-full">
                <div className="bg-[#111b21] border border-[#03cafc]/25 rounded-2xl p-5 sm:p-8 shadow-2xl shadow-[#03cafc]/10">
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-4 sm:mb-5">
                            <HaveItLogo size={68} glow={true} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                            Welcome to <span className="text-[#03cafc]">Have-it</span>
                        </h1>
                        <p className="text-gray-400 text-xs sm:text-sm">
                            Sign in with your Google account or email.
                        </p>
                    </div>

                    {errorParam && (
                        <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                            <span>{decodeURIComponent(errorParam)}</span>
                        </div>
                    )}

                    {/* Google OAuth Provider */}
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading || oauthLoading}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-700/80 hover:border-[#03cafc]/50 bg-[#202c33] hover:bg-[#2a3942] text-white font-medium text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {oauthLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-[#03cafc]" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                            )}
                            <span>Continue with Google</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-6">
                        <div className="border-t border-gray-700/80 w-full"></div>
                        <span className="bg-[#111b21] px-3 text-xs uppercase text-gray-400 font-semibold tracking-wider whitespace-nowrap">
                            or continue with email
                        </span>
                        <div className="border-t border-gray-700/80 w-full"></div>
                    </div>

                    {/* Standard Email OTP Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#03cafc] mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                className="w-full px-4 py-3.5 bg-[#202c33] border border-gray-700 focus:border-[#03cafc] rounded-xl text-white text-base sm:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] py-3.5 px-6 rounded-xl font-bold transition-all shadow-lg shadow-[#03cafc]/25 hover:shadow-[#03cafc]/40 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            disabled={loading || oauthLoading}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Sending OTP code...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span>Send Verification Code</span>
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const LoginPage = () => {
    return (
        <Suspense fallback={<Loading />}>
            <LoginForm />
        </Suspense>
    );
};

export default LoginPage;
