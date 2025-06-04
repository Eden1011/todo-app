"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    isValidEmail,
    isValidPassword,
    getPasswordStrength,
} from "@/lib/utils";
import { Eye, EyeOff, Check, X } from "lucide-react";

export default function RegisterPage() {
    const [credentials, setCredentials] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { register, isAuthenticated } = useAuth();
    const router = useRouter();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, router]);

    const passwordStrength = getPasswordStrength(credentials.password);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials((prev) => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!credentials.username.trim()) {
            newErrors.username = "Username is required";
        } else if (credentials.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        } else if (credentials.username.length > 20) {
            newErrors.username = "Username must be no more than 20 characters";
        } else if (!/^[a-zA-Z0-9]+$/.test(credentials.username)) {
            newErrors.username =
                "Username can only contain letters and numbers";
        }

        if (!credentials.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!isValidEmail(credentials.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!credentials.password) {
            newErrors.password = "Password is required";
        } else if (!isValidPassword(credentials.password)) {
            newErrors.password =
                "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
        }

        if (!credentials.confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (credentials.password !== credentials.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await register({
                username: credentials.username,
                email: credentials.email,
                password: credentials.password,
            });

            // The register function will handle success messages and redirects
        } catch (error: any) {
            console.error("Registration error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleRegister = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:3000"}/oauth/google`;
    };

    const passwordRequirements = [
        {
            met: credentials.password.length >= 8,
            text: "At least 8 characters",
        },
        {
            met: /[a-z]/.test(credentials.password),
            text: "One lowercase letter",
        },
        {
            met: /[A-Z]/.test(credentials.password),
            text: "One uppercase letter",
        },
        { met: /[0-9]/.test(credentials.password), text: "One number" },
        {
            met: /[@$!%*?&]/.test(credentials.password),
            text: "One special character",
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{" "}
                        <Link
                            href="/auth/login"
                            className="font-medium text-primary-600 hover:text-primary-500"
                        >
                            sign in to your existing account
                        </Link>
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Username"
                            name="username"
                            type="text"
                            value={credentials.username}
                            onChange={handleChange}
                            error={errors.username}
                            placeholder="Choose a username"
                            required
                        />

                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={credentials.email}
                            onChange={handleChange}
                            error={errors.email}
                            placeholder="Enter your email"
                            required
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={credentials.password}
                                onChange={handleChange}
                                error={errors.password}
                                placeholder="Create a password"
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Password strength indicator */}
                        {credentials.password && (
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">
                                        Password strength:
                                    </span>
                                    <span
                                        className={`text-sm font-medium ${passwordStrength.color}`}
                                    >
                                        {passwordStrength.text}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-1 text-xs">
                                    {passwordRequirements.map((req, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center space-x-2"
                                        >
                                            {req.met ? (
                                                <Check className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <X className="w-3 h-3 text-gray-300" />
                                            )}
                                            <span
                                                className={
                                                    req.met
                                                        ? "text-green-600"
                                                        : "text-gray-400"
                                                }
                                            >
                                                {req.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Input
                                label="Confirm Password"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={credentials.confirmPassword}
                                onChange={handleChange}
                                error={errors.confirmPassword}
                                placeholder="Confirm your password"
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                                onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                }
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="w-full"
                            size="lg"
                        >
                            Create account
                        </Button>
                    </div>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-gray-50 text-gray-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleGoogleRegister}
                                className="w-full"
                            >
                                <svg
                                    className="w-5 h-5 mr-2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Sign up with Google
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
