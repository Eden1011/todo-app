const Message = require("../models/message.model");
const Chat = require("../models/chat.model");
const { isProjectMember } = require("../utils/db-service.connection.utils");

/**
 * Get messages for a chat - Enhanced for frontend integration
 */
async function getChatMessages(req, res) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const token = req.token;
        const {
            page = 1,
            limit = 50,
            before,
            after,
            includeDeleted = false,
            sortOrder = "desc", // desc = newest first, asc = oldest first
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Check if chat exists
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        // Check if user has access to the project
        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        // Build query
        const query = {
            chatId: chat._id,
        };

        // Include deleted messages only if explicitly requested
        if (includeDeleted !== "true") {
            query.isDeleted = { $ne: true };
        }

        // Add date filters if provided
        if (before || after) {
            query.createdAt = {};
            if (before) query.createdAt.$lt = new Date(before);
            if (after) query.createdAt.$gt = new Date(after);
        }

        // Get messages and total count
        const [messages, total] = await Promise.all([
            Message.find(query)
                .sort({ createdAt: sortOrder === "desc" ? -1 : 1 })
                .skip(skip)
                .limit(take)
                .lean(),
            Message.countDocuments(query),
        ]);

        // Enhanced response for frontend integration
        const response = {
            success: true,
            data: {
                messages: messages.map((msg) => ({
                    id: msg._id,
                    chatId: msg.chatId,
                    userId: msg.userId,
                    content: msg.content,
                    messageType: msg.messageType,
                    metadata: msg.metadata,
                    isEdited: msg.isEdited,
                    editedAt: msg.editedAt,
                    isDeleted: msg.isDeleted,
                    deletedAt: msg.deletedAt,
                    createdAt: msg.createdAt,
                    updatedAt: msg.updatedAt,
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                    hasNextPage:
                        parseInt(page) < Math.ceil(total / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                    nextPage:
                        parseInt(page) < Math.ceil(total / parseInt(limit))
                            ? parseInt(page) + 1
                            : null,
                    prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null,
                },
                chatInfo: {
                    id: chat._id,
                    name: chat.name,
                    description: chat.description,
                    projectId: chat.projectId,
                    createdBy: chat.createdBy,
                    lastActivity: chat.lastActivity,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                },
                filters: {
                    before: before || null,
                    after: after || null,
                    includeDeleted: includeDeleted === "true",
                    sortOrder,
                },
            },
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Export all messages from a chat (for data export/backup)
 */
async function exportChatMessages(req, res) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const token = req.token;
        const {
            format = "json", // json, csv
            includeDeleted = false,
            includeMetadata = true,
        } = req.query;

        // Check if chat exists
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        // Check if user has access to the project
        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        // Build query
        const query = {
            chatId: chat._id,
        };

        if (includeDeleted !== "true") {
            query.isDeleted = { $ne: true };
        }

        // Get all messages
        const messages = await Message.find(query)
            .sort({ createdAt: 1 }) // Always chronological for export
            .lean();

        const exportData = {
            exportInfo: {
                chatId: chat._id,
                chatName: chat.name,
                projectId: chat.projectId,
                exportedAt: new Date().toISOString(),
                exportedBy: userId,
                totalMessages: messages.length,
                filters: {
                    includeDeleted: includeDeleted === "true",
                    includeMetadata: includeMetadata === "true",
                },
            },
            chatInfo: {
                id: chat._id,
                name: chat.name,
                description: chat.description,
                projectId: chat.projectId,
                createdBy: chat.createdBy,
                createdAt: chat.createdAt,
            },
            messages: messages.map((msg) => {
                const exportMsg = {
                    id: msg._id,
                    userId: msg.userId,
                    content: msg.content,
                    messageType: msg.messageType,
                    isEdited: msg.isEdited,
                    editedAt: msg.editedAt,
                    isDeleted: msg.isDeleted,
                    deletedAt: msg.deletedAt,
                    createdAt: msg.createdAt,
                    updatedAt: msg.updatedAt,
                };

                if (includeMetadata === "true") {
                    exportMsg.metadata = msg.metadata;
                }

                return exportMsg;
            }),
        };

        if (format === "csv") {
            // Convert to CSV format
            const csvHeader = [
                "ID",
                "User ID",
                "Content",
                "Message Type",
                "Created At",
                "Updated At",
                "Is Edited",
                "Edited At",
                "Is Deleted",
                "Deleted At",
            ];

            const csvRows = messages.map((msg) => [
                msg._id,
                msg.userId,
                `"${(msg.content || "").replace(/"/g, '""')}"`,
                msg.messageType,
                msg.createdAt.toISOString(),
                msg.updatedAt.toISOString(),
                msg.isEdited || false,
                msg.editedAt ? msg.editedAt.toISOString() : "",
                msg.isDeleted || false,
                msg.deletedAt ? msg.deletedAt.toISOString() : "",
            ]);

            const csvContent = [
                csvHeader.join(","),
                ...csvRows.map((row) => row.join(",")),
            ].join("\n");

            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="chat_${chat._id}_messages_${new Date().toISOString().split("T")[0]}.csv"`,
            );
            res.send(csvContent);
        } else {
            // JSON format
            res.setHeader("Content-Type", "application/json");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="chat_${chat._id}_messages_${new Date().toISOString().split("T")[0]}.json"`,
            );
            res.json(exportData);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Send a message (API endpoint - mainly for testing)
 */
async function sendMessage(req, res) {
    try {
        const { chatId } = req.params;
        const { content, messageType = "text", metadata = {} } = req.body;
        const userId = req.user.id;
        const token = req.token;

        // Check if chat exists
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        // Check if user has access to the project
        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        // Create message
        const message = new Message({
            chatId: chat._id,
            userId,
            content: content.trim(),
            messageType,
            metadata,
        });

        await message.save();

        // Update chat's last activity
        await chat.updateActivity();

        res.status(201).json({
            success: true,
            data: {
                id: message._id,
                chatId: message.chatId,
                userId: message.userId,
                content: message.content,
                messageType: message.messageType,
                metadata: message.metadata,
                isEdited: message.isEdited,
                isDeleted: message.isDeleted,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Update a message
 */
async function updateMessage(req, res) {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        const token = req.token;

        // Find the message
        const message = await Message.findById(messageId);
        if (!message || message.isDeleted) {
            return res.status(404).json({
                success: false,
                error: "Message not found",
            });
        }

        // Check if user owns the message
        if (message.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: "You can only edit your own messages",
            });
        }

        // Check if user still has access to the chat
        const chat = await Chat.findById(message.chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        // Update message
        message.content = content.trim();
        await message.markAsEdited();

        res.json({
            success: true,
            data: {
                id: message._id,
                chatId: message.chatId,
                userId: message.userId,
                content: message.content,
                messageType: message.messageType,
                metadata: message.metadata,
                isEdited: message.isEdited,
                editedAt: message.editedAt,
                isDeleted: message.isDeleted,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Delete a message
 */
async function deleteMessage(req, res) {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        const token = req.token;

        // Find the message
        const message = await Message.findById(messageId);
        if (!message || message.isDeleted) {
            return res.status(404).json({
                success: false,
                error: "Message not found",
            });
        }

        // Check if user owns the message
        if (message.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: "You can only delete your own messages",
            });
        }

        // Check if user still has access to the chat
        const chat = await Chat.findById(message.chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        // Soft delete message
        await message.softDelete();

        res.json({
            success: true,
            data: {
                message: "Message deleted successfully",
                deletedAt: message.deletedAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get message by ID
 */
async function getMessageById(req, res) {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        const token = req.token;

        // Find the message
        const message = await Message.findById(messageId);
        if (!message || message.isDeleted) {
            return res.status(404).json({
                success: false,
                error: "Message not found",
            });
        }

        // Check if user has access to the chat
        const chat = await Chat.findById(message.chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this message",
            });
        }

        res.json({
            success: true,
            data: {
                id: message._id,
                chatId: message.chatId,
                userId: message.userId,
                content: message.content,
                messageType: message.messageType,
                metadata: message.metadata,
                isEdited: message.isEdited,
                editedAt: message.editedAt,
                isDeleted: message.isDeleted,
                deletedAt: message.deletedAt,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Search messages in chat
 */
async function searchMessages(req, res) {
    try {
        const { chatId } = req.params;
        const { query: searchQuery, page = 1, limit = 20 } = req.query;
        const userId = req.user.id;
        const token = req.token;

        if (!searchQuery || searchQuery.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: "Search query must be at least 2 characters long",
            });
        }

        // Check if chat exists
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        // Check if user has access to the project
        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Search messages
        const searchPattern = { $regex: searchQuery.trim(), $options: "i" };
        const query = {
            chatId: chat._id,
            content: searchPattern,
            isDeleted: { $ne: true },
        };

        const [messages, total] = await Promise.all([
            Message.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(take)
                .lean(),
            Message.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                messages: messages.map((msg) => ({
                    id: msg._id,
                    chatId: msg.chatId,
                    userId: msg.userId,
                    content: msg.content,
                    messageType: msg.messageType,
                    createdAt: msg.createdAt,
                    // Highlight search matches in content
                    contentHighlighted: msg.content.replace(
                        new RegExp(searchQuery.trim(), "gi"),
                        `<mark>$&</mark>`,
                    ),
                })),
                searchQuery: searchQuery.trim(),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                    hasNextPage:
                        parseInt(page) < Math.ceil(total / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1,
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

module.exports = {
    getChatMessages,
    exportChatMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    getMessageById,
    searchMessages,
};
