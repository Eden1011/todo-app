import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Todo App - Task Management",
    description:
        "A comprehensive task management application with real-time collaboration",
    keywords: "todo, task management, productivity, collaboration, projects",
    authors: [{ name: "Todo App Team" }],
    viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <SocketProvider>
                        {children}
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: "#363636",
                                    color: "#fff",
                                },
                                success: {
                                    style: {
                                        background: "#10b981",
                                    },
                                },
                                error: {
                                    style: {
                                        background: "#ef4444",
                                    },
                                },
                            }}
                        />
                    </SocketProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
