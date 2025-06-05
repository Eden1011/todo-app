"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { useSocket } from "@/contexts/SocketContext";
import { Project, Chat, ChatStatistics } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
    MessageSquare,
    Hash,
    Users,
    Search,
    Plus,
    Activity,
    Clock,
    TrendingUp,
    BarChart3,
    ArrowRight,
    Wifi,
    WifiOff,
    User,
    Send,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ChatPage() {
    const { isConnected } = useSocket();
    const [projects, setProjects] = useState<Project[]>([]);
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [chatStats, setChatStats] = useState<ChatStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [projectsData, chatsData, statsData] = await Promise.all([
                apiClient.getProjects({ includeChats: true, limit: 100 }),
                apiClient.getChats(),
                apiClient.getChatStatistics(),
            ]);

            setProjects(projectsData.projects);
            setAllChats(chatsData);
            setChatStats(statsData);
        } catch (error) {
            console.error("Failed to load chat data:", error);
            toast.error("Failed to load chat data");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProjects = projects.filter((project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const filteredChats = allChats.filter((chat) => {
        const matchesSearch =
            chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chat.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProject = selectedProject
            ? chat.projectId === selectedProject
            : true;
        return matchesSearch && matchesProject;
    });

    const recentChats = allChats
        .sort(
            (a, b) =>
                new Date(b.lastActivity).getTime() -
                new Date(a.lastActivity).getTime(),
        )
        .slice(0, 5);

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Loading size="lg" text="Loading chat overview..." />
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
                            <MessageSquare className="w-6 h-6 mr-3" />
                            Team Chat
                            <div className="ml-3 flex items-center">
                                {isConnected ? (
                                    <Badge
                                        variant="success"
                                        className="text-xs"
                                    >
                                        <Wifi className="w-3 h-3 mr-1" />
                                        Connected
                                    </Badge>
                                ) : (
                                    <Badge variant="danger" className="text-xs">
                                        <WifiOff className="w-3 h-3 mr-1" />
                                        Disconnected
                                    </Badge>
                                )}
                            </div>
                        </h1>
                        <p className="text-gray-600">
                            Collaborate with your team across all projects
                        </p>
                    </div>
                </div>

                {/* Connection Status Banner */}
                {!isConnected && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <WifiOff className="w-5 h-5 text-yellow-600 mr-2" />
                            <span className="text-sm text-yellow-800">
                                You're currently offline. Real-time features may
                                not work properly.
                            </span>
                        </div>
                    </div>
                )}

                {/* Statistics */}
                {chatStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <MessageSquare className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Chats
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {chatStats.totalChats}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Send className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Messages
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {chatStats.totalMessages}
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
                                        Active Projects
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {chatStats.projectBreakdown.length}
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
                                        New Chats
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {chatStats.chatsCreated}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            <Clock className="w-5 h-5 inline mr-2" />
                            Recent Activity
                        </h2>
                        <Button variant="ghost" size="sm">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                        </Button>
                    </div>

                    {recentChats.length > 0 ? (
                        <div className="space-y-3">
                            {recentChats.map((chat) => {
                                const project = projects.find(
                                    (p) => p.id === chat.projectId,
                                );
                                return (
                                    <Link
                                        key={chat.id}
                                        href={`/projects/${chat.projectId}/chat`}
                                        className="block"
                                    >
                                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                    <Hash className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        {chat.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-600">
                                                        in{" "}
                                                        {project?.name ||
                                                            "Unknown Project"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">
                                                        {formatRelativeTime(
                                                            chat.lastActivity,
                                                        )}
                                                    </div>
                                                    {chat.messageCount && (
                                                        <div className="text-xs text-gray-400">
                                                            {chat.messageCount}{" "}
                                                            messages
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">
                                No recent chat activity
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Projects with Chat */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                <Users className="w-5 h-5 inline mr-2" />
                                Project Channels
                            </h2>
                        </div>

                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search projects..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredProjects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}/chat`}
                                    className="block"
                                >
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                <Users className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    {project.name}
                                                </h3>
                                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                                    <span>
                                                        {project._count.members}{" "}
                                                        members
                                                    </span>
                                                    <span>
                                                        {project.chatCount || 0}{" "}
                                                        channels
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {project.chatCount &&
                                                project.chatCount > 0 && (
                                                    <Badge
                                                        variant="primary"
                                                        className="text-xs"
                                                    >
                                                        {project.chatCount}
                                                    </Badge>
                                                )}
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* All Chat Channels */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                <Hash className="w-5 h-5 inline mr-2" />
                                All Channels
                            </h2>
                            <div className="flex space-x-2">
                                <select
                                    value={selectedProject || ""}
                                    onChange={(e) =>
                                        setSelectedProject(
                                            e.target.value
                                                ? parseInt(e.target.value)
                                                : null,
                                        )
                                    }
                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                >
                                    <option value="">All Projects</option>
                                    {projects.map((project) => (
                                        <option
                                            key={project.id}
                                            value={project.id}
                                        >
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredChats.length > 0 ? (
                                filteredChats.map((chat) => {
                                    const project = projects.find(
                                        (p) => p.id === chat.projectId,
                                    );
                                    return (
                                        <Link
                                            key={chat.id}
                                            href={`/projects/${chat.projectId}/chat`}
                                            className="block"
                                        >
                                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                        <Hash className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-medium text-gray-900">
                                                            {chat.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-600">
                                                            {project?.name ||
                                                                "Unknown Project"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">
                                                        {formatRelativeTime(
                                                            chat.lastActivity,
                                                        )}
                                                    </div>
                                                    {chat.messageCount && (
                                                        <div className="text-xs text-gray-400">
                                                            {chat.messageCount}{" "}
                                                            messages
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <Hash className="mx-auto h-8 w-8 text-gray-300" />
                                    <p className="mt-2 text-sm text-gray-500">
                                        {searchTerm
                                            ? "No channels found"
                                            : "No chat channels yet"}
                                    </p>
                                    {!searchTerm && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Create projects to start chatting
                                            with your team
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/projects/new">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Project
                            </Button>
                        </Link>
                        <Link href="/projects">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                View All Projects
                            </Button>
                        </Link>
                        <Link href="/search?q=chat">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Search Messages
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Chat Guidelines */}
                <div className="card bg-blue-50 border-blue-200">
                    <h3 className="text-md font-semibold text-blue-900 mb-3">
                        💬 Chat Guidelines
                    </h3>
                    <div className="space-y-2 text-sm text-blue-800">
                        <p>
                            • Keep conversations relevant to the project and
                            channel topic
                        </p>
                        <p>• Use @mentions to get someone's attention</p>
                        <p>
                            • Create specific channels for different topics to
                            keep discussions organized
                        </p>
                        <p>
                            • Be respectful and professional in all
                            communications
                        </p>
                        <p>
                            • Use threads for detailed discussions to keep
                            channels clean
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
