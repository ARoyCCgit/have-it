import Loading from "@/components/loading";
import OAuthCallbackHandler from "@/components/OAuthCallbackHandler";
import React, { Suspense } from "react";

export const metadata = {
    title: "Authenticating | Have-it",
    description: "Completing single sign-on authentication...",
};

const OAuthCallbackPage = () => {
    return (
        <Suspense fallback={<Loading />}>
            <OAuthCallbackHandler />
        </Suspense>
    );
};

export default OAuthCallbackPage;
