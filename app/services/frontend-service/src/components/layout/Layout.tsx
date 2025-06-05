"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import {
    Home,
    CheckSquare,
    Folder,
    Tags,
    MessageSquare,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    Hash,
    Shield,
    BarChart3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface LayoutProps {
    children: React.ReactNode;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Projects", href: "/projects", icon: Folder },
    { name: "Categories", href: "/categories", icon: Hash },
    { name: "Tags", href: "/tags", icon: Tags },
    { name: "Chat", href: "/chat", icon: MessageSquare },
];

const bottomNavigation = [
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user, logout } = useAuth();
    const pathname = usePathname();

    // Load unread notifications count
    useEffect(() => {
        const loadUnreadCount = async () => {
            try {
                const stats = await apiClient.getNotificationStatistics();
                setUnreadCount(stats.unreadCount || 0);
            } catch (error) {
                console.error("Failed to load notification stats:", error);
            }
        };

        loadUnreadCount();

        // Poll for updates every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-screen flex">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                >
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
                </div>
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                        <Link href="/dashboard" className="flex items-center">
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2">
                                <CheckSquare className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">
                                TaskFlow
                            </h1>
                        </Link>
                        <button
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1">
                        <div className="mb-4">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                Main
                            </div>
                            {navigation.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" &&
                                        pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? "bg-primary-100 text-primary-700"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                                        )}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <item.icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                System
                            </div>
                            {bottomNavigation.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" &&
                                        pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? "bg-primary-100 text-primary-700"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                                        )}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <item.icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                        {item.name === "Notifications" &&
                                            unreadCount > 0 && (
                                                <Badge
                                                    variant="danger"
                                                    className="ml-auto text-xs"
                                                >
                                                    {unreadCount}
                                                </Badge>
                                            )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Admin Section (only for admin users) */}
                        {user?.isVerified && (
                            <div className="border-t border-gray-200 pt-4">
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                    Admin
                                </div>
                                <Link
                                    href="/admin"
                                    className={cn(
                                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        pathname.startsWith("/admin")
                                            ? "bg-red-100 text-red-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                                    )}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Shield className="w-5 h-5 mr-3" />
                                    Admin Panel
                                </Link>
                                <Link
                                    href="/admin/analytics"
                                    className={cn(
                                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        pathname === "/admin/analytics"
                                            ? "bg-red-100 text-red-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                                    )}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <BarChart3 className="w-5 h-5 mr-3" />
                                    Analytics
                                </Link>
                            </div>
                        )}
                    </nav>

                    {/* User menu */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.username || user?.email || "User"}
                                </p>
                                <div className="flex items-center space-x-1">
                                    {user?.isVerified ? (
                                        <Badge
                                            variant="success"
                                            className="text-xs"
                                        >
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="warning"
                                            className="text-xs"
                                        >
                                            Unverified
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Link
                                href="/settings"
                                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                <Settings className="w-4 h-4 mr-3" />
                                Settings
                            </Link>
                            <button
                                onClick={logout}
                                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                <LogOut className="w-4 h-4 mr-3" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <button
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex items-center space-x-4">
                            {/* Quick Actions */}
                            <Link href="/tasks/new">
                                <Button variant="ghost" size="sm">
                                    <CheckSquare className="w-4 h-4 mr-2" />
                                    New Task
                                </Button>
                            </Link>

                            <Link href="/notifications">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="relative"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                            {unreadCount > 9
                                                ? "9+"
                                                : unreadCount}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
