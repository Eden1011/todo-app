"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface LayoutProps {
    children: React.ReactNode;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Projects", href: "/projects", icon: Folder },
    { name: "Categories", href: "/categories", icon: Tags },
    { name: "Tags", href: "/tags", icon: Tags },
    { name: "Chat", href: "/chat", icon: MessageSquare },
];

export function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const pathname = usePathname();

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
                        <h1 className="text-xl font-bold text-gray-900">
                            Todo App
                        </h1>
                        <button
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
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
                            <Link href="/notifications">
                                <Button variant="ghost" size="sm">
                                    <Bell className="w-5 h-5" />
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
