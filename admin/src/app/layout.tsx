import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { AdminThemeProvider } from "@/context/AdminThemeContext";
import { Toaster } from "react-hot-toast";

export const viewport: Viewport = {
  themeColor: "#03cafc",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Have-it Command Center — Enterprise Admin Console",
  description: "Administrative console and WhatsApp Cloud API management platform for Have-it.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen">
        <AdminAuthProvider>
          <AdminThemeProvider>
            {children}
            <Toaster position="bottom-right" />
          </AdminThemeProvider>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
