const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

async function checkProjectWriteAccess(projectId, userId) {
    if (!projectId) return true;

    const member = await prisma.projectMember.findFirst({
        where: {
            projectId: projectId,
            userId: userId,
            role: { in: ["OWNER", "ADMIN", "MEMBER"] },
        },
    });
    return !!member;
}

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

        if (task.projectId) {
            const hasWriteAccess = await checkProjectWriteAccess(
                task.projectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot modify tags of tasks in projects.",
                });
            }
        }

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

async function removeTagFromTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);
        const tagId = parseInt(req.params.tagId);

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

        if (task.projectId) {
            const hasWriteAccess = await checkProjectWriteAccess(
                task.projectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot modify tags of tasks in projects.",
                });
            }
        }

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

        if (tagOnTask.tag.ownerId !== user.id) {
            return res.status(403).json({
                success: false,
                error: "You don't own this tag",
            });
        }

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

async function getTaskTags(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.taskId);

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

async function getTagTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const tagId = parseInt(req.params.tagId);

        const { page = 1, limit = 20, status, priority } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

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

async function getPopularTagCombinations(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const limit = parseInt(req.query.limit) || 10;

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

        const taskTagMap = {};
        tagCombinations.forEach((tt) => {
            if (!taskTagMap[tt.taskId]) {
                taskTagMap[tt.taskId] = [];
            }
            taskTagMap[tt.taskId].push(tt.tag);
        });

        const combinationCounts = {};
        Object.values(taskTagMap).forEach((tags) => {
            if (tags.length > 1) {
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
    getPopularTagCombinations,
};
