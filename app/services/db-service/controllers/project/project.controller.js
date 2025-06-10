const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const {
    createProjectChat,
    getProjectChats,
    getOrCreateDefaultChat,
} = require("../../utils/chat-service.connection");

const prisma = new PrismaClient();

async function createProject(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const { name, description } = req.body;

        const project = await prisma.project.create({
            data: {
                name,
                description,
                ownerId: user.id,
                members: {
                    create: {
                        userId: user.id,
                        role: "OWNER",
                    },
                },
            },
            include: {
                owner: { select: { id: true, authId: true } },
                members: {
                    include: {
                        user: { select: { id: true, authId: true } },
                    },
                },
                _count: {
                    select: { tasks: true, members: true },
                },
            },
        });

        // Create default chat for the project (non-blocking)
        const chatResult = await createProjectChat({
            id: project.id,
            name: project.name,
            description: project.description,
            ownerId: authId, // Use authId for chat service
            members: project.members.map((member) => ({
                userId: member.user.authId,
                role: member.role,
            })),
        });

        // Enhanced response with chat information
        const response = {
            success: true,
            data: {
                ...project,
                chat: chatResult.success
                    ? {
                          id: chatResult.chatId,
                          name: chatResult.chatName,
                          created: true,
                      }
                    : null,
                chatCreationResult: chatResult,
            },
        };

        res.status(201).json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function getProjects(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            page = 1,
            limit = 20,
            search,
            ownedOnly = false,
            sortBy = "updatedAt",
            sortOrder = "desc",
            includeChats = false,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {
            OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
            ],
        };

        if (ownedOnly === "true") {
            where.ownerId = user.id;
            delete where.OR;
        }

        if (search) {
            where.AND = [
                where.OR ? { OR: where.OR } : { ownerId: user.id },
                {
                    OR: [
                        { name: { contains: search } },
                        {
                            description: {
                                contains: search,
                            },
                        },
                    ],
                },
            ];
            delete where.OR;
        }

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, authId: true } },
                    members: {
                        include: {
                            user: { select: { id: true, authId: true } },
                        },
                    },
                    _count: {
                        select: { tasks: true, members: true },
                    },
                },
            }),
            prisma.project.count({ where }),
        ]);

        // Optionally include chat information
        let enhancedProjects = projects;
        if (includeChats === "true") {
            const token = req.headers.authorization?.split(" ")[1];
            if (token) {
                enhancedProjects = await Promise.all(
                    projects.map(async (project) => {
                        try {
                            const chats = await getProjectChats(
                                project.id,
                                token,
                            );
                            return {
                                ...project,
                                chats: chats || [],
                                chatCount: chats ? chats.length : 0,
                            };
                        } catch (error) {
                            console.error(
                                `Failed to get chats for project ${project.id}:`,
                                error.message,
                            );
                            return {
                                ...project,
                                chats: [],
                                chatCount: 0,
                                chatError: "Failed to load chats",
                            };
                        }
                    }),
                );
            }
        }

        res.json({
            success: true,
            data: {
                projects: enhancedProjects,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
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

async function getProjectById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);
        const { includeChats = false } = req.query;

        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: user.id },
                    { members: { some: { userId: user.id } } },
                ],
            },
            include: {
                owner: { select: { id: true, authId: true } },
                members: {
                    include: {
                        user: { select: { id: true, authId: true } },
                    },
                    orderBy: { role: "asc" },
                },
                tasks: {
                    include: {
                        owner: { select: { id: true, authId: true } },
                        assignee: { select: { id: true, authId: true } },
                    },
                    orderBy: { updatedAt: "desc" },
                    take: 10,
                },
                _count: {
                    select: { tasks: true, members: true },
                },
            },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: "Project not found or you don't have access to it",
            });
        }

        // Optionally include chat information
        let enhancedProject = project;
        if (includeChats === "true") {
            const token = req.headers.authorization?.split(" ")[1];
            if (token) {
                try {
                    const chats = await getProjectChats(project.id, token);
                    enhancedProject = {
                        ...project,
                        chats: chats || [],
                        chatCount: chats ? chats.length : 0,
                    };
                } catch (error) {
                    console.error(
                        `Failed to get chats for project ${project.id}:`,
                        error.message,
                    );
                    enhancedProject = {
                        ...project,
                        chats: [],
                        chatCount: 0,
                        chatError: "Failed to load chats",
                    };
                }
            }
        }

        res.json({
            success: true,
            data: enhancedProject,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function getProjectChatInfo(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);

        // Check if user has access to the project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: user.id },
                    { members: { some: { userId: user.id } } },
                ],
            },
            include: {
                owner: { select: { id: true, authId: true } },
                members: {
                    include: {
                        user: { select: { id: true, authId: true } },
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: "Project not found or you don't have access to it",
            });
        }

        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authorization token required",
            });
        }

        try {
            // Get project chats
            const chats = await getProjectChats(projectId, token);

            // Also get/create default chat
            const defaultChat = await getOrCreateDefaultChat(projectId, token);

            res.json({
                success: true,
                data: {
                    projectId: projectId,
                    projectName: project.name,
                    chats: chats || [],
                    defaultChat: defaultChat,
                    totalChats: chats ? chats.length : 0,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: `Failed to get project chat information: ${error.message}`,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function updateProject(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);

        const { name, description } = req.body;

        // Check if user has admin access to project
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId: user.id,
                role: { in: ["OWNER", "ADMIN"] },
            },
        });

        if (!member) {
            return res.status(403).json({
                success: false,
                error: "You don't have permission to update this project",
            });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const project = await prisma.project.update({
            where: { id: projectId },
            data: updateData,
            include: {
                owner: { select: { id: true, authId: true } },
                members: {
                    include: {
                        user: { select: { id: true, authId: true } },
                    },
                },
                _count: {
                    select: { tasks: true, members: true },
                },
            },
        });

        res.json({
            success: true,
            data: project,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function deleteProject(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);

        // Check if user owns the project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                ownerId: user.id,
            },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: "Project not found or you don't have permission to delete it",
            });
        }

        await prisma.project.delete({
            where: { id: projectId },
        });

        res.json({
            success: true,
            data: {
                message: "Project deleted successfully",
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function addMember(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);
        const { memberAuthId, role = "MEMBER" } = req.body;

        // Check if user has admin access to project
        const currentMember = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId: user.id,
                role: { in: ["OWNER", "ADMIN"] },
            },
        });

        if (!currentMember) {
            return res.status(403).json({
                success: false,
                error: "You don't have permission to add members to this project",
            });
        }

        // Get the user to be added
        const newMember = await getOrCreateUser(memberAuthId);

        // Check if user is already a member
        const existingMember = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId: newMember.id,
            },
        });

        if (existingMember) {
            return res.status(409).json({
                success: false,
                error: "User is already a member of this project",
            });
        }

        const projectMember = await prisma.projectMember.create({
            data: {
                projectId,
                userId: newMember.id,
                role,
            },
            include: {
                user: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
            },
        });

        res.status(201).json({
            success: true,
            data: projectMember,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function updateMemberRole(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);
        const memberId = parseInt(req.params.memberId);
        const { role } = req.body;

        // Check if user has owner access
        const currentMember = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId: user.id,
                role: "OWNER",
            },
        });

        if (!currentMember) {
            return res.status(403).json({
                success: false,
                error: "Only project owner can change member roles",
            });
        }

        const updatedMember = await prisma.projectMember.update({
            where: { id: memberId },
            data: { role },
            include: {
                user: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
            },
        });

        res.json({
            success: true,
            data: updatedMember,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function removeMember(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);
        const memberId = parseInt(req.params.memberId);

        // Get the member to be removed
        const memberToRemove = await prisma.projectMember.findUnique({
            where: { id: memberId },
            include: { user: true },
        });

        if (!memberToRemove || memberToRemove.projectId !== projectId) {
            return res.status(404).json({
                success: false,
                error: "Member not found in this project",
            });
        }

        // Check permissions
        const currentMember = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId: user.id,
            },
        });

        if (!currentMember) {
            return res.status(403).json({
                success: false,
                error: "You are not a member of this project",
            });
        }

        // Users can remove themselves, or admins/owners can remove others
        const canRemove =
            memberToRemove.userId === user.id ||
            ["OWNER", "ADMIN"].includes(currentMember.role);

        if (!canRemove) {
            return res.status(403).json({
                success: false,
                error: "You don't have permission to remove this member",
            });
        }

        // Cannot remove project owner
        if (memberToRemove.role === "OWNER") {
            return res.status(403).json({
                success: false,
                error: "Cannot remove project owner",
            });
        }

        await prisma.projectMember.delete({
            where: { id: memberId },
        });

        res.json({
            success: true,
            data: {
                message: "Member removed successfully",
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
    createProject,
    getProjects,
    getProjectById,
    getProjectChatInfo,
    updateProject,
    deleteProject,
    addMember,
    updateMemberRole,
    removeMember,
};
