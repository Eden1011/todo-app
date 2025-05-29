const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

async function createCategory(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const { name, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Category name is required",
            });
        }

        // Check if category with this name already exists for user
        const existingCategory = await prisma.category.findFirst({
            where: {
                name,
                ownerId: user.id,
            },
        });

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                error: "Category with this name already exists",
            });
        }

        const category = await prisma.category.create({
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
            data: category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function getCategories(req, res) {
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

        const where = {
            ownerId: user.id,
        };

        if (search) {
            where.name = {
                contains: search,
            };
        }

        const [categories, total] = await Promise.all([
            prisma.category.findMany({
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
            prisma.category.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                categories,
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

async function getCategoryById(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const categoryId = parseInt(req.params.id);

        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
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

        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found",
            });
        }

        res.json({
            success: true,
            data: category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function updateCategory(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const categoryId = parseInt(req.params.id);

        const { name, color } = req.body;

        // Check if category exists and user owns it
        const existingCategory = await prisma.category.findFirst({
            where: {
                id: categoryId,
                ownerId: user.id,
            },
        });

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                error: "Category not found",
            });
        }

        // Check if new name conflicts with existing categories
        if (name && name !== existingCategory.name) {
            const conflictingCategory = await prisma.category.findFirst({
                where: {
                    name,
                    ownerId: user.id,
                    id: { not: categoryId },
                },
            });

            if (conflictingCategory) {
                return res.status(409).json({
                    success: false,
                    error: "Category with this name already exists",
                });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (color !== undefined) updateData.color = color;

        const category = await prisma.category.update({
            where: { id: categoryId },
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
            data: category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function deleteCategory(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const categoryId = parseInt(req.params.id);

        // Check if category exists and user owns it
        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                ownerId: user.id,
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: "Category not found",
            });
        }

        // Check if category has tasks
        if (category._count.tasks > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete category with ${category._count.tasks} associated tasks. Remove tasks from category first.`,
            });
        }

        await prisma.category.delete({
            where: { id: categoryId },
        });

        res.json({
            success: true,
            data: {
                message: "Category deleted successfully",
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function getCategoryStats(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const stats = await prisma.category.findMany({
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

        const categoriesWithStats = stats.map((category) => ({
            id: category.id,
            name: category.name,
            color: category.color,
            totalTasks: category._count.tasks,
            tasksByStatus: category.tasks.reduce((acc, taskOnCategory) => {
                const status = taskOnCategory.task.status;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {}),
        }));

        res.json({
            success: true,
            data: categoriesWithStats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function bulkDeleteCategories(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);
        const { categoryIds } = req.body;

        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Category IDs array is required",
            });
        }

        // Check if all categories exist and belong to user
        const categories = await prisma.category.findMany({
            where: {
                id: { in: categoryIds },
                ownerId: user.id,
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });

        if (categories.length !== categoryIds.length) {
            return res.status(404).json({
                success: false,
                error: "Some categories not found or don't belong to you",
            });
        }

        // Check if any categories have tasks
        const categoriesWithTasks = categories.filter(
            (cat) => cat._count.tasks > 0,
        );
        if (categoriesWithTasks.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete categories with tasks: ${categoriesWithTasks.map((cat) => cat.name).join(", ")}`,
            });
        }

        const result = await prisma.category.deleteMany({
            where: {
                id: { in: categoryIds },
                ownerId: user.id,
            },
        });

        res.json({
            success: true,
            data: {
                message: `${result.count} categories deleted successfully`,
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
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategoryStats,
    bulkDeleteCategories,
};
