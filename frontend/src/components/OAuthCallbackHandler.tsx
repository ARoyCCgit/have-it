"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useAppData } from "@/context/Appcontext";
import Loading from "./loading";

const OAuthCallbackHandler = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { fetchUser, setIsAuth } = useAppData();
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (error) {
            toast.error(decodeURIComponent(error));
            router.replace("/login");
            return;
        }

        if (token) {
            // Save authentication token to cookie (15 days expiry)
            Cookies.set("token", token, {
                expires: 15,
                secure: typeof window !== "undefined" && window.location.protocol === "https:",
                path: "/",
                sameSite: "lax",
            });

            fetchUser()
                .then(() => {
                    setIsAuth(true);
                    toast.success("Signed in successfully!");
                    router.replace("/chat");
                })
                .catch((err) => {
                    console.error("Error finalizing OAuth sign-in:", err);
                    toast.error("Failed to load your Have-it profile. Please try logging in again.");
                    router.replace("/login");
                });
        } else {
            router.replace("/login");
        }
    }, [searchParams, router, fetchUser, setIsAuth]);

    return <Loading />;
};

export default OAuthCallbackHandler;
