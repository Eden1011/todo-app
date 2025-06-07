const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");
const {
    createNotification,
    notifyTaskAssigned,
} = require("../notification/notification.controller");

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

async function createTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            title,
            description,
            priority = "MEDIUM",
            status = "TODO",
            dueDate,
        } = req.body;

        let categoryIdsReq = req.body.categoryIds;
        let tagIdsReq = req.body.tagIds;
        let projectIdFromBody = req.body.projectId;
        let assigneeAuthIdFromBody = req.body.assigneeAuthId;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                success: false,
                error: "Title is required and cannot be empty.",
            });
        }

        let finalCategoryIds = [];
        if (categoryIdsReq) {
            if (typeof categoryIdsReq === "string") {
                try {
                    categoryIdsReq = JSON.parse(categoryIdsReq);
                } catch (e) {
                    categoryIdsReq = [];
                }
            }
            if (Array.isArray(categoryIdsReq)) {
                finalCategoryIds = categoryIdsReq
                    .map((id) => parseInt(id, 10))
                    .filter((id) => !isNaN(id) && id > 0);
            }
        }

        let finalTagIds = [];
        if (tagIdsReq) {
            if (typeof tagIdsReq === "string") {
                try {
                    tagIdsReq = JSON.parse(tagIdsReq);
                } catch (e) {
                    tagIdsReq = [];
                }
            }
            if (Array.isArray(tagIdsReq)) {
                finalTagIds = tagIdsReq
                    .map((id) => parseInt(id, 10))
                    .filter((id) => !isNaN(id) && id > 0);
            }
        }

        let assigneeId = null;
        if (
            assigneeAuthIdFromBody !== undefined &&
            assigneeAuthIdFromBody !== null &&
            assigneeAuthIdFromBody !== ""
        ) {
            const parsedAssigneeAuthId = parseInt(assigneeAuthIdFromBody, 10);
            if (isNaN(parsedAssigneeAuthId) || parsedAssigneeAuthId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "Assignee Auth ID must be a positive integer.",
                });
            }
            const assignee = await getOrCreateUser(parsedAssigneeAuthId);
            assigneeId = assignee.id;
        }

        let finalProjectId = null;
        if (
            projectIdFromBody !== undefined &&
            projectIdFromBody !== null &&
            projectIdFromBody !== ""
        ) {
            finalProjectId = parseInt(projectIdFromBody, 10);
            if (isNaN(finalProjectId) || finalProjectId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "Project ID must be a positive integer.",
                });
            }

            const project = await prisma.project.findFirst({
                where: {
                    id: finalProjectId,
                    OR: [
                        { ownerId: user.id },
                        { members: { some: { userId: user.id } } },
                    ],
                },
            });

            if (!project) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have access to this project or project does not exist.",
                });
            }

            const hasWriteAccess = await checkProjectWriteAccess(
                finalProjectId,
                user.id,
            );
            if (!hasWriteAccess) {
                return res.status(403).json({
                    success: false,
                    error: "Viewers cannot create tasks in projects. Only project owners, admins, and members can create tasks.",
                });
            }
        }

        const task = await prisma.task.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                priority,
                status,
                dueDate: dueDate ? new Date(dueDate) : null,
                ownerId: user.id,
                assigneeId,
                projectId: finalProjectId,
                categories: {
                    create: finalCategoryIds.map((catId) => ({
                        category: { connect: { id: catId } },
                    })),
                },
                tags: {
                    create: finalTagIds.map((tagIdValue) => ({
                        tag: { connect: { id: tagIdValue } },
                    })),
                },
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
                categories: {
                    include: {
                        category: {
                            select: { id: true, name: true, color: true },
                        },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });

        await createNotification(
            user.id,
            "TASK_STATUS_CHANGED",
            `Task '${task.title}' has been created`,
            task.id,
        );

        if (assigneeId && assigneeId !== user.id) {
            await notifyTaskAssigned(task.id, assigneeId, authId);
        }

        res.status(201).json({
            success: true,
            data: task,
        });
    } catch (error) {
        console.error("Error in createTask controller:", error);
        if (error.code && error.meta) {
            return res.status(400).json({
                success: false,
                error: "Database operation failed.",
                details: error.meta.target || error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    }
}

async function getTasks(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            status,
            priority,
            search,
            sortBy = "updatedAt",
            sortOrder = "desc",
            dueDateFrom,
            dueDateTo,
        } = req.query;

        let page = parseInt(req.query.page, 10) || 1;
        let limit = parseInt(req.query.limit, 10) || 20;
        if (limit > 100) limit = 100;
        if (page < 1) page = 1;

        let projectId = req.query.projectId;
        let categoryId = req.query.categoryId;
        let tagId = req.query.tagId;
        let assignedToMeQuery = req.query.assignedToMe;

        const skip = (page - 1) * limit;
        const take = limit;

        const where = {
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

        if (status) where.status = status;
        if (priority) where.priority = priority;

        if (projectId && projectId !== "") {
            const parsedProjectId = parseInt(projectId, 10);
            if (!isNaN(parsedProjectId) && parsedProjectId > 0) {
                where.projectId = parsedProjectId;
            }
        }

        if (assignedToMeQuery === "true") {
            where.assigneeId = user.id;
        }

        if (categoryId && categoryId !== "") {
            const parsedCategoryId = parseInt(categoryId, 10);
            if (!isNaN(parsedCategoryId) && parsedCategoryId > 0) {
                where.categories = {
                    some: { categoryId: parsedCategoryId },
                };
            }
        }
        if (tagId && tagId !== "") {
            const parsedTagId = parseInt(tagId, 10);
            if (!isNaN(parsedTagId) && parsedTagId > 0) {
                where.tags = {
                    some: { tagId: parsedTagId },
                };
            }
        }
        if (dueDateFrom || dueDateTo) {
            where.dueDate = {};
            if (dueDateFrom) {
                const dateFrom = new Date(dueDateFrom);
                if (!isNaN(dateFrom)) where.dueDate.gte = dateFrom;
            }
            if (dueDateTo) {
                const dateTo = new Date(dueDateTo);
                if (!isNaN(dateTo)) where.dueDate.lte = dateTo;
            }
        }

        if (search) {
            const searchCondition = {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ],
            };
            if (where.OR) {
                where.AND = where.AND
                    ? [...where.AND, searchCondition]
                    : [searchCondition];
            } else {
                where.OR = searchCondition.OR;
            }
        }

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    owner: { select: { id: true, authId: true } },
                    assignee: { select: { id: true, authId: true } },
                    project: { select: { id: true, name: true } },
                    categories: {
                        include: {
                            category: {
                                select: { id: true, name: true, color: true },
                            },
                        },
                    },
                    tags: {
                        include: {
                            tag: {
                                select: { id: true, name: true, color: true },
                            },
                        },
                    },
                },
            }),
            prisma.task.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                tasks,
                pagination: {
                    page: page,
                    limit: limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error("Error in getTasks controller:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function getTaskById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id, 10);

        if (isNaN(taskId) || taskId <= 0) {
            return res.status(400).json({
                success: false,
                error: "Task ID must be a positive integer.",
            });
        }

        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
                categories: {
                    include: {
                        category: {
                            select: { id: true, name: true, color: true },
                        },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        console.error("Error in getTaskById controller:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function updateTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id, 10);

        if (isNaN(taskId) || taskId <= 0) {
            return res.status(400).json({
                success: false,
                error: "Task ID must be a positive integer.",
            });
        }

        const { title, description, priority, status, dueDate } = req.body;

        let categoryIdsReq = req.body.categoryIds;
        let tagIdsReq = req.body.tagIds;
        let assigneeAuthIdFromBody = req.body.assigneeAuthId;
        let projectIdFromBody = req.body.projectId;

        const existingTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            include: {
                assignee: { select: { authId: true } },
            },
        });

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have access to it",
            });
        }

        const isOwner = existingTask.ownerId === user.id;
        const updateData = { updatedAt: new Date() };

        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined)
            updateData.description = description ? description.trim() : null;
        if (dueDate !== undefined)
            updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (status !== undefined) updateData.status = status;

        if (isOwner) {
            if (priority !== undefined) updateData.priority = priority;

            if (projectIdFromBody !== undefined) {
                if (projectIdFromBody === null || projectIdFromBody === "") {
                    if (existingTask.projectId) {
                        const hasWriteAccess = await checkProjectWriteAccess(
                            existingTask.projectId,
                            user.id,
                        );
                        if (!hasWriteAccess) {
                            return res.status(403).json({
                                success: false,
                                error: "Viewers cannot remove tasks from projects.",
                            });
                        }
                    }
                    updateData.projectId = null;
                } else {
                    const parsedProjectId = parseInt(projectIdFromBody, 10);
                    if (isNaN(parsedProjectId) || parsedProjectId <= 0) {
                        return res.status(400).json({
                            success: false,
                            error: "Project ID must be a positive integer or null.",
                        });
                    }

                    const hasWriteAccess = await checkProjectWriteAccess(
                        parsedProjectId,
                        user.id,
                    );
                    if (!hasWriteAccess) {
                        return res.status(403).json({
                            success: false,
                            error: "Viewers cannot assign tasks to projects. Only project owners, admins, and members can modify project tasks.",
                        });
                    }

                    if (
                        existingTask.projectId &&
                        existingTask.projectId !== parsedProjectId
                    ) {
                        const hasCurrentWriteAccess =
                            await checkProjectWriteAccess(
                                existingTask.projectId,
                                user.id,
                            );
                        if (!hasCurrentWriteAccess) {
                            return res.status(403).json({
                                success: false,
                                error: "Viewers cannot move tasks between projects.",
                            });
                        }
                    }

                    updateData.projectId = parsedProjectId;
                }
            }

            if (assigneeAuthIdFromBody !== undefined) {
                if (
                    assigneeAuthIdFromBody === null ||
                    assigneeAuthIdFromBody === ""
                ) {
                    updateData.assigneeId = null;
                } else {
                    const parsedAssigneeAuthId = parseInt(
                        assigneeAuthIdFromBody,
                        10,
                    );
                    if (
                        isNaN(parsedAssigneeAuthId) ||
                        parsedAssigneeAuthId <= 0
                    ) {
                        return res.status(400).json({
                            success: false,
                            error: "Assignee Auth ID must be a positive integer or null.",
                        });
                    }
                    const assignee =
                        await getOrCreateUser(parsedAssigneeAuthId);
                    updateData.assigneeId = assignee.id;
                }
            }
        } else {
            if (priority !== undefined && priority !== existingTask.priority) {
                return res.status(403).json({
                    success: false,
                    error: "Only owner can change priority",
                });
            }
            if (
                projectIdFromBody !== undefined &&
                projectIdFromBody !== existingTask.projectId &&
                projectIdFromBody !== null &&
                existingTask.projectId !== null &&
                parseInt(projectIdFromBody, 10) !== existingTask.projectId
            ) {
                return res.status(403).json({
                    success: false,
                    error: "Only owner can change project",
                });
            }
            if (assigneeAuthIdFromBody !== undefined) {
                const currentAssigneeAuthId = existingTask.assignee
                    ? existingTask.assignee.authId
                    : null;
                const newAssigneeAuthId =
                    assigneeAuthIdFromBody === null ||
                    assigneeAuthIdFromBody === ""
                        ? null
                        : parseInt(assigneeAuthIdFromBody, 10);
                if (newAssigneeAuthId !== currentAssigneeAuthId) {
                    return res.status(403).json({
                        success: false,
                        error: "Only owner can change assignee",
                    });
                }
            }

            if (projectIdFromBody !== undefined) {
                const currentProjectId = existingTask.projectId;
                const newProjectId =
                    projectIdFromBody === null || projectIdFromBody === ""
                        ? null
                        : parseInt(projectIdFromBody, 10);

                if (currentProjectId !== newProjectId) {
                    if (currentProjectId) {
                        const hasCurrentWriteAccess =
                            await checkProjectWriteAccess(
                                currentProjectId,
                                user.id,
                            );
                        if (!hasCurrentWriteAccess) {
                            return res.status(403).json({
                                success: false,
                                error: "Viewers cannot modify project assignments.",
                            });
                        }
                    }

                    if (newProjectId) {
                        const hasNewWriteAccess = await checkProjectWriteAccess(
                            newProjectId,
                            user.id,
                        );
                        if (!hasNewWriteAccess) {
                            return res.status(403).json({
                                success: false,
                                error: "Viewers cannot assign tasks to projects.",
                            });
                        }
                    }
                }
            }
        }

        await prisma.task.update({
            where: { id: taskId },
            data: updateData,
        });

        if (isOwner) {
            if (categoryIdsReq !== undefined) {
                let finalCategoryIds = [];
                if (typeof categoryIdsReq === "string") {
                    try {
                        categoryIdsReq = JSON.parse(categoryIdsReq);
                    } catch (e) {
                        categoryIdsReq = [];
                    }
                }
                if (Array.isArray(categoryIdsReq)) {
                    finalCategoryIds = categoryIdsReq
                        .map((id) => parseInt(id, 10))
                        .filter((id) => !isNaN(id) && id > 0);
                }
                await prisma.categoryOnTask.deleteMany({ where: { taskId } });
                if (finalCategoryIds.length > 0) {
                    await prisma.categoryOnTask.createMany({
                        data: finalCategoryIds.map((categoryId) => ({
                            taskId,
                            categoryId,
                        })),
                    });
                }
            }
            if (tagIdsReq !== undefined) {
                let finalTagIds = [];
                if (typeof tagIdsReq === "string") {
                    try {
                        tagIdsReq = JSON.parse(tagIdsReq);
                    } catch (e) {
                        tagIdsReq = [];
                    }
                }
                if (Array.isArray(tagIdsReq)) {
                    finalTagIds = tagIdsReq
                        .map((id) => parseInt(id, 10))
                        .filter((id) => !isNaN(id) && id > 0);
                }
                await prisma.tagOnTask.deleteMany({ where: { taskId } });
                if (finalTagIds.length > 0) {
                    await prisma.tagOnTask.createMany({
                        data: finalTagIds.map((tagId) => ({ taskId, tagId })),
                    });
                }
            }
        }

        const taskWithIncludes = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
                categories: {
                    include: {
                        category: {
                            select: { id: true, name: true, color: true },
                        },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });

        const usersToNotify = [];
        if (existingTask.ownerId !== user.id) {
            usersToNotify.push(existingTask.ownerId);
        }
        if (existingTask.assigneeId && existingTask.assigneeId !== user.id) {
            usersToNotify.push(existingTask.assigneeId);
        }
        usersToNotify.push(user.id);

        if (usersToNotify.length > 0) {
            for (const userId of usersToNotify) {
                await createNotification(
                    userId,
                    "TASK_STATUS_CHANGED",
                    `Task '${taskWithIncludes.title}' has been updated`,
                    taskId,
                );
            }
        }

        res.json({
            success: true,
            data: taskWithIncludes,
        });
    } catch (error) {
        console.error("Error in updateTask controller:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
        });
    }
}

async function deleteTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id, 10);

        if (isNaN(taskId) || taskId <= 0) {
            return res.status(400).json({
                success: false,
                error: "Task ID must be a positive integer.",
            });
        }

        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ownerId: user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have permission to delete it",
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
                    error: "Viewers cannot delete tasks from projects.",
                });
            }
        }

        await prisma.$transaction([
            prisma.categoryOnTask.deleteMany({ where: { taskId: taskId } }),
            prisma.tagOnTask.deleteMany({ where: { taskId: taskId } }),
            prisma.task.delete({ where: { id: taskId } }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                message: "Task deleted successfully",
            },
        });
    } catch (error) {
        console.error("Error in deleteTask controller:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function assignTask(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId) || taskId <= 0) {
            return res.status(400).json({
                success: false,
                error: "Task ID must be a positive integer.",
            });
        }
        const { assigneeAuthId } = req.body;

        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ownerId: user.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                error: "Task not found or you don't have permission to assign it",
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
                    error: "Viewers cannot assign tasks in projects.",
                });
            }
        }

        let assigneeIdToSet = null;
        if (
            assigneeAuthId !== null &&
            assigneeAuthId !== undefined &&
            assigneeAuthId !== ""
        ) {
            const parsedAssigneeAuthId = parseInt(assigneeAuthId, 10);
            if (isNaN(parsedAssigneeAuthId) || parsedAssigneeAuthId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "Assignee Auth ID must be a positive integer or null.",
                });
            }
            const assignee = await getOrCreateUser(parsedAssigneeAuthId);
            assigneeIdToSet = assignee.id;
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: { assigneeId: assigneeIdToSet, updatedAt: new Date() },
            include: {
                owner: { select: { id: true, authId: true } },
                assignee: { select: { id: true, authId: true } },
                project: { select: { id: true, name: true } },
            },
        });

        if (assigneeIdToSet) {
            await notifyTaskAssigned(taskId, assigneeIdToSet, authId);
        }

        res.json({
            success: true,
            data: updatedTask,
        });
    } catch (error) {
        console.error("Error in assignTask controller:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask,
};
