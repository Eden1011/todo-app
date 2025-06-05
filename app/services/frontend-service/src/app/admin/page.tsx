"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
    Shield,
    Users,
    Database,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    BarChart3,
    Settings,
    Download,
    Search,
    RefreshCw,
    Eye,
    Ban,
    UserCheck,
    Mail,
    Lock,
    Unlock,
    Trash2,
    Server,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Mock admin data - in real app this would come from admin APIs
interface AdminUser {
    id: number;
    authId: number;
    username?: string;
    email?: string;
    isVerified: boolean;
    isActive: boolean;
    role: "USER" | "ADMIN" | "SUPER_ADMIN";
    createdAt: string;
    lastLogin?: string;
    tasksCount: number;
    projectsCount: number;
}

interface SystemHealth {
    authService: "healthy" | "degraded" | "down";
    dbService: "healthy" | "degraded" | "down";
    chatService: "healthy" | "degraded" | "down";
    database: "connected" | "disconnected";
    uptime: string;
    version: string;
}

interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    totalTasks: number;
    totalProjects: number;
    totalCategories: number;
    totalTags: number;
    totalMessages: number;
    systemLoad: number;
}

export default function AdminPanel() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isLoading, setIsLoading] = useState(true);
    const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Check admin access
    useEffect(() => {
        if (!user?.isVerified) {
            toast.error("Access denied: Admin privileges required");
            router.push("/dashboard");
            return;
        }

        loadAdminData();
    }, [user, router]);

    const loadAdminData = async () => {
        try {
            setIsLoading(true);
            // In a real app, these would be actual admin API calls
            await Promise.all([
                loadAdminStats(),
                loadSystemHealth(),
                loadUsers(),
            ]);
        } catch (error) {
            console.error("Failed to load admin data:", error);
            toast.error("Failed to load admin data");
        } finally {
            setIsLoading(false);
        }
    };

    const loadAdminStats = async () => {
        // Mock implementation - replace with actual admin API
        const mockStats: AdminStats = {
            totalUsers: 1247,
            activeUsers: 892,
            verifiedUsers: 1156,
            totalTasks: 15684,
            totalProjects: 2341,
            totalCategories: 456,
            totalTags: 1203,
            totalMessages: 45892,
            systemLoad: 0.68,
        };
        setAdminStats(mockStats);
    };

    const loadSystemHealth = async () => {
        // Mock implementation - replace with actual health check APIs
        const mockHealth: SystemHealth = {
            authService: "healthy",
            dbService: "healthy",
            chatService: "degraded",
            database: "connected",
            uptime: "15 days, 6 hours",
            version: "1.2.3",
        };
        setSystemHealth(mockHealth);
    };

    const loadUsers = async () => {
        // Mock implementation - replace with actual admin user API
        const mockUsers: AdminUser[] = [
            {
                id: 1,
                authId: 123,
                username: "admin",
                email: "admin@example.com",
                isVerified: true,
                isActive: true,
                role: "SUPER_ADMIN",
                createdAt: "2024-01-01T00:00:00Z",
                lastLogin: "2024-06-04T10:30:00Z",
                tasksCount: 156,
                projectsCount: 23,
            },
            {
                id: 2,
                authId: 456,
                username: "user1",
                email: "user1@example.com",
                isVerified: true,
                isActive: true,
                role: "USER",
                createdAt: "2024-02-15T00:00:00Z",
                lastLogin: "2024-06-04T09:15:00Z",
                tasksCount: 89,
                projectsCount: 12,
            },
            {
                id: 3,
                authId: 789,
                username: "user2",
                email: "user2@example.com",
                isVerified: false,
                isActive: true,
                role: "USER",
                createdAt: "2024-06-01T00:00:00Z",
                lastLogin: "2024-06-03T14:22:00Z",
                tasksCount: 34,
                projectsCount: 5,
            },
        ];
        setUsers(mockUsers);
    };

    const getServiceIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case "degraded":
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case "down":
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getServiceColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "bg-green-100 text-green-800";
            case "degraded":
                return "bg-yellow-100 text-yellow-800";
            case "down":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "SUPER_ADMIN":
                return "bg-red-100 text-red-800";
            case "ADMIN":
                return "bg-purple-100 text-purple-800";
            case "USER":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const handleUserAction = async (action: string, userId: number) => {
        try {
            // Mock implementation - replace with actual admin API calls
            switch (action) {
                case "verify":
                    toast.success("User verified successfully");
                    break;
                case "suspend":
                    toast.success("User suspended successfully");
                    break;
                case "activate":
                    toast.success("User activated successfully");
                    break;
                case "delete":
                    toast.success("User deleted successfully");
                    break;
                default:
                    break;
            }
            loadUsers(); // Reload users after action
        } catch (error) {
            toast.error(`Failed to ${action} user`);
        }
    };

    const exportUserData = async () => {
        try {
            // Mock export functionality
            const data = JSON.stringify(users, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `users-export-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("User data exported successfully");
        } catch (error) {
            toast.error("Failed to export user data");
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const tabs = [
        { id: "dashboard", label: "Dashboard", icon: BarChart3 },
        { id: "users", label: "User Management", icon: Users },
        { id: "system", label: "System Health", icon: Server },
        { id: "settings", label: "System Settings", icon: Settings },
    ];

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Loading size="lg" text="Loading admin panel..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Shield className="w-6 h-6 mr-3 text-red-600" />
                            Admin Panel
                        </h1>
                        <p className="text-gray-600">
                            System administration and user management
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Badge variant="danger" className="text-xs">
                            ADMIN ACCESS
                        </Badge>
                        <Button
                            variant="outline"
                            onClick={loadAdminData}
                            size="sm"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Security Warning */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">
                                Administrative Access
                            </h3>
                            <p className="text-sm text-red-700 mt-1">
                                You are accessing the admin panel. All actions
                                are logged and monitored. Only authorized
                                personnel should access this area.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="lg:w-64">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === tab.id
                                            ? "bg-red-100 text-red-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5 mr-3" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {activeTab === "dashboard" && adminStats && (
                            <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="card">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Users className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600">
                                                    Total Users
                                                </p>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {adminStats.totalUsers}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                <CheckCircle className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600">
                                                    Active Users
                                                </p>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {adminStats.activeUsers}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                                <Database className="w-6 h-6 text-purple-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600">
                                                    Total Tasks
                                                </p>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {adminStats.totalTasks}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-orange-100 rounded-lg">
                                                <Activity className="w-6 h-6 text-orange-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600">
                                                    System Load
                                                </p>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {Math.round(
                                                        adminStats.systemLoad *
                                                            100,
                                                    )}
                                                    %
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="card text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {adminStats.totalProjects}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Projects
                                        </div>
                                    </div>
                                    <div className="card text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {adminStats.totalCategories}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Categories
                                        </div>
                                    </div>
                                    <div className="card text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {adminStats.totalTags}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Tags
                                        </div>
                                    </div>
                                    <div className="card text-center">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {adminStats.totalMessages}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Messages
                                        </div>
                                    </div>
                                </div>

                                {/* System Overview */}
                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        System Overview
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <div className="text-lg font-bold text-blue-600">
                                                {Math.round(
                                                    (adminStats.verifiedUsers /
                                                        adminStats.totalUsers) *
                                                        100,
                                                )}
                                                %
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Verification Rate
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <div className="text-lg font-bold text-green-600">
                                                {Math.round(
                                                    (adminStats.activeUsers /
                                                        adminStats.totalUsers) *
                                                        100,
                                                )}
                                                %
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Active Rate
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                            <div className="text-lg font-bold text-purple-600">
                                                {Math.round(
                                                    adminStats.totalTasks /
                                                        adminStats.totalUsers,
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Tasks per User
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "users" && (
                            <div className="space-y-6">
                                {/* User Management Header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        User Management
                                    </h2>
                                    <div className="flex space-x-3">
                                        <Button
                                            variant="outline"
                                            onClick={exportUserData}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export Users
                                        </Button>
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="card">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            placeholder="Search users by username or email..."
                                            value={searchTerm}
                                            onChange={(e) =>
                                                setSearchTerm(e.target.value)
                                            }
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Users Table */}
                                <div className="card">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        User
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Role
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Activity
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredUsers.map((user) => (
                                                    <tr
                                                        key={user.id}
                                                        className="hover:bg-gray-50"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                                    <Users className="w-4 h-4 text-gray-600" />
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {user.username ||
                                                                            "No username"}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {
                                                                            user.email
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex space-x-2">
                                                                <Badge
                                                                    variant={
                                                                        user.isVerified
                                                                            ? "success"
                                                                            : "warning"
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {user.isVerified
                                                                        ? "Verified"
                                                                        : "Unverified"}
                                                                </Badge>
                                                                <Badge
                                                                    variant={
                                                                        user.isActive
                                                                            ? "success"
                                                                            : "danger"
                                                                    }
                                                                    className="text-xs"
                                                                >
                                                                    {user.isActive
                                                                        ? "Active"
                                                                        : "Suspended"}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Badge
                                                                className={getRoleColor(
                                                                    user.role,
                                                                )}
                                                            >
                                                                {user.role}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <div>
                                                                {
                                                                    user.tasksCount
                                                                }{" "}
                                                                tasks,{" "}
                                                                {
                                                                    user.projectsCount
                                                                }{" "}
                                                                projects
                                                            </div>
                                                            <div>
                                                                Last:{" "}
                                                                {user.lastLogin
                                                                    ? formatRelativeTime(
                                                                          user.lastLogin,
                                                                      )
                                                                    : "Never"}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedUser(
                                                                            user,
                                                                        );
                                                                        setShowUserModal(
                                                                            true,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                {!user.isVerified && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            handleUserAction(
                                                                                "verify",
                                                                                user.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <UserCheck className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleUserAction(
                                                                            user.isActive
                                                                                ? "suspend"
                                                                                : "activate",
                                                                            user.id,
                                                                        )
                                                                    }
                                                                >
                                                                    {user.isActive ? (
                                                                        <Lock className="w-4 h-4" />
                                                                    ) : (
                                                                        <Unlock className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "system" && systemHealth && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    System Health
                                </h2>

                                {/* Service Status */}
                                <div className="card">
                                    <h3 className="text-md font-semibold text-gray-900 mb-4">
                                        Service Status
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                {getServiceIcon(
                                                    systemHealth.authService,
                                                )}
                                                <span className="font-medium">
                                                    Authentication Service
                                                </span>
                                            </div>
                                            <Badge
                                                className={getServiceColor(
                                                    systemHealth.authService,
                                                )}
                                            >
                                                {systemHealth.authService}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                {getServiceIcon(
                                                    systemHealth.dbService,
                                                )}
                                                <span className="font-medium">
                                                    Database Service
                                                </span>
                                            </div>
                                            <Badge
                                                className={getServiceColor(
                                                    systemHealth.dbService,
                                                )}
                                            >
                                                {systemHealth.dbService}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                {getServiceIcon(
                                                    systemHealth.chatService,
                                                )}
                                                <span className="font-medium">
                                                    Chat Service
                                                </span>
                                            </div>
                                            <Badge
                                                className={getServiceColor(
                                                    systemHealth.chatService,
                                                )}
                                            >
                                                {systemHealth.chatService}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* System Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="card">
                                        <h3 className="text-md font-semibold text-gray-900 mb-4">
                                            System Information
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Version:
                                                </span>
                                                <span className="font-medium">
                                                    {systemHealth.version}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Uptime:
                                                </span>
                                                <span className="font-medium">
                                                    {systemHealth.uptime}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Database:
                                                </span>
                                                <Badge
                                                    className={
                                                        systemHealth.database ===
                                                        "connected"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                    }
                                                >
                                                    {systemHealth.database}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-md font-semibold text-gray-900 mb-4">
                                            Performance Metrics
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    System Load:
                                                </span>
                                                <span className="font-medium">
                                                    68%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Memory Usage:
                                                </span>
                                                <span className="font-medium">
                                                    2.4 GB / 8 GB
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Active Connections:
                                                </span>
                                                <span className="font-medium">
                                                    234
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    System Settings
                                </h2>

                                <div className="card">
                                    <h3 className="text-md font-semibold text-gray-900 mb-4">
                                        OAuth Configuration
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    Google OAuth
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Enable Google OAuth
                                                    authentication
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Enabled
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    Email Verification
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Require email verification
                                                    for new accounts
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Required
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    JWT Token Expiry
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Access token expiration time
                                                </p>
                                            </div>
                                            <span className="text-sm font-medium">
                                                15 minutes
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 className="text-md font-semibold text-gray-900 mb-4">
                                        Security Settings
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    Rate Limiting
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    API rate limiting is active
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Active
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    HTTPS Enforcement
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Force HTTPS for all requests
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Enforced
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    CORS Protection
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Cross-origin request
                                                    protection
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Enabled
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* User Details Modal */}
                <Modal
                    isOpen={showUserModal}
                    onClose={() => setShowUserModal(false)}
                    title="User Details"
                    size="lg"
                >
                    {selectedUser && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Username
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {selectedUser.username || "Not set"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Email
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {selectedUser.email}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Auth ID
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {selectedUser.authId}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Role
                                    </label>
                                    <Badge
                                        className={getRoleColor(
                                            selectedUser.role,
                                        )}
                                    >
                                        {selectedUser.role}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Created
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {formatDate(selectedUser.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Last Login
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {selectedUser.lastLogin
                                            ? formatDate(selectedUser.lastLogin)
                                            : "Never"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {selectedUser.tasksCount}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Tasks Created
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {selectedUser.projectsCount}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Projects
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowUserModal(false)}
                                >
                                    Close
                                </Button>
                                {!selectedUser.isVerified && (
                                    <Button
                                        onClick={() =>
                                            handleUserAction(
                                                "verify",
                                                selectedUser.id,
                                            )
                                        }
                                    >
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        Verify User
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </Layout>
    );
}
