import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/Appcontext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SocketProvider } from "@/context/SocketContext";
import { PostSocketProvider } from "@/context/PostSocketContext";
import { CallProvider } from "@/context/CallContext";
import IncomingCallModal from "@/components/IncomingCallModal";
import CallModal from "@/components/CallModal";
import MaintenanceGate from "@/components/MaintenanceGate";

export const viewport: Viewport = {
  themeColor: "#03cafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Have-it Web",
  description: "Have-it — Real-Time Messenger for Web, Desktop & Mobile (iOS, Android, Windows, macOS)",
  applicationName: "Have-it",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Have-it",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>
          <ThemeProvider>
            <SocketProvider>
              <PostSocketProvider>
                <CallProvider>
                  <MaintenanceGate>
                    {children}
                    <IncomingCallModal />
                    <CallModal />
                  </MaintenanceGate>
                </CallProvider>
              </PostSocketProvider>
            </SocketProvider>
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
