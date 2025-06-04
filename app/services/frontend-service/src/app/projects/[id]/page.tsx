"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { Project, Task } from "@/types";
import {
    formatDate,
    getPriorityColor,
    getStatusColor,
    truncateText,
} from "@/lib/utils";
import {
    ArrowLeft,
    Users,
    CheckSquare,
    Calendar,
    MessageSquare,
    Plus,
    Edit2,
    Settings,
    User,
    Crown,
    Shield,
    Eye,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = parseInt(params.id as string);

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        try {
            setIsLoading(true);
            const projectData = await apiClient.getProject(projectId);
            setProject(projectData);
        } catch (error: any) {
            console.error("Failed to load project:", error);
            toast.error("Failed to load project");
            if (error.message.includes("not found")) {
                router.push("/projects");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Loading size="lg" text="Loading project..." />
                </div>
            </Layout>
        );
    }

    if (!project) {
        return (
            <Layout>
                <div className="p-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Project Not Found
                        </h1>
                        <p className="text-gray-600 mb-4">
                            The project you're looking for doesn't exist or you
                            don't have access to it.
                        </p>
                        <Link href="/projects">
                            <Button>Back to Projects</Button>
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "OWNER":
                return <Crown className="w-4 h-4 text-yellow-600" />;
            case "ADMIN":
                return <Shield className="w-4 h-4 text-blue-600" />;
            case "MEMBER":
                return <User className="w-4 h-4 text-green-600" />;
            case "VIEWER":
                return <Eye className="w-4 h-4 text-gray-600" />;
            default:
                return <User className="w-4 h-4 text-gray-600" />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "OWNER":
                return "bg-yellow-100 text-yellow-800";
            case "ADMIN":
                return "bg-blue-100 text-blue-800";
            case "MEMBER":
                return "bg-green-100 text-green-800";
            case "VIEWER":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/projects">
                            <Button variant="ghost" size="sm" className="mr-4">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Projects
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {project.name}
                            </h1>
                            <p className="text-gray-600">Project Details</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <Link href={`/projects/${project.id}/chat`}>
                            <Button>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Open Chat
                            </Button>
                        </Link>
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </div>

                {/* Project Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">
                                Description
                            </h2>
                            {project.description ? (
                                <p className="text-gray-600">
                                    {project.description}
                                </p>
                            ) : (
                                <p className="text-gray-500 italic">
                                    No description provided
                                </p>
                            )}
                        </div>

                        {/* Recent Tasks */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Recent Tasks
                                </h2>
                                <Link href={`/tasks?projectId=${project.id}`}>
                                    <Button variant="outline" size="sm">
                                        View All
                                    </Button>
                                </Link>
                            </div>

                            {project.tasks && project.tasks.length > 0 ? (
                                <div className="space-y-3">
                                    {project.tasks.slice(0, 5).map((task) => (
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
                                    ))}
                                    {project.tasks.length > 5 && (
                                        <div className="text-center pt-2">
                                            <Link
                                                href={`/tasks?projectId=${project.id}`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    View{" "}
                                                    {project.tasks.length - 5}{" "}
                                                    more tasks
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <CheckSquare className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-500">
                                        No tasks in this project yet
                                    </p>
                                    <Link
                                        href={`/tasks/new?projectId=${project.id}`}
                                    >
                                        <Button size="sm" className="mt-2">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Task
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Project Stats */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Project Stats
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <CheckSquare className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-600">
                                            Total Tasks
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {project._count.tasks}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-600">
                                            Team Members
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {project._count.members}
                                    </span>
                                </div>
                                {project.chatCount !== undefined && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">
                                                Chat Channels
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium">
                                            {project.chatCount}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-600">
                                            Created
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatDate(project.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Team Members */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Team Members
                                </h3>
                                <Button variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Member
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {project.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    User {member.user.authId}
                                                </p>
                                                <div className="flex items-center space-x-1">
                                                    {getRoleIcon(member.role)}
                                                    <Badge
                                                        className={getRoleColor(
                                                            member.role,
                                                        )}
                                                    >
                                                        {member.role}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Quick Actions
                            </h3>
                            <div className="space-y-2">
                                <Link
                                    href={`/tasks/new?projectId=${project.id}`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Task
                                    </Button>
                                </Link>
                                <Link
                                    href={`/projects/${project.id}/chat`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Open Chat
                                    </Button>
                                </Link>
                                <Link
                                    href={`/tasks?projectId=${project.id}`}
                                    className="w-full"
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                    >
                                        <CheckSquare className="w-4 h-4 mr-2" />
                                        View All Tasks
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
