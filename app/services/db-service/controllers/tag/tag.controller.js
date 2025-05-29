const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Create a new tag
 */
async function createTag(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const { name, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Tag name is required",
            });
        }

        // Check if tag with this name already exists for user
        const existingTag = await prisma.tag.findFirst({
            where: {
                name,
                ownerId: user.id,
            },
        });

        if (existingTag) {
            return res.status(409).json({
                success: false,
                error: "Tag with this name already exists",
            });
        }

        const tag = await prisma.tag.create({
            data: {
                name,
                color,
                ownerId: user.id,
            },
            include: {
                owner: { select: { id: true, authId: true } },
                _count: {
                    select: { tasks: true },
                },
            },
        });

        res.status(201).json({
            success: true,
            data: tag,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get tags with pagination and filtering
 */
async function getTags(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            page = 1,
            limit = 50,
            search,
            sortBy = "name",
            sortOrder = "asc",
            withTaskCount = true,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {
            ownerId: user.id,
        };

        if (search) {
            where.name = {
                contains: search,
            };
        }

        const [tags, total] = await Promise.all([
            prisma.tag.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, authId: true } },
                    ...(withTaskCount === "true" && {
                        _count: {
                            select: { tasks: true },
                        },
                    }),
                },
            }),
            prisma.tag.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                tags,
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
 * Get tag by ID
 */
async function getTagById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const tagId = parseInt(req.params.id);

        const tag = await prisma.tag.findFirst({
            where: {
                id: tagId,
                ownerId: user.id,
            },
            include: {
                owner: { select: { id: true, authId: true } },
                tasks: {
                    include: {
                        task: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                priority: true,
                                dueDate: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: {
                        task: { updatedAt: "desc" },
                    },
                    take: 20,
                },
                _count: {
                    select: { tasks: true },
                },
            },
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                error: "Tag not found",
            });
        }

        res.json({
            success: true,
            data: tag,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Update tag
 */
async function updateTag(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const tagId = parseInt(req.params.id);

        const { name, color } = req.body;

        // Check if tag exists and user owns it
        const existingTag = await prisma.tag.findFirst({
            where: {
                id: tagId,
                ownerId: user.id,
            },
        });

        if (!existingTag) {
            return res.status(404).json({
                success: false,
                error: "Tag not found",
            });
        }

        // Check if new name conflicts with existing tags
        if (name && name !== existingTag.name) {
            const conflictingTag = await prisma.tag.findFirst({
                where: {
                    name,
                    ownerId: user.id,
                    id: { not: tagId },
                },
            });

            if (conflictingTag) {
                return res.status(409).json({
                    success: false,
                    error: "Tag with this name already exists",
                });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (color !== undefined) updateData.color = color;

        const tag = await prisma.tag.update({
            where: { id: tagId },
            data: updateData,
            include: {
                owner: { select: { id: true, authId: true } },
                _count: {
                    select: { tasks: true },
                },
            },
        });

        res.json({
            success: true,
            data: tag,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Delete tag
 */
async function deleteTag(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const tagId = parseInt(req.params.id);

        // Check if tag exists and user owns it
        const tag = await prisma.tag.findFirst({
            where: {
                id: tagId,
                ownerId: user.id,
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                error: "Tag not found",
            });
        }

        // Check if tag has tasks
        if (tag._count.tasks > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete tag with ${tag._count.tasks} associated tasks. Remove tasks from tag first.`,
            });
        }

        await prisma.tag.delete({
            where: { id: tagId },
        });

        res.json({
            success: true,
            data: {
                message: "Tag deleted successfully",
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
 * Get tag statistics
 */
async function getTagStats(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const stats = await prisma.tag.findMany({
            where: {
                ownerId: user.id,
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
                tasks: {
                    include: {
                        task: {
                            select: { status: true },
                        },
                    },
                },
            },
        });

        const tagsWithStats = stats.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            totalTasks: tag._count.tasks,
            tasksByStatus: tag.tasks.reduce((acc, taskOnTag) => {
                const status = taskOnTag.task.status;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {}),
        }));

        res.json({
            success: true,
            data: tagsWithStats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Get popular tags (most used)
 */
async function getPopularTags(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const limit = parseInt(req.query.limit) || 10;

        const tags = await prisma.tag.findMany({
            where: {
                ownerId: user.id,
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: {
                tasks: {
                    _count: "desc",
                },
            },
            take: limit,
        });

        res.json({
            success: true,
            data: tags,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

module.exports = {
    createTag,
    getTags,
    getTagById,
    updateTag,
    deleteTag,
    getTagStats,
    getPopularTags,
};
