"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api";
import { Notification, NotificationType } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    Trash2,
    Calendar,
    User,
    MessageSquare,
    AlertTriangle,
    Info,
    Filter,
    MoreHorizontal,
    Eye,
    BarChart3,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedNotification, setSelectedNotification] =
        useState<Notification | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [filters, setFilters] = useState({
        unreadOnly: false,
        type: "" as NotificationType | "",
        sortBy: "createdAt",
        sortOrder: "desc" as "asc" | "desc",
        page: 1,
        limit: 50,
    });

    useEffect(() => {
        loadNotifications();
        loadStatistics();
    }, [filters]);

    const loadNotifications = async () => {
        try {
            setIsLoading(true);
            const notificationsData = await apiClient.getNotifications(filters);
            setNotifications(notificationsData);
        } catch (error) {
            console.error("Failed to load notifications:", error);
            toast.error("Failed to load notifications");
        } finally {
            setIsLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const statsData = await apiClient.getNotificationStatistics();
            setStatistics(statsData);
        } catch (error) {
            console.error("Failed to load notification statistics:", error);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await apiClient.markNotificationAsRead(id);
            setNotifications((prev) =>
                prev.map((notification) =>
                    notification.id === id
                        ? { ...notification, isRead: true }
                        : notification,
                ),
            );
            toast.success("Notification marked as read");
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to mark notification as read:", error);
            toast.error(error.message || "Failed to mark notification as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiClient.markAllNotificationsAsRead();
            setNotifications((prev) =>
                prev.map((notification) => ({ ...notification, isRead: true })),
            );
            toast.success("All notifications marked as read");
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to mark all notifications as read:", error);
            toast.error(
                error.message || "Failed to mark all notifications as read",
            );
        }
    };

    const handleDeleteNotification = async (id: number) => {
        try {
            await apiClient.deleteNotification(id);
            setNotifications((prev) =>
                prev.filter((notification) => notification.id !== id),
            );
            toast.success("Notification deleted");
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to delete notification:", error);
            toast.error(error.message || "Failed to delete notification");
        }
    };

    const handleDeleteAllRead = async () => {
        try {
            const result = await apiClient.deleteAllReadNotifications();
            setNotifications((prev) =>
                prev.filter((notification) => !notification.isRead),
            );
            toast.success(result.message);
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to delete read notifications:", error);
            toast.error(error.message || "Failed to delete read notifications");
        }
    };

    const handleSendDueDateReminders = async () => {
        try {
            const result = await apiClient.sendDueDateReminders();
            toast.success(result.message);
            loadNotifications();
        } catch (error: any) {
            console.error("Failed to send due date reminders:", error);
            toast.error(error.message || "Failed to send due date reminders");
        }
    };

    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case "DUE_DATE_REMINDER":
                return <Calendar className="w-5 h-5 text-orange-500" />;
            case "TASK_ASSIGNED":
                return <User className="w-5 h-5 text-blue-500" />;
            case "TASK_STATUS_CHANGED":
                return <CheckCheck className="w-5 h-5 text-green-500" />;
            case "COMMENT_ADDED":
                return <MessageSquare className="w-5 h-5 text-purple-500" />;
            case "PROJECT_INVITE":
                return <User className="w-5 h-5 text-indigo-500" />;
            default:
                return <Info className="w-5 h-5 text-gray-500" />;
        }
    };

    const getTypeColor = (type: NotificationType): string => {
        switch (type) {
            case "DUE_DATE_REMINDER":
                return "bg-orange-100 text-orange-800";
            case "TASK_ASSIGNED":
                return "bg-blue-100 text-blue-800";
            case "TASK_STATUS_CHANGED":
                return "bg-green-100 text-green-800";
            case "COMMENT_ADDED":
                return "bg-purple-100 text-purple-800";
            case "PROJECT_INVITE":
                return "bg-indigo-100 text-indigo-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    const hasUnread = unreadCount > 0;

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Bell className="w-6 h-6 mr-3" />
                            Notifications
                            {hasUnread && (
                                <Badge variant="danger" className="ml-3">
                                    {unreadCount} unread
                                </Badge>
                            )}
                        </h1>
                        <p className="text-gray-600">
                            Stay updated with your tasks and projects
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowStatsModal(true)}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Statistics
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleSendDueDateReminders}
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Send Reminders
                        </Button>
                        {hasUnread && (
                            <Button onClick={handleMarkAllAsRead}>
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Mark All Read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                className={
                                    showFilters
                                        ? "border-primary-500 text-primary-700"
                                        : ""
                                }
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                            </Button>
                            <div className="flex items-center space-x-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={filters.unreadOnly}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                unreadOnly: e.target.checked,
                                                page: 1,
                                            }))
                                        }
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Unread only
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeleteAllRead}
                                disabled={!notifications.some((n) => n.isRead)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Read
                            </Button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={filters.type}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                type: e.target.value as
                                                    | NotificationType
                                                    | "",
                                                page: 1,
                                            }))
                                        }
                                        className="input"
                                    >
                                        <option value="">All Types</option>
                                        <option value="DUE_DATE_REMINDER">
                                            Due Date Reminders
                                        </option>
                                        <option value="TASK_ASSIGNED">
                                            Task Assignments
                                        </option>
                                        <option value="TASK_STATUS_CHANGED">
                                            Status Changes
                                        </option>
                                        <option value="COMMENT_ADDED">
                                            Comments
                                        </option>
                                        <option value="PROJECT_INVITE">
                                            Project Invites
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sort By
                                    </label>
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                sortBy: e.target.value,
                                                page: 1,
                                            }))
                                        }
                                        className="input"
                                    >
                                        <option value="createdAt">
                                            Date Created
                                        </option>
                                        <option value="type">Type</option>
                                        <option value="isRead">
                                            Read Status
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Order
                                    </label>
                                    <select
                                        value={filters.sortOrder}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                sortOrder: e.target.value as
                                                    | "asc"
                                                    | "desc",
                                                page: 1,
                                            }))
                                        }
                                        className="input"
                                    >
                                        <option value="desc">
                                            Newest First
                                        </option>
                                        <option value="asc">
                                            Oldest First
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    {statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {statistics.totalCount}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Total
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {statistics.unreadCount}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Unread
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {statistics.readCount}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Read
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {
                                        Object.keys(statistics.byType || {})
                                            .length
                                    }
                                </div>
                                <div className="text-sm text-gray-600">
                                    Types
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications List */}
                <div className="card">
                    {isLoading ? (
                        <Loading text="Loading notifications..." />
                    ) : notifications.length > 0 ? (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <NotificationCard
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={() =>
                                        handleMarkAsRead(notification.id)
                                    }
                                    onDelete={() =>
                                        handleDeleteNotification(
                                            notification.id,
                                        )
                                    }
                                    onViewDetails={() => {
                                        setSelectedNotification(notification);
                                        setShowDetailsModal(true);
                                    }}
                                    getIcon={getNotificationIcon}
                                    getTypeColor={getTypeColor}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BellOff className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No notifications found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {filters.unreadOnly || filters.type
                                    ? "Try adjusting your filters."
                                    : "You're all caught up! New notifications will appear here."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Statistics Modal */}
                <Modal
                    isOpen={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                    title="Notification Statistics"
                    size="lg"
                >
                    {statistics && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {statistics.totalCount}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Notifications
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {statistics.unreadCount}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Unread
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {statistics.readCount}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Read
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {Math.round(
                                            (statistics.readCount /
                                                statistics.totalCount) *
                                                100,
                                        ) || 0}
                                        %
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Read Rate
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4">
                                    Notifications by Type
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(
                                        statistics.byType || {},
                                    ).map(([type, count]: [string, any]) => (
                                        <div
                                            key={type}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {getNotificationIcon(
                                                    type as NotificationType,
                                                )}
                                                <span className="font-medium">
                                                    {type.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                            <Badge
                                                className={getTypeColor(
                                                    type as NotificationType,
                                                )}
                                            >
                                                {count}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Notification Details Modal */}
                <Modal
                    isOpen={showDetailsModal}
                    onClose={() => setShowDetailsModal(false)}
                    title="Notification Details"
                >
                    {selectedNotification && (
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                {getNotificationIcon(selectedNotification.type)}
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Badge
                                            className={getTypeColor(
                                                selectedNotification.type,
                                            )}
                                        >
                                            {selectedNotification.type.replace(
                                                /_/g,
                                                " ",
                                            )}
                                        </Badge>
                                        <Badge
                                            variant={
                                                selectedNotification.isRead
                                                    ? "success"
                                                    : "warning"
                                            }
                                        >
                                            {selectedNotification.isRead
                                                ? "Read"
                                                : "Unread"}
                                        </Badge>
                                    </div>
                                    <p className="text-gray-900 mb-2">
                                        {selectedNotification.content}
                                    </p>
                                    <div className="text-sm text-gray-500">
                                        <div>
                                            Created:{" "}
                                            {formatDate(
                                                selectedNotification.createdAt,
                                            )}
                                        </div>
                                        <div>
                                            Time ago:{" "}
                                            {formatRelativeTime(
                                                selectedNotification.createdAt,
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedNotification.relatedTask && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-2">
                                        Related Task
                                    </h4>
                                    <div className="text-sm">
                                        <div className="font-medium">
                                            {
                                                selectedNotification.relatedTask
                                                    .title
                                            }
                                        </div>
                                        <div className="text-gray-600">
                                            Status:{" "}
                                            {selectedNotification.relatedTask.status.replace(
                                                /_/g,
                                                " ",
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/tasks/${selectedNotification.relatedTask.id}`}
                                    >
                                        <Button size="sm" className="mt-2">
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Task
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                {!selectedNotification.isRead && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleMarkAsRead(
                                                selectedNotification.id,
                                            );
                                            setShowDetailsModal(false);
                                        }}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark as Read
                                    </Button>
                                )}
                                <Button
                                    variant="danger"
                                    onClick={() => {
                                        handleDeleteNotification(
                                            selectedNotification.id,
                                        );
                                        setShowDetailsModal(false);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </Layout>
    );
}

// Notification Card Component
interface NotificationCardProps {
    notification: Notification;
    onMarkAsRead: () => void;
    onDelete: () => void;
    onViewDetails: () => void;
    getIcon: (type: NotificationType) => React.ReactNode;
    getTypeColor: (type: NotificationType) => string;
}

function NotificationCard({
    notification,
    onMarkAsRead,
    onDelete,
    onViewDetails,
    getIcon,
    getTypeColor,
}: NotificationCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`p-4 border rounded-lg transition-colors ${
                notification.isRead
                    ? "bg-white border-gray-200"
                    : "bg-blue-50 border-blue-200"
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getTypeColor(notification.type)}>
                                {notification.type.replace(/_/g, " ")}
                            </Badge>
                            {!notification.isRead && (
                                <Badge variant="warning" className="text-xs">
                                    NEW
                                </Badge>
                            )}
                        </div>
                        <p className="text-gray-900 text-sm mb-1">
                            {notification.content}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                                {formatRelativeTime(notification.createdAt)}
                            </span>
                            {notification.relatedTask && (
                                <Link
                                    href={`/tasks/${notification.relatedTask.id}`}
                                    className="text-primary-600 hover:text-primary-500"
                                >
                                    View Task
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowActions(!showActions)}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>

                    {showActions && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        onViewDetails();
                                        setShowActions(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                </button>
                                {!notification.isRead && (
                                    <button
                                        onClick={() => {
                                            onMarkAsRead();
                                            setShowActions(false);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark as Read
                                    </button>
                                )}
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={() => {
                                        onDelete();
                                        setShowActions(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
