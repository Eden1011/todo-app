const { Server } = require("socket.io");
const {
    authenticateSocket,
    extractTokenFromSocket,
} = require("../middleware/auth.middleware");
const {
    isProjectMember,
    getUserProjects,
} = require("../utils/db-service.connection.utils");
const {
    validateSocketMessage,
    validateChatRoom,
} = require("../middleware/validation.middleware");
const { handleSocketError } = require("../middleware/error-handler.middleware");
const { socketRateLimiter } = require("../middleware/rate-limit.middleware");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");

function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "http://localhost:3001",
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            // Extract token from socket
            const token = extractTokenFromSocket(socket);
            if (!token) {
                return next(new Error("Authentication token required"));
            }

            // Authenticate with auth-service
            const user = await authenticateSocket(token);

            // Check connection rate limit
            if (!socketRateLimiter.checkConnectionLimit(user.id)) {
                return next(
                    new Error("Too many connections. Please try again later."),
                );
            }

            // Attach user info and token to socket
            socket.user = user;
            socket.token = token;
            socket.userId = user.id;

            console.log(`User ${user.id} connected to socket ${socket.id}`);
            next();
        } catch (error) {
            console.error("Socket authentication error:", error.message);
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket ${socket.id} connected for user ${socket.userId}`);

        // Handle joining project rooms
        socket.on("join_project", async (data) => {
            try {
                const { projectId } = data;

                if (!projectId || !Number.isInteger(projectId)) {
                    socket.emit("error", {
                        success: false,
                        error: "Valid project ID is required",
                    });
                    return;
                }

                // Check if user is member of the project
                const isMember = await isProjectMember(
                    socket.userId,
                    projectId,
                    socket.token,
                );
                if (!isMember) {
                    socket.emit("error", {
                        success: false,
                        error: "You don't have access to this project",
                    });
                    return;
                }

                const roomName = `project_${projectId}`;
                socket.join(roomName);

                console.log(
                    `User ${socket.userId} joined project room ${roomName}`,
                );

                socket.emit("joined_project", {
                    success: true,
                    projectId,
                    room: roomName,
                    message: `Joined project ${projectId} chat`,
                });

                // Notify other users in the project about new connection
                socket.to(roomName).emit("user_joined", {
                    userId: socket.userId,
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                handleSocketError(socket, error);
            }
        });

        // Handle leaving project rooms
        socket.on("leave_project", async (data) => {
            try {
                const { projectId } = data;

                if (!projectId || !Number.isInteger(projectId)) {
                    socket.emit("error", {
                        success: false,
                        error: "Valid project ID is required",
                    });
                    return;
                }

                const roomName = `project_${projectId}`;
                socket.leave(roomName);

                console.log(
                    `User ${socket.userId} left project room ${roomName}`,
                );

                socket.emit("left_project", {
                    success: true,
                    projectId,
                    room: roomName,
                    message: `Left project ${projectId} chat`,
                });

                // Notify other users in the project about user leaving
                socket.to(roomName).emit("user_left", {
                    userId: socket.userId,
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                handleSocketError(socket, error);
            }
        });

        // Handle sending messages
        socket.on("send_message", async (data) => {
            try {
                const {
                    chatId,
                    content,
                    messageType = "text",
                    metadata = {},
                } = data;

                // Rate limit check
                if (!socketRateLimiter.checkMessageLimit(socket.userId)) {
                    socket.emit("error", {
                        success: false,
                        error: "Too many messages. Please slow down.",
                    });
                    return;
                }

                // Validate message data
                const validation = validateSocketMessage(data);
                if (!validation.isValid) {
                    socket.emit("error", {
                        success: false,
                        error: "Invalid message data",
                        details: validation.errors,
                    });
                    return;
                }

                // Check if chat exists
                const chat = await Chat.findById(chatId);
                if (!chat || !chat.isActive) {
                    socket.emit("error", {
                        success: false,
                        error: "Chat not found",
                    });
                    return;
                }

                // Check if user has access to the project
                const isMember = await isProjectMember(
                    socket.userId,
                    chat.projectId,
                    socket.token,
                );
                if (!isMember) {
                    socket.emit("error", {
                        success: false,
                        error: "You don't have access to this chat",
                    });
                    return;
                }

                // Create and save message
                const message = new Message({
                    chatId: chat._id,
                    userId: socket.userId,
                    content: content.trim(),
                    messageType,
                    metadata,
                });

                await message.save();

                // Update chat's last activity
                await chat.updateActivity();

                // Prepare message data for broadcast
                const messageData = {
                    id: message._id,
                    chatId: message.chatId,
                    userId: message.userId,
                    content: message.content,
                    messageType: message.messageType,
                    metadata: message.metadata,
                    createdAt: message.createdAt,
                    isEdited: message.isEdited,
                };

                // Broadcast to all users in the project room
                const roomName = `project_${chat.projectId}`;
                io.to(roomName).emit("new_message", {
                    success: true,
                    data: messageData,
                    chatInfo: {
                        id: chat._id,
                        name: chat.name,
                        projectId: chat.projectId,
                    },
                });

                console.log(
                    `Message sent in chat ${chatId} by user ${socket.userId}`,
                );
            } catch (error) {
                handleSocketError(socket, error);
            }
        });

        // Handle message editing
        socket.on("edit_message", async (data) => {
            try {
                const { messageId, content } = data;

                if (!messageId || !content || content.trim().length === 0) {
                    socket.emit("error", {
                        success: false,
                        error: "Message ID and content are required",
                    });
                    return;
                }

                // Find the message
                const message = await Message.findById(messageId);
                if (!message || message.isDeleted) {
                    socket.emit("error", {
                        success: false,
                        error: "Message not found",
                    });
                    return;
                }

                // Check if user owns the message
                if (message.userId !== socket.userId) {
                    socket.emit("error", {
                        success: false,
                        error: "You can only edit your own messages",
                    });
                    return;
                }

                // Check if user still has access to the chat
                const chat = await Chat.findById(message.chatId);
                if (!chat || !chat.isActive) {
                    socket.emit("error", {
                        success: false,
                        error: "Chat not found",
                    });
                    return;
                }

                const isMember = await isProjectMember(
                    socket.userId,
                    chat.projectId,
                    socket.token,
                );
                if (!isMember) {
                    socket.emit("error", {
                        success: false,
                        error: "You don't have access to this chat",
                    });
                    return;
                }

                // Update message
                message.content = content.trim();
                await message.markAsEdited();

                // Prepare message data for broadcast
                const messageData = {
                    id: message._id,
                    chatId: message.chatId,
                    userId: message.userId,
                    content: message.content,
                    messageType: message.messageType,
                    metadata: message.metadata,
                    createdAt: message.createdAt,
                    isEdited: message.isEdited,
                    editedAt: message.editedAt,
                };

                // Broadcast to all users in the project room
                const roomName = `project_${chat.projectId}`;
                io.to(roomName).emit("message_edited", {
                    success: true,
                    data: messageData,
                });

                console.log(
                    `Message ${messageId} edited by user ${socket.userId}`,
                );
            } catch (error) {
                handleSocketError(socket, error);
            }
        });

        // Handle message deletion
        socket.on("delete_message", async (data) => {
            try {
                const { messageId } = data;

                if (!messageId) {
                    socket.emit("error", {
                        success: false,
                        error: "Message ID is required",
                    });
                    return;
                }

                // Find the message
                const message = await Message.findById(messageId);
                if (!message || message.isDeleted) {
                    socket.emit("error", {
                        success: false,
                        error: "Message not found",
                    });
                    return;
                }

                // Check if user owns the message
                if (message.userId !== socket.userId) {
                    socket.emit("error", {
                        success: false,
                        error: "You can only delete your own messages",
                    });
                    return;
                }

                // Check if user still has access to the chat
                const chat = await Chat.findById(message.chatId);
                if (!chat || !chat.isActive) {
                    socket.emit("error", {
                        success: false,
                        error: "Chat not found",
                    });
                    return;
                }

                const isMember = await isProjectMember(
                    socket.userId,
                    chat.projectId,
                    socket.token,
                );
                if (!isMember) {
                    socket.emit("error", {
                        success: false,
                        error: "You don't have access to this chat",
                    });
                    return;
                }

                // Soft delete message
                await message.softDelete();

                // Broadcast to all users in the project room
                const roomName = `project_${chat.projectId}`;
                io.to(roomName).emit("message_deleted", {
                    success: true,
                    messageId: message._id,
                    chatId: message.chatId,
                    deletedBy: socket.userId,
                    deletedAt: message.deletedAt,
                });

                console.log(
                    `Message ${messageId} deleted by user ${socket.userId}`,
                );
            } catch (error) {
                handleSocketError(socket, error);
            }
        });

        // Handle typing indicators
        socket.on("typing_start", async (data) => {
            try {
                const { chatId } = data;

                if (!chatId) {
                    return;
                }

                // Check if chat exists and user has access
                const chat = await Chat.findById(chatId);
                if (!chat || !chat.isActive) {
                    return;
                }

                const isMember = await isProjectMember(
                    socket.userId,
                    chat.projectId,
                    socket.token,
                );
                if (!isMember) {
                    return;
                }

                // Broadcast typing indicator to project room (excluding sender)
                const roomName = `project_${chat.projectId}`;
                socket.to(roomName).emit("user_typing", {
                    userId: socket.userId,
                    chatId,
                    isTyping: true,
                });
            } catch (error) {
                // Silent error for typing indicators
                console.error("Typing start error:", error.message);
            }
        });

        socket.on("typing_stop", async (data) => {
            try {
                const { chatId } = data;

                if (!chatId) {
                    return;
                }

                // Check if chat exists and user has access
                const chat = await Chat.findById(chatId);
                if (!chat || !chat.isActive) {
                    return;
                }

                const isMember = await isProjectMember(
                    socket.userId,
                    chat.projectId,
                    socket.token,
                );
                if (!isMember) {
                    return;
                }

                // Broadcast typing stop to project room (excluding sender)
                const roomName = `project_${chat.projectId}`;
                socket.to(roomName).emit("user_typing", {
                    userId: socket.userId,
                    chatId,
                    isTyping: false,
                });
            } catch (error) {
                // Silent error for typing indicators
                console.error("Typing stop error:", error.message);
            }
        });

        // Handle getting online users in a project
        socket.on("get_online_users", async (data) => {
            try {
                const { projectId } = data;

                if (!projectId || !Number.isInteger(projectId)) {
                    socket.emit("error", {
                        success: false,
                        error: "Valid project ID is required",
                    });
                    return;
                }

                // Check if user has access to the project
                const isMember = await isProjectMember(
                    socket.userId,
                    projectId,
                    socket.token,
                );
                if (!isMember) {
                    socket.emit("error", {
                        success: false,
                        error: "You don't have access to this project",
                    });
                    return;
                }

                const roomName = `project_${projectId}`;
                const sockets = await io.in(roomName).fetchSockets();
                const onlineUsers = sockets
                    .map((s) => s.userId)
                    .filter(Boolean);

                socket.emit("online_users", {
                    success: true,
                    projectId,
                    onlineUsers: [...new Set(onlineUsers)], // Remove duplicates
                });
            } catch (error) {
                handleSocketError(socket, error);
            }
        });

        // Handle disconnection
        socket.on("disconnect", (reason) => {
            console.log(
                `Socket ${socket.id} disconnected for user ${socket.userId}. Reason: ${reason}`,
            );

            // Note: Socket.io automatically removes the socket from all rooms on disconnect
            // No need to manually emit user_left as the socket is already gone
        });

        // Handle connection errors
        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error.message);
        });
    });

    return io;
}

module.exports = { initializeSocket };
