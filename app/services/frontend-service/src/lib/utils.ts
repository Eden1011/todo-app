import { type ClassValue, clsx } from "clsx";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { TaskPriority, TaskStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatDate(date: string | Date): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isToday(dateObj)) {
        return format(dateObj, "HH:mm");
    }

    if (isYesterday(dateObj)) {
        return "Yesterday";
    }

    return format(dateObj, "MMM d, yyyy");
}

export function formatRelativeTime(date: string | Date): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getPriorityColor(priority: TaskPriority): string {
    switch (priority) {
        case "LOW":
            return "bg-green-100 text-green-800";
        case "MEDIUM":
            return "bg-yellow-100 text-yellow-800";
        case "HIGH":
            return "bg-orange-100 text-orange-800";
        case "URGENT":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

export function getStatusColor(status: TaskStatus): string {
    switch (status) {
        case "TODO":
            return "bg-gray-100 text-gray-800";
        case "IN_PROGRESS":
            return "bg-blue-100 text-blue-800";
        case "REVIEW":
            return "bg-purple-100 text-purple-800";
        case "DONE":
            return "bg-green-100 text-green-800";
        case "CANCELED":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

export function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
}

export function generateColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;
    return `hsl(${hue}, 70%, 80%)`;
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
    // At least 8 characters, one uppercase, one lowercase, one number, one special character
    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

export function getPasswordStrength(password: string): {
    score: number;
    text: string;
    color: string;
} {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    switch (score) {
        case 0:
        case 1:
            return { score, text: "Very Weak", color: "text-red-600" };
        case 2:
            return { score, text: "Weak", color: "text-orange-600" };
        case 3:
            return { score, text: "Fair", color: "text-yellow-600" };
        case 4:
            return { score, text: "Good", color: "text-blue-600" };
        case 5:
            return { score, text: "Strong", color: "text-green-600" };
        default:
            return { score: 0, text: "Very Weak", color: "text-red-600" };
    }
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

export function downloadFile(data: any, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        return Promise.resolve();
    }
}
