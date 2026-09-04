"use client"
import Loading from '@/components/loading';
import { useAppData, user_service } from '@/context/Appcontext';
import axios from 'axios';
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import { redirect, useRouter } from 'next/navigation';
import React, { useState } from 'react'
import toast from 'react-hot-toast';
import HaveItLogo from '@/components/HaveItLogo';

const LoginPage = () => {
    const {isAuth,loading: userLoading} = useAppData();
    const [email,setEmail] = useState<string>("");
    const [loading,setLoading] = useState<boolean>(false);

    const router = useRouter();

    const handleSubmit = async(e: React.FormEvent<HTMLElement>):Promise<void> =>{
        e.preventDefault();
        setLoading(true);
        
        try {
            const {data} = await axios.post(`${user_service}/api/v1/login`,{
                email
            });
            toast.success(data.message);
            router.push(`/verify?email=${email}`);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message || "Failed to send verification code");
        } finally {
            setLoading(false);
        }
    }

    if(userLoading) return <Loading />;
    if(isAuth) redirect("/chat");

    return (
        <div className='min-h-screen bg-[#0b141a] flex items-center justify-center p-4 selection:bg-[#03cafc]/30 selection:text-white'>
            <div className='max-w-md w-full'>
                <div className='bg-[#111b21] border border-[#03cafc]/25 rounded-2xl p-8 shadow-2xl shadow-[#03cafc]/10'>
                    <div className='text-center mb-8'>
                        <div className='flex justify-center mb-5'>
                            <HaveItLogo size={80} glow={true} />
                        </div>
                        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                            Welcome to <span className="text-[#03cafc]">Have-it</span>
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Enter your email to continue your Have-it journey.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className='space-y-6'>
                        <div>
                            <label htmlFor="email" className='block text-xs font-semibold uppercase tracking-wider text-[#03cafc] mb-2'>Email Address</label>
                            <input 
                                type="email" 
                                id='email' 
                                className='w-full px-4 py-3.5 bg-[#202c33] border border-gray-700 focus:border-[#03cafc] rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors' 
                                placeholder='Enter your email address' 
                                value={email} 
                                onChange={e=> setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <button 
                            type='submit' 
                            className='w-full bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] py-3.5 px-6 rounded-xl font-bold transition-all shadow-lg shadow-[#03cafc]/25 hover:shadow-[#03cafc]/40 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer' 
                            disabled={loading}
                        >
                            {loading?(
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className='w-5 h-5 animate-spin' />
                                    <span>Sending OTP code...</span>
                                </div>
                            ):(
                            <div className="flex items-center justify-center gap-2">
                                <span>Send Verification Code</span>
                                <ArrowRight className='w-5 h-5' />
                            </div>
                            )}
                        </button>
                    </form>
                </div>
            </div>      
        </div>
    )
}

export default LoginPage
