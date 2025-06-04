import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = "primary",
    size = "md",
    isLoading = false,
    className,
    disabled,
    children,
    ...props
}: ButtonProps) {
    const baseClasses = "btn";

    const variantClasses = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        danger: "btn-danger",
        ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
        outline:
            "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700",
    };

    const sizeClasses = {
        sm: "btn-sm",
        md: "",
        lg: "btn-lg",
    };

    return (
        <button
            className={cn(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
                isLoading && "opacity-50 cursor-not-allowed",
                className,
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                </div>
            ) : (
                children
            )}
        </button>
    );
}
