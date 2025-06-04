"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { Message } from "@/types";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    joinProject: (projectId: number) => void;
    leaveProject: (projectId: number) => void;
    sendMessage: (chatId: string, content: string) => void;
    editMessage: (messageId: string, content: string) => void;
    deleteMessage: (messageId: string) => void;
    startTyping: (chatId: string) => void;
    stopTyping: (chatId: string) => void;
    onNewMessage: (callback: (message: Message) => void) => void;
    onMessageEdited: (callback: (message: Message) => void) => void;
    onMessageDeleted: (
        callback: (data: { messageId: string; chatId: string }) => void,
    ) => void;
    onUserTyping: (
        callback: (data: {
            userId: number;
            chatId: string;
            isTyping: boolean;
        }) => void,
    ) => void;
    onUserJoined: (callback: (data: { userId: number }) => void) => void;
    onUserLeft: (callback: (data: { userId: number }) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user) {
            const accessToken = Cookies.get("accessToken");
            if (!accessToken) return;

            const socketUrl =
                process.env.NEXT_PUBLIC_CHAT_SERVICE_URL ||
                "http://localhost:5000";

            const newSocket = io(socketUrl, {
                auth: {
                    token: accessToken,
                },
                autoConnect: true,
            });

            newSocket.on("connect", () => {
                console.log("Connected to chat service");
                setIsConnected(true);
            });

            newSocket.on("disconnect", () => {
                console.log("Disconnected from chat service");
                setIsConnected(false);
            });

            newSocket.on("error", (error: { error: string }) => {
                console.error("Socket error:", error);
                toast.error(error.error || "Chat connection error");
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
                setSocket(null);
                setIsConnected(false);
            };
        }
    }, [isAuthenticated, user]);

    const joinProject = (projectId: number) => {
        if (socket) {
            socket.emit("join_project", { projectId });
        }
    };

    const leaveProject = (projectId: number) => {
        if (socket) {
            socket.emit("leave_project", { projectId });
        }
    };

    const sendMessage = (chatId: string, content: string) => {
        if (socket && content.trim()) {
            socket.emit("send_message", {
                chatId,
                content: content.trim(),
                messageType: "text",
            });
        }
    };

    const editMessage = (messageId: string, content: string) => {
        if (socket && content.trim()) {
            socket.emit("edit_message", {
                messageId,
                content: content.trim(),
            });
        }
    };

    const deleteMessage = (messageId: string) => {
        if (socket) {
            socket.emit("delete_message", { messageId });
        }
    };

    const startTyping = (chatId: string) => {
        if (socket) {
            socket.emit("typing_start", { chatId });
        }
    };

    const stopTyping = (chatId: string) => {
        if (socket) {
            socket.emit("typing_stop", { chatId });
        }
    };

    const onNewMessage = (callback: (message: Message) => void) => {
        if (socket) {
            socket.on(
                "new_message",
                (data: { success: boolean; data: Message }) => {
                    if (data.success && data.data) {
                        callback(data.data);
                    }
                },
            );
        }
    };

    const onMessageEdited = (callback: (message: Message) => void) => {
        if (socket) {
            socket.on(
                "message_edited",
                (data: { success: boolean; data: Message }) => {
                    if (data.success && data.data) {
                        callback(data.data);
                    }
                },
            );
        }
    };

    const onMessageDeleted = (
        callback: (data: { messageId: string; chatId: string }) => void,
    ) => {
        if (socket) {
            socket.on(
                "message_deleted",
                (data: {
                    success: boolean;
                    messageId: string;
                    chatId: string;
                }) => {
                    if (data.success) {
                        callback({
                            messageId: data.messageId,
                            chatId: data.chatId,
                        });
                    }
                },
            );
        }
    };

    const onUserTyping = (
        callback: (data: {
            userId: number;
            chatId: string;
            isTyping: boolean;
        }) => void,
    ) => {
        if (socket) {
            socket.on("user_typing", callback);
        }
    };

    const onUserJoined = (callback: (data: { userId: number }) => void) => {
        if (socket) {
            socket.on("user_joined", callback);
        }
    };

    const onUserLeft = (callback: (data: { userId: number }) => void) => {
        if (socket) {
            socket.on("user_left", callback);
        }
    };

    const value: SocketContextType = {
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
        onUserJoined,
        onUserLeft,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}
