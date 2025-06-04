import React from "react";
import { cn } from "@/lib/utils";

interface LoadingProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    className?: string;
}

export function Loading({ size = "md", text, className }: LoadingProps) {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-8 h-8",
        lg: "w-12 h-12",
    };

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center",
                className,
            )}
        >
            <div className={cn("spinner", sizeClasses[size])} />
            {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
        </div>
    );
}

export function PageLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loading size="lg" text="Loading..." />
        </div>
    );
}
