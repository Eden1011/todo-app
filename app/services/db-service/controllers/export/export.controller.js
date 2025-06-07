const { PrismaClient } = require("@prisma/client");
const { getOrCreateUser } = require("../user/user.controller");

const prisma = new PrismaClient();

async function exportTasksToCSV(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            projectId,
            status,
            priority,
            includeArchived = false,
        } = req.query;

        const where = {
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

        if (projectId) where.projectId = parseInt(projectId);
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (includeArchived !== "true") {
            where.status = { notIn: ["CANCELED"] };
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                owner: { select: { authId: true } },
                assignee: { select: { authId: true } },
                project: { select: { name: true } },
                categories: {
                    include: {
                        category: { select: { name: true } },
                    },
                },
                tags: {
                    include: {
                        tag: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // Convert to CSV format
        const csvHeader = [
            "ID",
            "Title",
            "Description",
            "Status",
            "Priority",
            "Due Date",
            "Project",
            "Owner",
            "Assignee",
            "Categories",
            "Tags",
            "Created At",
            "Updated At",
        ];

        const csvRows = tasks.map((task) => [
            task.id,
            `"${(task.title || "").replace(/"/g, '""')}"`,
            `"${(task.description || "").replace(/"/g, '""')}"`,
            task.status,
            task.priority,
            task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
            task.project ? `"${task.project.name.replace(/"/g, '""')}"` : "",
            task.owner.authId,
            task.assignee ? task.assignee.authId : "",
            `"${task.categories
                .map((c) => c.category.name)
                .join(", ")
                .replace(/"/g, '""')}"`,
            `"${task.tags
                .map((t) => t.tag.name)
                .join(", ")
                .replace(/"/g, '""')}"`,
            task.createdAt.toISOString(),
            task.updatedAt.toISOString(),
        ]);

        const csvContent = [
            csvHeader.join(","),
            ...csvRows.map((row) => row.join(",")),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="tasks_export_${new Date().toISOString().split("T")[0]}.csv"`,
        );
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function exportTasksToJSON(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const {
            projectId,
            status,
            priority,
            includeArchived = false,
            detailed = true,
        } = req.query;

        const where = {
            OR: [{ ownerId: user.id }, { assigneeId: user.id }],
        };

        if (projectId) where.projectId = parseInt(projectId);
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (includeArchived !== "true") {
            where.status = { notIn: ["CANCELED"] };
        }

        const includeOptions =
            detailed === "true"
                ? {
                      owner: { select: { authId: true } },
                      assignee: { select: { authId: true } },
                      project: { select: { id: true, name: true } },
                      categories: {
                          include: {
                              category: {
                                  select: { id: true, name: true },
                              },
                          },
                      },
                      tags: {
                          include: {
                              tag: {
                                  select: { id: true, name: true },
                              },
                          },
                      },
                  }
                : {
                      owner: { select: { authId: true } },
                      assignee: { select: { authId: true } },
                  };

        const tasks = await prisma.task.findMany({
            where,
            include: includeOptions,
            orderBy: { createdAt: "asc" },
        });

        const exportData = {
            exportInfo: {
                exportedAt: new Date().toISOString(),
                exportedBy: authId,
                totalTasks: tasks.length,
                filters: {
                    projectId: projectId || null,
                    status: status || null,
                    priority: priority || null,
                    includeArchived: includeArchived === "true",
                },
            },
            tasks: tasks,
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="tasks_export_${new Date().toISOString().split("T")[0]}.json"`,
        );
        res.json(exportData);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function exportProjectsToCSV(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const { ownedOnly = false } = req.query;

        const where =
            ownedOnly === "true"
                ? { ownerId: user.id }
                : {
                      OR: [
                          { ownerId: user.id },
                          { members: { some: { userId: user.id } } },
                      ],
                  };

        const projects = await prisma.project.findMany({
            where,
            include: {
                owner: { select: { authId: true } },
                members: {
                    include: {
                        user: { select: { authId: true } },
                    },
                },
                _count: {
                    select: { tasks: true, members: true },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // Convert to CSV format
        const csvHeader = [
            "ID",
            "Name",
            "Description",
            "Owner",
            "Members Count",
            "Tasks Count",
            "Members",
            "Created At",
            "Updated At",
        ];

        const csvRows = projects.map((project) => [
            project.id,
            `"${(project.name || "").replace(/"/g, '""')}"`,
            `"${(project.description || "").replace(/"/g, '""')}"`,
            project.owner.authId,
            project._count.members,
            project._count.tasks,
            `"${project.members
                .map((m) => `${m.user.authId} (${m.role})`)
                .join(", ")
                .replace(/"/g, '""')}"`,
            project.createdAt.toISOString(),
            project.updatedAt.toISOString(),
        ]);

        const csvContent = [
            csvHeader.join(","),
            ...csvRows.map((row) => row.join(",")),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="projects_export_${new Date().toISOString().split("T")[0]}.csv"`,
        );
        res.send(csvContent);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function exportProjectsToJSON(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const { ownedOnly = false, includeTasks = false } = req.query;

        const where =
            ownedOnly === "true"
                ? { ownerId: user.id }
                : {
                      OR: [
                          { ownerId: user.id },
                          { members: { some: { userId: user.id } } },
                      ],
                  };

        const includeOptions = {
            owner: { select: { authId: true } },
            members: {
                include: {
                    user: { select: { authId: true } },
                },
            },
            _count: {
                select: { tasks: true, members: true },
            },
        };

        if (includeTasks === "true") {
            includeOptions.tasks = {
                include: {
                    owner: { select: { authId: true } },
                    assignee: { select: { authId: true } },
                },
            };
        }

        const projects = await prisma.project.findMany({
            where,
            include: includeOptions,
            orderBy: { createdAt: "asc" },
        });

        const exportData = {
            exportInfo: {
                exportedAt: new Date().toISOString(),
                exportedBy: authId,
                totalProjects: projects.length,
                filters: {
                    ownedOnly: ownedOnly === "true",
                    includeTasks: includeTasks === "true",
                },
            },
            projects: projects,
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="projects_export_${new Date().toISOString().split("T")[0]}.json"`,
        );
        res.json(exportData);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

async function getExportInfo(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        const [taskCount, projectCount, categoryCount, tagCount] =
            await Promise.all([
                prisma.task.count({
                    where: {
                        OR: [{ ownerId: user.id }, { assigneeId: user.id }],
                    },
                }),
                prisma.project.count({
                    where: {
                        OR: [
                            { ownerId: user.id },
                            { members: { some: { userId: user.id } } },
                        ],
                    },
                }),
                prisma.category.count({
                    where: { ownerId: user.id },
                }),
                prisma.tag.count({
                    where: { ownerId: user.id },
                }),
            ]);

        res.json({
            success: true,
            data: {
                availableData: {
                    tasks: taskCount,
                    projects: projectCount,
                    categories: categoryCount,
                    tags: tagCount,
                },
                supportedFormats: {
                    tasks: ["CSV", "JSON"],
                    projects: ["CSV", "JSON"],
                    categories: ["CSV", "JSON"],
                    tags: ["CSV", "JSON"],
                },
                exportOptions: {
                    tasks: {
                        filters: [
                            "projectId",
                            "status",
                            "priority",
                            "includeArchived",
                        ],
                        formats: {
                            CSV: "Comma-separated values for spreadsheet import",
                            JSON: "Structured data format with full details",
                        },
                    },
                    projects: {
                        filters: ["ownedOnly", "includeTasks"],
                        formats: {
                            CSV: "Comma-separated values for spreadsheet import",
                            JSON: "Structured data format with full details",
                        },
                    },
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
 * Export user's complete data backup
 */
async function exportUserDataBackup(req, res) {
    try {
        const authId = req.user.id;
        const user = await getOrCreateUser(authId);

        // Get all user data
        const [tasks, projects, categories, tags, notifications] =
            await Promise.all([
                prisma.task.findMany({
                    where: { ownerId: user.id },
                    include: {
                        categories: {
                            include: {
                                category: true,
                            },
                        },
                        tags: {
                            include: {
                                tag: true,
                            },
                        },
                    },
                }),
                prisma.project.findMany({
                    where: { ownerId: user.id },
                    include: {
                        members: {
                            include: {
                                user: { select: { authId: true } },
                            },
                        },
                        tasks: true,
                    },
                }),
                prisma.category.findMany({
                    where: { ownerId: user.id },
                }),
                prisma.tag.findMany({
                    where: { ownerId: user.id },
                }),
                prisma.notification.findMany({
                    where: { userId: user.id },
                    take: 100, // Limit notifications to last 100
                    orderBy: { createdAt: "desc" },
                }),
            ]);

        const backupData = {
            backupInfo: {
                exportedAt: new Date().toISOString(),
                userId: user.id,
                userAuthId: authId,
                version: "1.0",
            },
            userData: {
                tasks,
                projects,
                categories,
                tags,
                notifications,
            },
            statistics: {
                totalTasks: tasks.length,
                totalProjects: projects.length,
                totalCategories: categories.length,
                totalTags: tags.length,
                totalNotifications: notifications.length,
            },
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="user_data_backup_${authId}_${new Date().toISOString().split("T")[0]}.json"`,
        );
        res.json(backupData);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

module.exports = {
    exportTasksToCSV,
    exportTasksToJSON,
    exportProjectsToCSV,
    exportProjectsToJSON,
    getExportInfo,
    exportUserDataBackup,
};
