const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const {
    isProjectMember,
    getUserProjects,
    getProjectById,
} = require("../utils/db-service.connection.utils");
const { AppError } = require("../middleware/error-handler.middleware");

/**
 * Create a new chat for a project
 */
async function createChat(req, res) {
    try {
        const { projectId, name, description } = req.body;
        const userId = req.user.id;
        const token = req.token;

        // Check if user is member of the project
        const isMember = await isProjectMember(userId, projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this project",
            });
        }

        // Check if chat with same name already exists for this project
        const existingChat = await Chat.findOne({
            projectId,
            name: name.trim(),
            isActive: true,
        });

        if (existingChat) {
            return res.status(409).json({
                success: false,
                error: "Chat with this name already exists for this project",
            });
        }

        // Create the chat
        const chat = new Chat({
            projectId,
            name: name.trim(),
            description: description?.trim(),
            createdBy: userId,
        });

        await chat.save();

        // Create a system message
        const systemMessage = new Message({
            chatId: chat._id,
            userId: userId,
            content: `${name} chat created`,
            messageType: "system",
            metadata: {
                action: "chat_created",
                createdBy: userId,
            },
        });

        await systemMessage.save();

        res.status(201).json({
            success: true,
            data: {
                chat: {
                    id: chat._id,
                    projectId: chat.projectId,
                    name: chat.name,
                    description: chat.description,
                    isActive: chat.isActive,
                    createdBy: chat.createdBy,
                    lastActivity: chat.lastActivity,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                },
                message: "Chat created successfully",
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
 * Auto-create default chat for new project (called by db-service)
 */
async function autoCreateProjectChat(req, res) {
    try {
        const { projectId, projectName, projectDescription, ownerId, members } =
            req.body;

        if (!projectId || !projectName || !ownerId) {
            return res.status(400).json({
                success: false,
                error: "Project ID, name, and owner ID are required",
            });
        }

        // Check if chat already exists for this project
        const existingChat = await Chat.findOne({
            projectId,
            isActive: true,
        });

        if (existingChat) {
            return res.json({
                success: true,
                data: {
                    chat: existingChat,
                    message: "Chat already exists for this project",
                },
            });
        }

        // Create default chat for the project
        const defaultChatName = `${projectName} General`;
        const chat = new Chat({
            projectId,
            name: defaultChatName,
            description: `General discussion for ${projectName}`,
            createdBy: ownerId,
        });

        await chat.save();

        // Create welcome system message
        const welcomeMessage = new Message({
            chatId: chat._id,
            userId: ownerId,
            content: `Welcome to ${projectName}! This is the general chat for project collaboration.`,
            messageType: "system",
            metadata: {
                action: "project_chat_created",
                projectId,
                projectName,
                createdBy: ownerId,
                members: members || [],
            },
        });

        await welcomeMessage.save();

        res.status(201).json({
            success: true,
            data: {
                chat: {
                    id: chat._id,
                    projectId: chat.projectId,
                    name: chat.name,
                    description: chat.description,
                    createdBy: chat.createdBy,
                    lastActivity: chat.lastActivity,
                    createdAt: chat.createdAt,
                },
                message: "Default project chat created successfully",
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
 * Get chats for a specific project
 */
async function getProjectChats(req, res) {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const token = req.token;
        const { page = 1, limit = 20, search } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Check if user has access to the project
        const isMember = await isProjectMember(
            userId,
            parseInt(projectId),
            token,
        );
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this project",
            });
        }

        // Build query
        const query = {
            projectId: parseInt(projectId),
            isActive: true,
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // Get chats and total count
        const [chats, total] = await Promise.all([
            Chat.find(query)
                .sort({ lastActivity: -1 })
                .skip(skip)
                .limit(take)
                .lean(),
            Chat.countDocuments(query),
        ]);

        // Get message counts for each chat
        const chatsWithMessageCounts = await Promise.all(
            chats.map(async (chat) => {
                const messageCount = await Message.countDocuments({
                    chatId: chat._id,
                    isDeleted: { $ne: true },
                });

                return {
                    id: chat._id,
                    projectId: chat.projectId,
                    name: chat.name,
                    description: chat.description,
                    createdBy: chat.createdBy,
                    lastActivity: chat.lastActivity,
                    messageCount,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                };
            }),
        );

        res.json({
            success: true,
            data: {
                projectId: parseInt(projectId),
                chats: chatsWithMessageCounts,
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

/**
 * Get or create default chat for a project (useful for frontend)
 */
async function getOrCreateProjectChat(req, res) {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const token = req.token;

        // Check if user has access to the project
        const isMember = await isProjectMember(
            userId,
            parseInt(projectId),
            token,
        );
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this project",
            });
        }

        // Look for existing chat
        let chat = await Chat.findOne({
            projectId: parseInt(projectId),
            isActive: true,
        }).sort({ createdAt: 1 }); // Get the first (usually default) chat

        if (!chat) {
            // Get project info to create chat
            try {
                const project = await getProjectById(
                    parseInt(projectId),
                    token,
                );

                // Create default chat
                const defaultChatName = `${project.name} General`;
                chat = new Chat({
                    projectId: parseInt(projectId),
                    name: defaultChatName,
                    description: `General discussion for ${project.name}`,
                    createdBy: userId,
                });

                await chat.save();

                // Create welcome system message
                const welcomeMessage = new Message({
                    chatId: chat._id,
                    userId: userId,
                    content: `Welcome to ${project.name}! This is the general chat for project collaboration.`,
                    messageType: "system",
                    metadata: {
                        action: "default_chat_created",
                        projectId: parseInt(projectId),
                        projectName: project.name,
                        createdBy: userId,
                    },
                });

                await welcomeMessage.save();
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: "Failed to create default chat for project",
                });
            }
        }

        // Get message count
        const messageCount = await Message.countDocuments({
            chatId: chat._id,
            isDeleted: { $ne: true },
        });

        res.json({
            success: true,
            data: {
                chat: {
                    id: chat._id,
                    projectId: chat.projectId,
                    name: chat.name,
                    description: chat.description,
                    createdBy: chat.createdBy,
                    lastActivity: chat.lastActivity,
                    messageCount,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                },
                isNewlyCreated:
                    !chat.createdAt ||
                    Date.now() - chat.createdAt.getTime() < 5000,
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
 * Get chats for user's projects
 */
async function getChats(req, res) {
    try {
        const userId = req.user.id;
        const token = req.token;
        const { projectId, page = 1, limit = 20, search } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let projectIds = [];

        if (projectId) {
            // Check if user has access to specific project
            const isMember = await isProjectMember(
                userId,
                parseInt(projectId),
                token,
            );
            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have access to this project",
                });
            }
            projectIds = [parseInt(projectId)];
        } else {
            // Get all projects user is member of
            const userProjects = await getUserProjects(token);
            projectIds = userProjects.map((project) => project.id);
        }

        if (projectIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    chats: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: 0,
                        totalPages: 0,
                    },
                },
            });
        }

        // Build query
        const query = {
            projectId: { $in: projectIds },
            isActive: true,
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // Get chats and total count
        const [chats, total] = await Promise.all([
            Chat.find(query)
                .sort({ lastActivity: -1 })
                .skip(skip)
                .limit(take)
                .lean(),
            Chat.countDocuments(query),
        ]);

        // Enhanced chat data with message counts
        const enhancedChats = await Promise.all(
            chats.map(async (chat) => {
                const messageCount = await Message.countDocuments({
                    chatId: chat._id,
                    isDeleted: { $ne: true },
                });

                const unreadCount = await Message.countDocuments({
                    chatId: chat._id,
                    isDeleted: { $ne: true },
                    createdAt: {
                        $gt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    }, // Last 24 hours as "unread"
                });

                return {
                    id: chat._id,
                    projectId: chat.projectId,
                    name: chat.name,
                    description: chat.description,
                    createdBy: chat.createdBy,
                    lastActivity: chat.lastActivity,
                    messageCount,
                    unreadCount,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                };
            }),
        );

        res.json({
            success: true,
            data: {
                chats: enhancedChats,
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

/**
 * Get chat by ID
 */
async function getChatById(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const token = req.token;

        const chat = await Chat.findById(id);
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

        // Get message count
        const messageCount = await Message.countDocuments({
            chatId: chat._id,
            isDeleted: { $ne: true },
        });

        res.json({
            success: true,
            data: {
                id: chat._id,
                projectId: chat.projectId,
                name: chat.name,
                description: chat.description,
                createdBy: chat.createdBy,
                lastActivity: chat.lastActivity,
                messageCount,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
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
 * Update chat
 */
async function updateChat(req, res) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.user.id;
        const token = req.token;

        const chat = await Chat.findById(id);
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

        // Check if new name conflicts with existing chats
        if (name && name.trim() !== chat.name) {
            const existingChat = await Chat.findOne({
                projectId: chat.projectId,
                name: name.trim(),
                isActive: true,
                _id: { $ne: id },
            });

            if (existingChat) {
                return res.status(409).json({
                    success: false,
                    error: "Chat with this name already exists for this project",
                });
            }
        }

        // Update chat
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined)
            updateData.description = description?.trim();

        const updatedChat = await Chat.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        res.json({
            success: true,
            data: {
                id: updatedChat._id,
                projectId: updatedChat.projectId,
                name: updatedChat.name,
                description: updatedChat.description,
                createdBy: updatedChat.createdBy,
                lastActivity: updatedChat.lastActivity,
                createdAt: updatedChat.createdAt,
                updatedAt: updatedChat.updatedAt,
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
 * Delete/deactivate chat
 */
async function deleteChat(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const token = req.token;

        const chat = await Chat.findById(id);
        if (!chat || !chat.isActive) {
            return res.status(404).json({
                success: false,
                error: "Chat not found",
            });
        }

        // Check if user has access to the project and is the creator
        const isMember = await isProjectMember(userId, chat.projectId, token);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have access to this chat",
            });
        }

        // Only the creator can delete the chat
        if (chat.createdBy !== userId) {
            return res.status(403).json({
                success: false,
                error: "Only the chat creator can delete this chat",
            });
        }

        // Soft delete - mark as inactive
        await Chat.findByIdAndUpdate(id, { isActive: false });

        // Create system message about chat deletion
        const systemMessage = new Message({
            chatId: chat._id,
            userId: userId,
            content: `Chat deleted by creator`,
            messageType: "system",
            metadata: {
                action: "chat_deleted",
                deletedBy: userId,
            },
        });

        await systemMessage.save();

        res.json({
            success: true,
            data: {
                message: "Chat deleted successfully",
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
 * Get chat statistics
 */
async function getChatStats(req, res) {
    try {
        const userId = req.user.id;
        const token = req.token;

        // Get all projects user is member of
        const userProjects = await getUserProjects(token);
        const projectIds = userProjects.map((project) => project.id);

        if (projectIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalChats: 0,
                    totalMessages: 0,
                    chatsCreated: 0,
                    projectBreakdown: [],
                },
            });
        }

        // Get chat statistics
        const [totalChats, chatsCreated, projectBreakdown] = await Promise.all([
            Chat.countDocuments({
                projectId: { $in: projectIds },
                isActive: true,
            }),
            Chat.countDocuments({
                createdBy: userId,
                isActive: true,
            }),
            Chat.aggregate([
                {
                    $match: {
                        projectId: { $in: projectIds },
                        isActive: true,
                    },
                },
                {
                    $group: {
                        _id: "$projectId",
                        chatCount: { $sum: 1 },
                        lastActivity: { $max: "$lastActivity" },
                    },
                },
            ]),
        ]);

        // Get total messages count
        const chatIds = await Chat.find({
            projectId: { $in: projectIds },
            isActive: true,
        }).distinct("_id");

        const totalMessages = await Message.countDocuments({
            chatId: { $in: chatIds },
            isDeleted: { $ne: true },
        });

        res.json({
            success: true,
            data: {
                totalChats,
                totalMessages,
                chatsCreated,
                projectBreakdown: projectBreakdown.map((item) => ({
                    projectId: item._id,
                    chatCount: item.chatCount,
                    lastActivity: item.lastActivity,
                })),
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
    createChat,
    autoCreateProjectChat,
    getProjectChats,
    getOrCreateProjectChat,
    getChats,
    getChatById,
    updateChat,
    deleteChat,
    getChatStats,
};
