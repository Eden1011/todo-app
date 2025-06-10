const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getOrCreateUser(authId) {
    try {
        let user = await prisma.user.findUnique({
            where: { authId },
        });

        if (!user) {
            user = await prisma.user.create({
                data: { authId },
            });
        }

        return user;
    } catch (error) {
        throw new Error(`Failed to get or create user: ${error.message}`);
    }
}

async function getUserProfile(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const [taskCount, projectCount, categoryCount, tagCount] =
            await Promise.all([
                prisma.task.count({ where: { ownerId: user.id } }),
                prisma.project.count({ where: { ownerId: user.id } }),
                prisma.category.count({ where: { ownerId: user.id } }),
                prisma.tag.count({ where: { ownerId: user.id } }),
            ]);

        const tasksByStatus = await prisma.task.groupBy({
            by: ["status"],
            where: { ownerId: user.id },
            _count: { id: true },
        });

        const assignedTasksCount = await prisma.task.count({
            where: { assigneeId: user.id },
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    authId: user.authId,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                statistics: {
                    ownedTasks: taskCount,
                    assignedTasks: assignedTasksCount,
                    projects: projectCount,
                    categories: categoryCount,
                    tags: tagCount,
                    tasksByStatus: tasksByStatus.reduce((acc, item) => {
                        acc[item.status] = item._count.id;
                        return acc;
                    }, {}),
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

async function getUserActivity(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { limit = 10 } = req.query;

        const recentTasks = await prisma.task.findMany({
            where: {
                OR: [{ ownerId: user.id }, { assigneeId: user.id }],
            },
            orderBy: { updatedAt: "desc" },
            take: parseInt(limit),
            include: {
                owner: {
                    select: { id: true, authId: true },
                },
                assignee: {
                    select: { id: true, authId: true },
                },
                project: {
                    select: { id: true, name: true },
                },
            },
        });

        const recentProjects = await prisma.project.findMany({
            where: {
                OR: [
                    { ownerId: user.id },
                    { members: { some: { userId: user.id } } },
                ],
            },
            orderBy: { updatedAt: "desc" },
            take: parseInt(limit),
            include: {
                owner: {
                    select: { id: true, authId: true },
                },
                _count: {
                    select: { tasks: true, members: true },
                },
            },
        });

        res.json({
            success: true,
            data: {
                recentTasks,
                recentProjects,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function searchUsers(req, res) {
    try {
        const { query, id, authId } = req.query;

        const where = {
            authId: {
                not: req.user.id,
            },
        };

        if (id) {
            where.id = parseInt(id);
        }

        if (authId) {
            where.authId = parseInt(authId);
        }

        if (query) {
            where.authId = {
                ...where.authId,
                equals: isNaN(parseInt(query)) ? undefined : parseInt(query),
            };
            if (where.authId.equals === undefined) {
                delete where.authId.equals;
            }
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                authId: true,
                createdAt: true,
                updatedAt: true,
            },
            take: 10,
        });

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function deleteUser(req, res) {
    try {
        const authId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { authId },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        await prisma.user.delete({
            where: { id: user.id },
        });

        res.json({
            success: true,
            data: {
                message:
                    "User account and all associated data deleted successfully",
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
    getOrCreateUser,
    getUserProfile,
    getUserActivity,
    searchUsers,
    deleteUser,
};
