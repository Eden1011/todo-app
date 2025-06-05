"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/types";
import {
    formatDate,
    isValidPassword,
    getPasswordStrength,
    downloadFile,
} from "@/lib/utils";
import {
    User,
    Settings,
    Shield,
    Download,
    Trash2,
    Eye,
    EyeOff,
    Mail,
    Key,
    FileText,
    BarChart3,
    AlertTriangle,
    Check,
    X,
    ExternalLink,
    Bell,
    Globe,
    Database,
    Lock,
} from "lucide-react";
import toast from "react-hot-toast";

interface ChangePasswordForm {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface ExportForm {
    format: "csv" | "json";
    includeArchived: boolean;
    detailed: boolean;
}

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [exportInfo, setExportInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");

    // Modals
    const [showChangePasswordModal, setShowChangePasswordModal] =
        useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showResendVerificationModal, setShowResendVerificationModal] =
        useState(false);

    // Forms
    const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [exportForm, setExportForm] = useState<ExportForm>({
        format: "json",
        includeArchived: false,
        detailed: true,
    });
    const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
    const [verificationEmail, setVerificationEmail] = useState("");

    // UI State
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadProfile();
        loadExportInfo();
    }, []);

    const loadProfile = async () => {
        try {
            setIsLoading(true);
            const profileData = await apiClient.getUserProfile();
            setProfile(profileData);
            setVerificationEmail(user?.email || "");
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast.error("Failed to load profile");
        } finally {
            setIsLoading(false);
        }
    };

    const loadExportInfo = async () => {
        try {
            const exportData = await apiClient.getExportInfo();
            setExportInfo(exportData);
        } catch (error) {
            console.error("Failed to load export info:", error);
        }
    };

    const validatePasswordForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!passwordForm.oldPassword) {
            errors.oldPassword = "Current password is required";
        }

        if (!passwordForm.newPassword) {
            errors.newPassword = "New password is required";
        } else if (!isValidPassword(passwordForm.newPassword)) {
            errors.newPassword =
                "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
        }

        if (!passwordForm.confirmPassword) {
            errors.confirmPassword = "Please confirm your new password";
        } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePasswordForm()) return;

        setIsSubmitting(true);
        try {
            await apiClient.changePassword({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            });
            toast.success("Password changed successfully!");
            setShowChangePasswordModal(false);
            setPasswordForm({
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setFormErrors({});
        } catch (error: any) {
            console.error("Failed to change password:", error);
            toast.error(error.message || "Failed to change password");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteAccountPassword) {
            toast.error("Please enter your password to confirm");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.deleteAccount(deleteAccountPassword);
            toast.success("Account deleted successfully");
            logout();
        } catch (error: any) {
            console.error("Failed to delete account:", error);
            toast.error(error.message || "Failed to delete account");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        if (!verificationEmail) {
            toast.error("Please enter your email address");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.resendVerificationEmail(verificationEmail);
            toast.success("Verification email sent!");
            setShowResendVerificationModal(false);
        } catch (error: any) {
            console.error("Failed to resend verification:", error);
            toast.error(error.message || "Failed to resend verification email");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportData = async (type: "tasks" | "projects" | "backup") => {
        setIsSubmitting(true);
        try {
            let blob: Blob;
            let filename: string;

            switch (type) {
                case "tasks":
                    if (exportForm.format === "csv") {
                        blob = await apiClient.exportTasksCSV({
                            includeArchived: exportForm.includeArchived,
                        });
                        filename = `tasks_${new Date().toISOString().split("T")[0]}.csv`;
                    } else {
                        blob = await apiClient.exportTasksJSON({
                            detailed: exportForm.detailed,
                            includeArchived: exportForm.includeArchived,
                        });
                        filename = `tasks_${new Date().toISOString().split("T")[0]}.json`;
                    }
                    break;
                case "projects":
                    if (exportForm.format === "csv") {
                        blob = await apiClient.exportProjectsCSV();
                        filename = `projects_${new Date().toISOString().split("T")[0]}.csv`;
                    } else {
                        blob = await apiClient.exportProjectsJSON({
                            detailed: exportForm.detailed,
                        });
                        filename = `projects_${new Date().toISOString().split("T")[0]}.json`;
                    }
                    break;
                case "backup":
                    blob = await apiClient.exportUserDataBackup();
                    filename = `backup_${new Date().toISOString().split("T")[0]}.json`;
                    break;
                default:
                    throw new Error("Invalid export type");
            }

            downloadFile(blob, filename, blob.type);
            toast.success(`${type} exported successfully!`);
            setShowExportModal(false);
        } catch (error: any) {
            console.error(`Failed to export ${type}:`, error);
            toast.error(error.message || `Failed to export ${type}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const passwordStrength = getPasswordStrength(passwordForm.newPassword);

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "security", label: "Security", icon: Shield },
        { id: "data", label: "Data & Export", icon: Download },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Loading size="lg" text="Loading settings..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Settings className="w-6 h-6 mr-3" />
                        Settings
                    </h1>
                    <p className="text-gray-600">
                        Manage your account, security, and preferences
                    </p>
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
                                            ? "bg-primary-100 text-primary-700"
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
                        {activeTab === "profile" && (
                            <div className="space-y-6">
                                {/* User Info */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Profile Information
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                                                <User className="w-8 h-8 text-primary-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-900">
                                                    {user?.username || "User"}
                                                </h3>
                                                <p className="text-gray-600">
                                                    {user?.email}
                                                </p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {user?.isVerified ? (
                                                        <Badge
                                                            variant="success"
                                                            className="text-xs"
                                                        >
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Verified
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="warning"
                                                            className="text-xs"
                                                        >
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Unverified
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {!user?.isVerified && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <div className="flex items-center">
                                                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                                                    <span className="text-sm text-yellow-800">
                                                        Your email address is
                                                        not verified.
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setShowResendVerificationModal(
                                                                true,
                                                            )
                                                        }
                                                        className="ml-auto text-yellow-700 hover:text-yellow-800"
                                                    >
                                                        Resend verification
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Account Statistics */}
                                {profile && (
                                    <div className="card">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                            Account Overview
                                        </h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {
                                                        profile.statistics
                                                            .ownedTasks
                                                    }
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Owned Tasks
                                                </div>
                                            </div>
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {
                                                        profile.statistics
                                                            .projects
                                                    }
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Projects
                                                </div>
                                            </div>
                                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {
                                                        profile.statistics
                                                            .categories
                                                    }
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Categories
                                                </div>
                                            </div>
                                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {profile.statistics.tags}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Tags
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 text-sm text-gray-500">
                                            Member since{" "}
                                            {formatDate(profile.user.createdAt)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div className="space-y-6">
                                {/* Password */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Password & Authentication
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    Password
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Keep your account secure
                                                    with a strong password
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setShowChangePasswordModal(
                                                        true,
                                                    )
                                                }
                                            >
                                                <Key className="w-4 h-4 mr-2" />
                                                Change Password
                                            </Button>
                                        </div>

                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        Two-Factor
                                                        Authentication
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        Add an extra layer of
                                                        security to your account
                                                    </p>
                                                </div>
                                                <Badge variant="gray">
                                                    Coming Soon
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        Connected Accounts
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        Link your account with
                                                        external services
                                                    </p>
                                                </div>
                                                <Button variant="outline">
                                                    <Globe className="w-4 h-4 mr-2" />
                                                    Connect Google
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="card border-red-200 bg-red-50">
                                    <h2 className="text-lg font-semibold text-red-900 mb-4">
                                        Danger Zone
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-red-900">
                                                    Delete Account
                                                </h3>
                                                <p className="text-sm text-red-700">
                                                    Permanently delete your
                                                    account and all associated
                                                    data
                                                </p>
                                            </div>
                                            <Button
                                                variant="danger"
                                                onClick={() =>
                                                    setShowDeleteAccountModal(
                                                        true,
                                                    )
                                                }
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Account
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "data" && (
                            <div className="space-y-6">
                                {/* Export Data */}
                                <div className="card">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Data Export
                                    </h2>
                                    {exportInfo && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {
                                                            exportInfo
                                                                .availableData
                                                                .tasks
                                                        }
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Tasks
                                                    </div>
                                                </div>
                                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {
                                                            exportInfo
                                                                .availableData
                                                                .projects
                                                        }
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Projects
                                                    </div>
                                                </div>
                                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-purple-600">
                                                        {
                                                            exportInfo
                                                                .availableData
                                                                .categories
                                                        }
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Categories
                                                    </div>
                                                </div>
                                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-orange-600">
                                                        {
                                                            exportInfo
                                                                .availableData
                                                                .tags
                                                        }
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Tags
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <h3 className="text-sm font-medium text-gray-900">
                                                            Export Tasks
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            Download all your
                                                            tasks in CSV or JSON
                                                            format
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setExportForm({
                                                                format: "json",
                                                                includeArchived:
                                                                    false,
                                                                detailed: true,
                                                            });
                                                            setShowExportModal(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Export
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <h3 className="text-sm font-medium text-gray-900">
                                                            Export Projects
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            Download all your
                                                            projects and their
                                                            details
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleExportData(
                                                                "projects",
                                                            )
                                                        }
                                                        disabled={isSubmitting}
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Export
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                                                    <div>
                                                        <h3 className="text-sm font-medium text-blue-900">
                                                            Complete Data Backup
                                                        </h3>
                                                        <p className="text-sm text-blue-700">
                                                            Download everything:
                                                            tasks, projects,
                                                            categories, tags,
                                                            and notifications
                                                        </p>
                                                    </div>
                                                    <Button
                                                        onClick={() =>
                                                            handleExportData(
                                                                "backup",
                                                            )
                                                        }
                                                        disabled={isSubmitting}
                                                    >
                                                        <Database className="w-4 h-4 mr-2" />
                                                        Backup All
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="space-y-6">
                                <div className="card">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                        Notification Preferences
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    Due Date Reminders
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Get notified when tasks are
                                                    due soon
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Enabled
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    Task Assignments
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Get notified when tasks are
                                                    assigned to you
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Enabled
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    Project Updates
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Get notified about project
                                                    activity
                                                </p>
                                            </div>
                                            <Badge variant="success">
                                                Enabled
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-4">
                                            <p>
                                                Notification settings are
                                                currently managed automatically.
                                                More customization options
                                                coming soon.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Change Password Modal */}
                <Modal
                    isOpen={showChangePasswordModal}
                    onClose={() => {
                        setShowChangePasswordModal(false);
                        setPasswordForm({
                            oldPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                        });
                        setFormErrors({});
                    }}
                    title="Change Password"
                >
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="relative">
                            <Input
                                label="Current Password"
                                type={showOldPassword ? "text" : "password"}
                                value={passwordForm.oldPassword}
                                onChange={(e) =>
                                    setPasswordForm((prev) => ({
                                        ...prev,
                                        oldPassword: e.target.value,
                                    }))
                                }
                                error={formErrors.oldPassword}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                                onClick={() =>
                                    setShowOldPassword(!showOldPassword)
                                }
                            >
                                {showOldPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <Input
                                label="New Password"
                                type={showNewPassword ? "text" : "password"}
                                value={passwordForm.newPassword}
                                onChange={(e) =>
                                    setPasswordForm((prev) => ({
                                        ...prev,
                                        newPassword: e.target.value,
                                    }))
                                }
                                error={formErrors.newPassword}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                                onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                }
                            >
                                {showNewPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {passwordForm.newPassword && (
                            <div className="text-sm">
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-600">
                                        Password strength:
                                    </span>
                                    <span className={passwordStrength.color}>
                                        {passwordStrength.text}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Input
                                label="Confirm New Password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordForm.confirmPassword}
                                onChange={(e) =>
                                    setPasswordForm((prev) => ({
                                        ...prev,
                                        confirmPassword: e.target.value,
                                    }))
                                }
                                error={formErrors.confirmPassword}
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

                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    setShowChangePasswordModal(false)
                                }
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                Change Password
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Account Modal */}
                <Modal
                    isOpen={showDeleteAccountModal}
                    onClose={() => setShowDeleteAccountModal(false)}
                    title="Delete Account"
                >
                    <div className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                                <div>
                                    <h3 className="text-sm font-medium text-red-800">
                                        This action cannot be undone
                                    </h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        This will permanently delete your
                                        account and all associated data
                                        including:
                                    </p>
                                    <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                                        <li>All tasks and projects</li>
                                        <li>Categories and tags</li>
                                        <li>Chat messages and notifications</li>
                                        <li>User profile and settings</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <Input
                            label="Enter your password to confirm"
                            type="password"
                            value={deleteAccountPassword}
                            onChange={(e) =>
                                setDeleteAccountPassword(e.target.value)
                            }
                            placeholder="Your current password"
                            required
                        />

                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowDeleteAccountModal(false);
                                    setDeleteAccountPassword("");
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDeleteAccount}
                                isLoading={isSubmitting}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Account
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Export Modal */}
                <Modal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    title="Export Tasks"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Format
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="json"
                                        checked={exportForm.format === "json"}
                                        onChange={(e) =>
                                            setExportForm((prev) => ({
                                                ...prev,
                                                format: e.target
                                                    .value as "json",
                                            }))
                                        }
                                        className="text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-sm">
                                        JSON (Detailed)
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="csv"
                                        checked={exportForm.format === "csv"}
                                        onChange={(e) =>
                                            setExportForm((prev) => ({
                                                ...prev,
                                                format: e.target.value as "csv",
                                            }))
                                        }
                                        className="text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-sm">
                                        CSV (Spreadsheet)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={exportForm.includeArchived}
                                    onChange={(e) =>
                                        setExportForm((prev) => ({
                                            ...prev,
                                            includeArchived: e.target.checked,
                                        }))
                                    }
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Include canceled/archived tasks
                                </span>
                            </label>
                            {exportForm.format === "json" && (
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportForm.detailed}
                                        onChange={(e) =>
                                            setExportForm((prev) => ({
                                                ...prev,
                                                detailed: e.target.checked,
                                            }))
                                        }
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Include detailed information
                                        (categories, tags, etc.)
                                    </span>
                                </label>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowExportModal(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleExportData("tasks")}
                                isLoading={isSubmitting}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Tasks
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Resend Verification Modal */}
                <Modal
                    isOpen={showResendVerificationModal}
                    onClose={() => setShowResendVerificationModal(false)}
                    title="Resend Verification Email"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            We'll send a verification link to your email
                            address.
                        </p>
                        <Input
                            label="Email Address"
                            type="email"
                            value={verificationEmail}
                            onChange={(e) =>
                                setVerificationEmail(e.target.value)
                            }
                            placeholder="your@email.com"
                            required
                        />
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    setShowResendVerificationModal(false)
                                }
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleResendVerification}
                                isLoading={isSubmitting}
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Send Verification
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
}
