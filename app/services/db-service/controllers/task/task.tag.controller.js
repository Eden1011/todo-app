const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

/**
 * Add tag to task
 */
async function addTagToTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { tagId } = req.body;

        if (!tagId) {
            return res.status(400).json({
                success: false,
                error: "Tag ID is required",
            });
        }

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Check if user owns the tag
        const tag = await prisma.tag.findFirst({
            where: {
                id: tagId,
                ownerId: user.id,
            },
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                error: "Tag not found or you don't own it",
            });
        }

        // Check if tag is already assigned to task
        const existingAssignment = await prisma.tagOnTask.findUnique({
            where: {
                tagId_taskId: {
                    tagId: tagId,
                    taskId: taskId,
                },
            },
        });

        if (existingAssignment) {
            return res.status(409).json({
                success: false,
                error: "Tag is already assigned to this task",
            });
        }

        // Add tag to task
        const tagOnTask = await prisma.tagOnTask.create({
            data: {
                tagId: tagId,
                taskId: taskId,
            },
            include: {
                tag: {
                    select: { id: true, name: true, color: true },
                },
                task: {
                    select: { id: true, title: true },
                },
            },
        });

        res.status(201).json({
            success: true,
            data: tagOnTask,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Remove tag from task
 */
async function removeTagFromTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const tagId = parseInt(req.params.tagId);

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Check if tag assignment exists
        const tagOnTask = await prisma.tagOnTask.findUnique({
            where: {
                tagId_taskId: {
                    tagId: tagId,
                    taskId: taskId,
                },
            },
            include: {
                tag: {
                    select: { ownerId: true },
                },
            },
        });

        if (!tagOnTask) {
            return res.status(404).json({
                success: false,
                error: "Tag is not assigned to this task",
            });
        }

        // Check if user owns the tag
        if (tagOnTask.tag.ownerId !== user.id) {
            return res.status(403).json({
                success: false,
                error: "You don't own this tag",
            });
        }

        // Remove tag from task
        await prisma.tagOnTask.delete({
            where: {
                tagId_taskId: {
                    tagId: tagId,
                    taskId: taskId,
                },
            },
        });

        res.json({
            success: true,
            data: {
                message: "Tag removed from task successfully",
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
 * Get all tags for a task
 */
async function getTaskTags(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        const tags = await prisma.tagOnTask.findMany({
            where: {
                taskId: taskId,
            },
            include: {
                tag: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        ownerId: true,
                    },
                },
            },
            orderBy: {
                assignedAt: "asc",
            },
        });

        res.json({
            success: true,
            data: {
                taskId,
                tags: tags.map((t) => ({
                    ...t.tag,
                    assignedAt: t.assignedAt,
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

/**
 * Get all tasks for a tag
 */
async function getTagTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const tagId = parseInt(req.params.tagId);

        const { page = 1, limit = 20, status, priority } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Check if user owns the tag
        const tag = await prisma.tag.findFirst({
            where: {
                id: tagId,
                ownerId: user.id,
            },
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                error: "Tag not found or you don't own it",
            });
        }

        // Build where clause for tasks
        const taskWhere = {};
        if (status) taskWhere.status = status;
        if (priority) taskWhere.priority = priority;

        const [tagTasks, total] = await Promise.all([
            prisma.tagOnTask.findMany({
                where: {
                    tagId: tagId,
                    task: taskWhere,
                },
                skip,
                take,
                include: {
                    task: {
                        include: {
                            owner: { select: { id: true, authId: true } },
                            assignee: { select: { id: true, authId: true } },
                            project: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: {
                    assignedAt: "desc",
                },
            }),
            prisma.tagOnTask.count({
                where: {
                    tagId: tagId,
                    task: taskWhere,
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                tag: {
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                },
                tasks: tagTasks.map((tt) => ({
                    ...tt.task,
                    assignedAt: tt.assignedAt,
                })),
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
 * Bulk assign tags to task
 */
async function bulkAssignTagsToTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const { tagIds } = req.body;

        if (!Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Tag IDs array is required",
            });
        }

        // Check if user has access to task
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        // Check if user owns all tags
        const tags = await prisma.tag.findMany({
            where: {
                id: { in: tagIds },
                ownerId: user.id,
            },
        });

        if (tags.length !== tagIds.length) {
            return res.status(404).json({
                success: false,
                error: "Some tags not found or you don't own them",
            });
        }

        // Remove existing tags first
        await prisma.tagOnTask.deleteMany({
            where: {
                taskId: taskId,
                tag: {
                    ownerId: user.id,
                },
            },
        });

        // Add new tags
        const tagAssignments = tagIds.map((tagId) => ({
            tagId,
            taskId,
        }));

        await prisma.tagOnTask.createMany({
            data: tagAssignments,
        });

        // Get updated task with tags
        const updatedTaskTags = await prisma.tagOnTask.findMany({
            where: {
                taskId: taskId,
            },
            include: {
                tag: {
                    select: { id: true, name: true, color: true },
                },
            },
        });

        res.json({
            success: true,
            data: {
                message: `${tagIds.length} tags assigned to task`,
                taskId,
                tags: updatedTaskTags.map((t) => t.tag),
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
 * Bulk assign tasks to tag
 */
async function bulkAssignTasksToTag(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const tagId = parseInt(req.params.tagId);
        const { taskIds } = req.body;

        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Task IDs array is required",
            });
        }

        // Check if user owns the tag
        const tag = await prisma.tag.findFirst({
            where: {
                id: tagId,
                ownerId: user.id,
            },
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                error: "Tag not found or you don't own it",
            });
        }

        // Check if user has access to all tasks
        const accessibleTasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds },
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            select: { id: true },
        });

        if (accessibleTasks.length !== taskIds.length) {
            return res.status(404).json({
                success: false,
                error: "Some tasks not found or you don't have access to them",
            });
        }

        // Remove existing assignments for these tasks to this tag
        await prisma.tagOnTask.deleteMany({
            where: {
                tagId: tagId,
                taskId: { in: taskIds },
            },
        });

        // Add new assignments
        const taskAssignments = taskIds.map((taskId) => ({
            tagId,
            taskId,
        }));

        const result = await prisma.tagOnTask.createMany({
            data: taskAssignments,
        });

        res.json({
            success: true,
            data: {
                message: `${result.count} tasks assigned to tag "${tag.name}"`,
                tagId,
                assignedCount: result.count,
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
 * Get popular tag combinations (tags often used together)
 */
async function getPopularTagCombinations(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const limit = parseInt(req.query.limit) || 10;

        // Get all task-tag relationships for user's tags
        const tagCombinations = await prisma.tagOnTask.findMany({
            where: {
                tag: {
                    ownerId: user.id,
                },
            },
            select: {
                taskId: true,
                tag: {
                    select: { id: true, name: true },
                },
            },
        });

        // Group by taskId to find tag combinations
        const taskTagMap = {};
        tagCombinations.forEach((tt) => {
            if (!taskTagMap[tt.taskId]) {
                taskTagMap[tt.taskId] = [];
            }
            taskTagMap[tt.taskId].push(tt.tag);
        });

        // Find combinations that appear together
        const combinationCounts = {};
        Object.values(taskTagMap).forEach((tags) => {
            if (tags.length > 1) {
                // Generate all pairs
                for (let i = 0; i < tags.length; i++) {
                    for (let j = i + 1; j < tags.length; j++) {
                        const combo = [tags[i].name, tags[j].name]
                            .sort()
                            .join(" + ");
                        combinationCounts[combo] =
                            (combinationCounts[combo] || 0) + 1;
                    }
                }
            }
        });

        // Sort by frequency and take top combinations
        const popularCombinations = Object.entries(combinationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([combination, count]) => ({
                combination,
                count,
                tags: combination.split(" + "),
            }));

        res.json({
            success: true,
            data: {
                popularCombinations,
                totalUniqueCombinations: Object.keys(combinationCounts).length,
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
    addTagToTask,
    removeTagFromTask,
    getTaskTags,
    getTagTasks,
    bulkAssignTagsToTask,
    bulkAssignTasksToTag,
    getPopularTagCombinations,
};
