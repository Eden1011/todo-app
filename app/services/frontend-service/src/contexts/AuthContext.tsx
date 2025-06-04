"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { User, LoginCredentials, RegisterCredentials } from "@/types";
import { apiClient } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    const checkAuth = async () => {
        try {
            const accessToken = Cookies.get("accessToken");
            if (!accessToken) {
                setIsLoading(false);
                return;
            }

            const userData = await apiClient.verifyToken();
            setUser(userData);
        } catch (error) {
            console.error("Auth check failed:", error);
            // Clear invalid tokens
            Cookies.remove("accessToken");
            Cookies.remove("refreshToken");
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);
            await apiClient.login(credentials);

            // Verify the new token to get user data
            const userData = await apiClient.verifyToken();
            setUser(userData);

            toast.success("Successfully logged in!");
        } catch (error: any) {
            const message = error.message || "Login failed";
            toast.error(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (credentials: RegisterCredentials) => {
        try {
            setIsLoading(true);
            const result = await apiClient.register(credentials);

            // Check if auto-login happened
            if ("accessToken" in result) {
                // Auto-login successful, get user data
                const userData = await apiClient.verifyToken();
                setUser(userData);
                toast.success(
                    "Registration successful! You are now logged in.",
                );
            } else {
                // No auto-login, show verification message
                toast.success(
                    result.message ||
                        "Registration successful! Please check your email for verification.",
                );
            }
        } catch (error: any) {
            const message = error.message || "Registration failed";
            toast.error(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        apiClient.logout();
        setUser(null);
        toast.success("Successfully logged out!");
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
