"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { UserProfile, TaskStatistics, Task, Project } from "@/types";
import { formatDate, getPriorityColor, getStatusColor } from "@/lib/utils";
import {
    CheckSquare,
    Folder,
    Clock,
    AlertTriangle,
    TrendingUp,
    Calendar,
    Users,
    Plus,
} from "lucide-react";
import Link from "next/link";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

export default function DashboardPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
    const [recentTasks, setRecentTasks] = useState<Task[]>([]);
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            const [profileData, statsData, tasksData, projectsData] =
                await Promise.all([
                    apiClient.getUserProfile(),
                    apiClient.getTaskStatistics(),
                    apiClient.getTasks({
                        limit: 5,
                        sortBy: "updatedAt",
                        sortOrder: "desc",
                    }),
                    apiClient.getProjects({
                        limit: 5,
                        sortBy: "updatedAt",
                        sortOrder: "desc",
                    }),
                ]);

            setProfile(profileData);
            setStatistics(statsData);
            setRecentTasks(tasksData.tasks);
            setRecentProjects(projectsData.projects);
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Loading size="lg" text="Loading dashboard..." />
                </div>
            </Layout>
        );
    }

    const statusData = statistics
        ? [
              {
                  name: "Todo",
                  value: statistics.byStatus.TODO,
                  color: "#6b7280",
              },
              {
                  name: "In Progress",
                  value: statistics.byStatus.IN_PROGRESS,
                  color: "#3b82f6",
              },
              {
                  name: "Review",
                  value: statistics.byStatus.REVIEW,
                  color: "#8b5cf6",
              },
              {
                  name: "Done",
                  value: statistics.byStatus.DONE,
                  color: "#10b981",
              },
              {
                  name: "Canceled",
                  value: statistics.byStatus.CANCELED,
                  color: "#ef4444",
              },
          ]
        : [];

    const chartData = statistics
        ? [
              { name: "Todo", count: statistics.byStatus.TODO },
              { name: "In Progress", count: statistics.byStatus.IN_PROGRESS },
              { name: "Review", count: statistics.byStatus.REVIEW },
              { name: "Done", count: statistics.byStatus.DONE },
              { name: "Canceled", count: statistics.byStatus.CANCELED },
          ]
        : [];

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Dashboard
                        </h1>
                        <p className="text-gray-600">
                            Welcome back! Here's what's happening.
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Link href="/tasks/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                New Task
                            </Button>
                        </Link>
                        <Link href="/projects/new">
                            <Button variant="secondary">
                                <Plus className="w-4 h-4 mr-2" />
                                New Project
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <CheckSquare className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Total Tasks
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {profile?.statistics.ownedTasks || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Folder className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Projects
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {profile?.statistics.projects || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    In Progress
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {statistics?.byStatus.IN_PROGRESS || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">
                                    Completion Rate
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {statistics?.completion.completionRate || 0}
                                    %
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Status Chart */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Task Status Overview
                        </h3>
                        {statistics ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-300 flex items-center justify-center text-gray-500">
                                No data available
                            </div>
                        )}
                    </div>

                    {/* Task Distribution Pie Chart */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Task Distribution
                        </h3>
                        {statistics ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(0)}%`
                                        }
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-300 flex items-center justify-center text-gray-500">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Tasks */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Recent Tasks
                            </h3>
                            <Link href="/tasks">
                                <Button variant="ghost" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentTasks.length > 0 ? (
                                recentTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {task.title}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge
                                                    variant="gray"
                                                    className={getStatusColor(
                                                        task.status,
                                                    )}
                                                >
                                                    {task.status.replace(
                                                        "_",
                                                        " ",
                                                    )}
                                                </Badge>
                                                <Badge
                                                    variant="gray"
                                                    className={getPriorityColor(
                                                        task.priority,
                                                    )}
                                                >
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(task.updatedAt)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">
                                    No recent tasks
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Recent Projects */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Recent Projects
                            </h3>
                            <Link href="/projects">
                                <Button variant="ghost" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentProjects.length > 0 ? (
                                recentProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {project.name}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <CheckSquare className="w-3 h-3 mr-1" />
                                                    {project._count.tasks} tasks
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {project._count.members}{" "}
                                                    members
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(project.updatedAt)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">
                                    No recent projects
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
