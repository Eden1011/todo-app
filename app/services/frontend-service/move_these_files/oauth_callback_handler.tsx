"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    ExternalLink,
    ArrowRight,
    Home,
    User,
} from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { checkAuth } = useAuth();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading",
    );
    const [message, setMessage] = useState("");
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        handleOAuthCallback();
    }, []);

    const handleOAuthCallback = async () => {
        try {
            // Check for error parameters
            const error = searchParams.get("error");
            const errorDescription = searchParams.get("error_description");

            if (error) {
                setStatus("error");
                setMessage(errorDescription || "OAuth authentication failed");
                return;
            }

            // Check for success parameters (access_token and refresh_token from hash)
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
                // Store tokens
                Cookies.set("accessToken", accessToken, { expires: 1 }); // 1 day
                Cookies.set("refreshToken", refreshToken, { expires: 7 }); // 7 days

                // Verify the authentication and get user info
                await checkAuth();

                setStatus("success");
                setMessage("Successfully authenticated with Google!");

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } else {
                // Check URL parameters as fallback
                const urlAccessToken = searchParams.get("access_token");
                const urlRefreshToken = searchParams.get("refresh_token");

                if (urlAccessToken && urlRefreshToken) {
                    Cookies.set("accessToken", urlAccessToken, { expires: 1 });
                    Cookies.set("refreshToken", urlRefreshToken, {
                        expires: 7,
                    });

                    await checkAuth();
                    setStatus("success");
                    setMessage("Successfully authenticated with Google!");

                    setTimeout(() => {
                        router.push("/dashboard");
                    }, 2000);
                } else {
                    setStatus("error");
                    setMessage("No authentication tokens received");
                }
            }
        } catch (error: any) {
            console.error("OAuth callback error:", error);
            setStatus("error");
            setMessage("Failed to complete authentication");
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case "loading":
                return null;
            case "success":
                return (
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                );
            case "error":
                return <XCircle className="w-16 h-16 text-red-500 mx-auto" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case "success":
                return "border-green-200 bg-green-50";
            case "error":
                return "border-red-200 bg-red-50";
            default:
                return "border-gray-200 bg-white";
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        TaskFlow Authentication
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Processing your Google OAuth authentication...
                    </p>
                </div>

                <div className={`card border-2 ${getStatusColor()}`}>
                    {status === "loading" && (
                        <div className="text-center py-8">
                            <Loading
                                size="lg"
                                text="Completing authentication..."
                            />
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                                    <div
                                        className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"
                                        style={{ animationDelay: "0.1s" }}
                                    ></div>
                                    <div
                                        className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"
                                        style={{ animationDelay: "0.2s" }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Please wait while we set up your account...
                                </p>
                            </div>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="text-center py-8">
                            {getStatusIcon()}
                            <h3 className="text-lg font-semibold text-gray-900 mt-4">
                                Authentication Successful!
                            </h3>
                            <p className="text-sm text-gray-600 mt-2">
                                {message}
                            </p>
                            <div className="mt-4 space-y-3">
                                <Badge variant="success" className="text-sm">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Google OAuth Verified
                                </Badge>
                                <div className="text-xs text-gray-500">
                                    Redirecting to dashboard...
                                </div>
                            </div>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="text-center py-8">
                            {getStatusIcon()}
                            <h3 className="text-lg font-semibold text-gray-900 mt-4">
                                Authentication Failed
                            </h3>
                            <p className="text-sm text-gray-600 mt-2">
                                {message}
                            </p>
                            <div className="mt-6 space-y-3">
                                <Button
                                    onClick={() => router.push("/auth/login")}
                                    className="w-full"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/")}
                                    className="w-full"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Go to Home
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Additional Information */}
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                            Secure OAuth 2.0
                        </div>
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                            End-to-End Encrypted
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                        Your privacy and security are our top priority
                    </p>
                </div>

                {/* Debug Information (only in development) */}
                {process.env.NODE_ENV === "development" && (
                    <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Debug Information
                        </h4>
                        <div className="text-xs text-gray-600 space-y-1">
                            <div>Status: {status}</div>
                            <div>URL: {window.location.href}</div>
                            <div>Hash: {window.location.hash || "None"}</div>
                            <div>Search Params:</div>
                            <ul className="ml-4">
                                {Array.from(searchParams.entries()).map(
                                    ([key, value]) => (
                                        <li key={key}>
                                            {key}: {value}
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
