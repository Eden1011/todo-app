const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Create a new project
 */
async function createProject(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Project name is required",
            });
        }

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

        res.status(201).json({
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

/**
 * Get projects with pagination and filtering
 */
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

        res.json({
            success: true,
            data: {
                projects,
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

/**
 * Get project by ID
 */
async function getProjectById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);

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

/**
 * Update project
 */
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

/**
 * Delete project
 */
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

/**
 * Add member to project
 */
async function addMember(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);
        const { memberAuthId, role = "MEMBER" } = req.body;

        if (!memberAuthId) {
            return res.status(400).json({
                success: false,
                error: "Member authId is required",
            });
        }

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

/**
 * Update member role
 */
async function updateMemberRole(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const projectId = parseInt(req.params.id);
        const memberId = parseInt(req.params.memberId);
        const { role } = req.body;

        if (!role || !["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "Valid role is required",
            });
        }

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

/**
 * Remove member from project
 */
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
    updateProject,
    deleteProject,
    addMember,
    updateMemberRole,
    removeMember,
};
