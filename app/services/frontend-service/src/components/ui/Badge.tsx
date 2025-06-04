import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "primary" | "success" | "warning" | "danger" | "gray";
    className?: string;
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
    const variantClasses = {
        primary: "badge-primary",
        success: "badge-success",
        warning: "badge-warning",
        danger: "badge-danger",
        gray: "badge-gray",
    };

    return (
        <span className={cn("badge", variantClasses[variant], className)}>
            {children}
        </span>
    );
}
