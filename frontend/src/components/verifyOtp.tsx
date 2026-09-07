"use client"
import axios from 'axios';
import { ArrowRight, ChevronLeft, Loader2, Lock } from 'lucide-react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { useAppData, user_service } from '@/context/Appcontext';
import Loading from './loading';
import toast from 'react-hot-toast';

const VerifyOtp = () => {
    const { isAuth, setIsAuth, setUser, loading: userLoading, fetchChats, fetchAllUsers } = useAppData();
    const [loading, setLoading] = useState<boolean>(false);
    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
    const [error, setError] = useState<string>("");
    const [resendLoading, setResendLoading] = useState<boolean>(false);
    const [timer, setTimer] = useState(60);
    const inputRefs = useRef<Array<HTMLInputElement>>([]);   

    const searchParams = useSearchParams();
    const email: string = searchParams.get('email') || "";
    const otpParam: string = searchParams.get('otp') || "";

    const router = useRouter();

    useEffect(() => {
        if (otpParam && otpParam.length === 6) {
            setOtp(otpParam.split(''));
        }
    }, [otpParam]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);    

    const handleInputChange = (index: number, value: string): void => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError("");

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLElement>): void => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text");
        const digits = pastedData.replace(/\D/g, "").slice(0, 6);
        if (digits.length === 6) {
            const newOtp = digits.split("");
            setOtp(newOtp);
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const otpString = otp.join("");
        if (otpString.length !== 6) {
            setError("Please Enter all 6-digits");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const { data } = await axios.post(`${user_service}/api/v1/verify`, {
                email,
                otp: otpString,
            });
            toast.success(data.message);
            Cookies.set("token", data.token, {
                expires: 15,
                secure: false,
                path: "/",
            });
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
            const userData = data.user || data;
            setUser(userData);
            setIsAuth(true);
            fetchChats();
            fetchAllUsers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setError(err?.response?.data?.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const handelResendOtp = async () => {
        setResendLoading(true);
        setError("");
        try {
            const { data } = await axios.post(`${user_service}/api/v1/login`, {
                email,
            });
            toast.success(data.message);
            setTimer(60);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setError(err?.response?.data?.message || "Failed to resend code");
        } finally {
            setResendLoading(false);
        }
    };

    if (userLoading) return <Loading />;
    if (isAuth) redirect("/chat");
    return (
        <div className='min-h-[100dvh] bg-[#0b141a] flex items-center justify-center p-3 sm:p-4 selection:bg-[#03cafc]/30 selection:text-white'>
            <div className='max-w-md w-full'>
                <div className='bg-[#111b21] border border-[#03cafc]/25 rounded-2xl p-5 sm:p-8 shadow-2xl shadow-[#03cafc]/10'>
                    <div className='text-center mb-6 sm:mb-8 relative'>
                        <button className="absolute top-0 left-0 p-2 text-gray-400 hover:text-[#03cafc] rounded-lg transition-colors cursor-pointer" onClick={() => router.push(`/login`)} title="Back to Login">
                            <ChevronLeft className='w-6 h-6' />
                        </button>
                        <div className='mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-[#202c33] border border-[#03cafc]/40 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 shadow-lg shadow-[#03cafc]/20'>
                            <Lock size={32} className='text-[#03cafc]' />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                            Verify <span className="text-[#03cafc]">Have-it</span> Code
                        </h1>
                        <p className="text-gray-400 text-xs sm:text-sm">
                            We have sent a 6-digit verification code to
                        </p>
                        <p className='text-[#03cafc] font-semibold text-xs sm:text-sm mt-1 break-all'>{email}</p>
                    </div>
                    <form onSubmit={handleSubmit} className='space-y-6'>
                        <div>
                            <label className='block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3 sm:mb-4 text-center'>Enter your 6-digit OTP</label>
                            <div className="flex justify-center space-x-1.5 sm:space-x-2.5">
                                {
                                    otp.map((digit, index) => (
                                        <input key={index} ref={(el: HTMLInputElement) => {
                                            inputRefs.current[index] = el;
                                        }}
                                        type='text'
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleInputChange(index, e.target.value)}
                                        onKeyDown={e => handleKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePaste : undefined}
                                        className='w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-bold border-2 border-gray-700 focus:border-[#03cafc] focus:ring-2 focus:ring-[#03cafc]/30 rounded-xl bg-[#202c33] text-white focus:outline-none transition-all shadow-inner' />
                                    ))
                                }
                            </div>
                        </div>
                        {error && (
                            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3">
                                <p className="text-rose-300 text-xs text-center font-medium">{error}</p>
                            </div>
                        )}
                        <button type='submit' className='w-full bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] py-3.5 px-6 rounded-xl font-bold transition-all shadow-lg shadow-[#03cafc]/25 hover:shadow-[#03cafc]/40 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer' disabled={loading}>
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className='w-5 h-5 animate-spin' />
                                    <span>Verifying code...</span>
                                </div>
                            ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span>Verify & Continue</span>
                                <ArrowRight className='w-5 h-5' />
                            </div>
                            )}
                        </button>
                    </form>
                    <div className='mt-6 text-center'>
                        <p className="text-gray-400 text-xs mb-2">
                            Didn&apos;t receive the code?
                        </p>
                        { timer > 0 ? ( 
                            <p className="text-gray-400 text-xs">
                                Resend code in <span className="text-[#03cafc] font-mono font-semibold">{timer}s</span>
                            </p> 
                        ) : ( 
                            <button className="text-[#03cafc] hover:text-[#70e1fd] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50" 
                            disabled={resendLoading} 
                            onClick={handelResendOtp}
                            >
                                {resendLoading ? "Sending new code..." : "Resend Code"}
                            </button> 
                        )}
                    </div>
                </div>
            </div>      
        </div>
    );
};

export default VerifyOtp;
