"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { Project, Chat, Message, CreateChatData } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
    ArrowLeft,
    Send,
    Plus,
    Settings,
    Search,
    Users,
    Hash,
    Download,
    Edit2,
    Trash2,
    MoreHorizontal,
    MessageSquare,
    User,
    Smile,
    Paperclip,
    Phone,
    Video,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProjectChatPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const {
        socket,
        isConnected,
        joinProject,
        leaveProject,
        sendMessage,
        editMessage,
        deleteMessage,
        startTyping,
        stopTyping,
        onNewMessage,
        onMessageEdited,
        onMessageDeleted,
        onUserTyping,
    } = useSocket();

    const projectId = parseInt(params.id as string);
    const [project, setProject] = useState<Project | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
    const [editingMessage, setEditingMessage] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    // Modals
    const [showCreateChatModal, setShowCreateChatModal] = useState(false);
    const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Forms
    const [chatForm, setChatForm] = useState<CreateChatData>({
        projectId,
        name: "",
        description: "",
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        loadProject();
        loadChats();
    }, [projectId]);

    useEffect(() => {
        if (chats.length > 0 && !selectedChat) {
            setSelectedChat(chats[0]);
        }
    }, [chats, selectedChat]);

    useEffect(() => {
        if (selectedChat) {
            loadMessages();
        }
    }, [selectedChat]);

    useEffect(() => {
        if (socket && isConnected) {
            joinProject(projectId);

            // Set up message listeners
            onNewMessage((message: Message) => {
                if (selectedChat && message.chatId === selectedChat.id) {
                    setMessages((prev) => [message, ...prev]);
                    scrollToBottom();
                }
            });

            onMessageEdited((message: Message) => {
                setMessages((prev) =>
                    prev.map((m) => (m.id === message.id ? message : m)),
                );
            });

            onMessageDeleted(({ messageId }) => {
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
            });

            onUserTyping(({ userId, chatId, isTyping }) => {
                if (
                    selectedChat &&
                    chatId === selectedChat.id &&
                    userId !== user?.id
                ) {
                    setTypingUsers((prev) => {
                        const newSet = new Set(prev);
                        if (isTyping) {
                            newSet.add(userId);
                        } else {
                            newSet.delete(userId);
                        }
                        return newSet;
                    });
                }
            });

            return () => {
                leaveProject(projectId);
            };
        }
    }, [socket, isConnected, selectedChat, projectId, user?.id]);

    const loadProject = async () => {
        try {
            const projectData = await apiClient.getProject(projectId, true);
            setProject(projectData);
        } catch (error) {
            console.error("Failed to load project:", error);
            toast.error("Failed to load project");
            router.push("/projects");
        }
    };

    const loadChats = async () => {
        try {
            setIsLoading(true);
            const chatsData = await apiClient.getProjectChats(projectId);
            setChats(chatsData);

            // If no chats exist, try to create default chat
            if (chatsData.length === 0) {
                const defaultChatData =
                    await apiClient.getOrCreateDefaultProjectChat(projectId);
                setChats([defaultChatData.chat]);
                setSelectedChat(defaultChatData.chat);
            }
        } catch (error) {
            console.error("Failed to load chats:", error);
            toast.error("Failed to load chats");
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async () => {
        if (!selectedChat) return;

        try {
            setIsLoadingMessages(true);
            const messagesData = await apiClient.getChatMessages(
                selectedChat.id,
                {
                    limit: 50,
                    sortOrder: "desc",
                },
            );
            setMessages(messagesData.messages);
            scrollToBottom();
        } catch (error) {
            console.error("Failed to load messages:", error);
            toast.error("Failed to load messages");
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        const messageContent = newMessage.trim();
        setNewMessage("");
        stopTyping(selectedChat.id);

        // Clear typing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        try {
            sendMessage(selectedChat.id, messageContent);
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
            setNewMessage(messageContent); // Restore message on error
        }
    };

    const handleTyping = () => {
        if (!selectedChat) return;

        startTyping(selectedChat.id);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping(selectedChat.id);
        }, 3000);
    };

    const handleEditMessage = async (messageId: string) => {
        if (!editContent.trim()) return;

        try {
            editMessage(messageId, editContent.trim());
            setEditingMessage(null);
            setEditContent("");
        } catch (error) {
            console.error("Failed to edit message:", error);
            toast.error("Failed to edit message");
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            deleteMessage(messageId);
        } catch (error) {
            console.error("Failed to delete message:", error);
            toast.error("Failed to delete message");
        }
    };

    const handleCreateChat = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const newChat = await apiClient.createChat(chatForm);
            setChats((prev) => [...prev, newChat]);
            setSelectedChat(newChat);
            setShowCreateChatModal(false);
            setChatForm({ projectId, name: "", description: "" });
            toast.success("Chat created successfully!");
        } catch (error: any) {
            console.error("Failed to create chat:", error);
            toast.error(error.message || "Failed to create chat");
        }
    };

    const handleExportChat = async () => {
        if (!selectedChat) return;

        try {
            const blob = await apiClient.exportChatMessages(selectedChat.id, {
                format: "json",
                includeMetadata: true,
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${selectedChat.name}-messages-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Chat exported successfully!");
            setShowExportModal(false);
        } catch (error: any) {
            console.error("Failed to export chat:", error);
            toast.error(error.message || "Failed to export chat");
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="p-6">
                    <Loading size="lg" text="Loading project chat..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="border-b border-gray-200 bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link href={`/projects/${projectId}`}>
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Project
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    {project?.name}
                                </h1>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Project Chat</span>
                                    {isConnected ? (
                                        <Badge
                                            variant="success"
                                            className="text-xs"
                                        >
                                            Connected
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="danger"
                                            className="text-xs"
                                        >
                                            Disconnected
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCreateChatModal(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Chat
                            </Button>
                            {selectedChat && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowExportModal(true)}
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Chat Sidebar */}
                    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">
                                Chat Channels ({chats.length})
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="space-y-1 p-2">
                                {chats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                                            selectedChat?.id === chat.id
                                                ? "bg-primary-100 text-primary-700"
                                                : "hover:bg-gray-100"
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2 mb-1">
                                            <Hash className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-sm truncate">
                                                {chat.name}
                                            </span>
                                        </div>
                                        {chat.description && (
                                            <p className="text-xs text-gray-600 truncate ml-6">
                                                {chat.description}
                                            </p>
                                        )}
                                        <div className="text-xs text-gray-500 ml-6 mt-1">
                                            {chat.messageCount || 0} messages
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Online Users */}
                        <div className="border-t border-gray-200 p-4">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Team Members ({project?.members.length || 0})
                            </h4>
                            <div className="space-y-2">
                                {project?.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center space-x-2"
                                    >
                                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                            <User className="w-3 h-3 text-gray-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">
                                            User {member.user.authId}
                                        </span>
                                        <Badge
                                            variant="gray"
                                            className="text-xs"
                                        >
                                            {member.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col">
                        {selectedChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="border-b border-gray-200 p-4 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                                <Hash className="w-5 h-5 mr-2 text-gray-400" />
                                                {selectedChat.name}
                                            </h2>
                                            {selectedChat.description && (
                                                <p className="text-sm text-gray-600 ml-7">
                                                    {selectedChat.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button variant="ghost" size="sm">
                                                <Search className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <Users className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setShowChatSettingsModal(
                                                        true,
                                                    )
                                                }
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {isLoadingMessages ? (
                                        <div className="flex justify-center py-8">
                                            <Loading text="Loading messages..." />
                                        </div>
                                    ) : messages.length > 0 ? (
                                        <>
                                            {messages
                                                .slice()
                                                .reverse()
                                                .map((message) => (
                                                    <MessageBubble
                                                        key={message.id}
                                                        message={message}
                                                        isOwn={
                                                            message.userId ===
                                                            user?.id
                                                        }
                                                        isEditing={
                                                            editingMessage ===
                                                            message.id
                                                        }
                                                        editContent={
                                                            editContent
                                                        }
                                                        onEditContent={
                                                            setEditContent
                                                        }
                                                        onStartEdit={(
                                                            content,
                                                        ) => {
                                                            setEditingMessage(
                                                                message.id,
                                                            );
                                                            setEditContent(
                                                                content,
                                                            );
                                                        }}
                                                        onSaveEdit={() =>
                                                            handleEditMessage(
                                                                message.id,
                                                            )
                                                        }
                                                        onCancelEdit={() => {
                                                            setEditingMessage(
                                                                null,
                                                            );
                                                            setEditContent("");
                                                        }}
                                                        onDelete={() =>
                                                            handleDeleteMessage(
                                                                message.id,
                                                            )
                                                        }
                                                    />
                                                ))}
                                            {typingUsers.size > 0 && (
                                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                    <div className="flex space-x-1">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                                        <div
                                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "0.1s",
                                                            }}
                                                        />
                                                        <div
                                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "0.2s",
                                                            }}
                                                        />
                                                    </div>
                                                    <span>
                                                        {typingUsers.size === 1
                                                            ? "Someone is"
                                                            : "People are"}{" "}
                                                        typing...
                                                    </span>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                No messages yet
                                            </h3>
                                            <p className="text-gray-600 text-center">
                                                Start the conversation by
                                                sending the first message to
                                                your team.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Message Input */}
                                <div className="border-t border-gray-200 p-4 bg-white">
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="flex items-end space-x-2"
                                    >
                                        <div className="flex-1">
                                            <textarea
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(
                                                        e.target.value,
                                                    );
                                                    handleTyping();
                                                }}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" &&
                                                        !e.shiftKey
                                                    ) {
                                                        e.preventDefault();
                                                        handleSendMessage(e);
                                                    }
                                                }}
                                                placeholder={`Message #${selectedChat.name}`}
                                                className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                rows={1}
                                                style={{
                                                    minHeight: "40px",
                                                    maxHeight: "120px",
                                                }}
                                                disabled={!isConnected}
                                            />
                                        </div>
                                        <div className="flex space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                disabled={!isConnected}
                                            >
                                                <Paperclip className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                disabled={!isConnected}
                                            >
                                                <Smile className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={
                                                    !newMessage.trim() ||
                                                    !isConnected
                                                }
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </form>
                                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                        <span>
                                            Press Enter to send, Shift+Enter for
                                            new line
                                        </span>
                                        <span className="flex items-center space-x-2">
                                            <span>
                                                {isConnected
                                                    ? "Connected"
                                                    : "Disconnected"}
                                            </span>
                                            <div
                                                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
                                            />
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Select a chat channel
                                    </h3>
                                    <p className="text-gray-600">
                                        Choose a chat channel from the sidebar
                                        to start messaging.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Create Chat Modal */}
                <Modal
                    isOpen={showCreateChatModal}
                    onClose={() => setShowCreateChatModal(false)}
                    title="Create New Chat Channel"
                >
                    <form onSubmit={handleCreateChat} className="space-y-4">
                        <Input
                            label="Channel Name"
                            value={chatForm.name}
                            onChange={(e) =>
                                setChatForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            placeholder="e.g., general, design, development"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={chatForm.description}
                                onChange={(e) =>
                                    setChatForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                className="input min-h-[80px] resize-y"
                                placeholder="What's this channel for?"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowCreateChatModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Channel</Button>
                        </div>
                    </form>
                </Modal>

                {/* Export Modal */}
                <Modal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    title="Export Chat Messages"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Export all messages from{" "}
                            <strong>{selectedChat?.name}</strong> as a JSON
                            file.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowExportModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleExportChat}>
                                <Download className="w-4 h-4 mr-2" />
                                Export Messages
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
}

// Message Bubble Component
interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    isEditing: boolean;
    editContent: string;
    onEditContent: (content: string) => void;
    onStartEdit: (content: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
}

function MessageBubble({
    message,
    isOwn,
    isEditing,
    editContent,
    onEditContent,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);

    if (message.isDeleted) {
        return (
            <div className="flex items-center justify-center py-2">
                <span className="text-xs text-gray-400 italic">
                    Message deleted
                </span>
            </div>
        );
    }

    return (
        <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}
            >
                <div
                    className={`relative group px-4 py-2 rounded-lg ${
                        isOwn
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-900"
                    }`}
                    onMouseEnter={() => setShowActions(true)}
                    onMouseLeave={() => setShowActions(false)}
                >
                    {!isOwn && (
                        <div className="text-xs font-medium mb-1 text-gray-600">
                            User {message.userId}
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => onEditContent(e.target.value)}
                                className="w-full bg-white text-gray-900 border rounded px-2 py-1 text-sm"
                                rows={2}
                                autoFocus
                            />
                            <div className="flex space-x-2">
                                <Button size="sm" onClick={onSaveEdit}>
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onCancelEdit}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                            </div>
                            <div
                                className={`text-xs mt-1 ${isOwn ? "text-primary-100" : "text-gray-500"}`}
                            >
                                {formatRelativeTime(message.createdAt)}
                                {message.isEdited && (
                                    <span className="ml-1">(edited)</span>
                                )}
                            </div>
                        </>
                    )}

                    {/* Message Actions */}
                    {showActions && isOwn && !isEditing && (
                        <div className="absolute -top-8 right-0 flex space-x-1 bg-white border rounded shadow-sm">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onStartEdit(message.content)}
                                className="h-6 w-6 p-0"
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDelete}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
