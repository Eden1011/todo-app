"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/ui/Loading";

export default function HomePage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                router.push("/dashboard");
            } else {
                router.push("/auth/login");
            }
        }
    }, [isAuthenticated, isLoading, router]);

    return <PageLoading />;
}
