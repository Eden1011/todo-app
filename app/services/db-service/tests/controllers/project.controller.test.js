jest.mock("@prisma/client");

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    project: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    projectMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
    },
    $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockPrismaClient)),
};

require("@prisma/client").PrismaClient.mockImplementation(
    () => mockPrismaClient,
);

const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    updateMemberRole,
    removeMember,
} = require("../../controllers/project/project.controller");

describe("Project Controller", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient.$transaction.mockImplementation(async (callback) =>
            callback(mockPrismaClient),
        );

        req = {
            user: { id: 1 },
            body: {},
            query: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock getOrCreateUser
        mockPrismaClient.user.findUnique.mockResolvedValue({
            id: 1,
            authId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    describe("createProject", () => {
        it("should create project successfully", async () => {
            req.body = {
                name: "Test Project",
                description: "A test project",
            };

            const mockProject = {
                id: 1,
                name: "Test Project",
                description: "A test project",
                ownerId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: { id: 1, authId: 1 },
                members: [
                    {
                        id: 1,
                        projectId: 1,
                        userId: 1,
                        role: "OWNER",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        user: { id: 1, authId: 1 },
                    },
                ],
                _count: { tasks: 0, members: 1 },
            };

            mockPrismaClient.project.create.mockResolvedValue(mockProject);

            await createProject(req, res);

            expect(mockPrismaClient.project.create).toHaveBeenCalledWith({
                data: {
                    name: "Test Project",
                    description: "A test project",
                    ownerId: 1,
                    members: {
                        create: {
                            userId: 1,
                            role: "OWNER",
                        },
                    },
                },
                include: expect.any(Object),
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockProject,
            });
        });

        it("should return 400 if name is missing", async () => {
            req.body = { description: "A test project" };

            await createProject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Project name is required",
            });
        });
    });

    describe("getProjects", () => {
        it("should get projects with default parameters", async () => {
            const mockProjects = [
                {
                    id: 1,
                    name: "Test Project",
                    description: "A test project",
                    ownerId: 1,
                    owner: { id: 1, authId: 1 },
                    members: [],
                    _count: { tasks: 0, members: 1 },
                },
            ];

            mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);
            mockPrismaClient.project.count.mockResolvedValue(1);

            await getProjects(req, res);

            expect(mockPrismaClient.project.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [{ ownerId: 1 }, { members: { some: { userId: 1 } } }],
                },
                skip: 0,
                take: 20,
                orderBy: { updatedAt: "desc" },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    projects: mockProjects,
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 1,
                        totalPages: 1,
                    },
                },
            });
        });

        it("should filter by ownedOnly", async () => {
            req.query = { ownedOnly: "true" };

            mockPrismaClient.project.findMany.mockResolvedValue([]);
            mockPrismaClient.project.count.mockResolvedValue(0);

            await getProjects(req, res);

            expect(mockPrismaClient.project.findMany).toHaveBeenCalledWith({
                where: { ownerId: 1 },
                skip: 0,
                take: 20,
                orderBy: { updatedAt: "desc" },
                include: expect.any(Object),
            });
        });

        it("should apply search filter", async () => {
            req.query = { search: "test" };

            mockPrismaClient.project.findMany.mockResolvedValue([]);
            mockPrismaClient.project.count.mockResolvedValue(0);

            await getProjects(req, res);

            expect(mockPrismaClient.project.findMany).toHaveBeenCalledWith({
                where: {
                    AND: [
                        {
                            OR: [
                                { ownerId: 1 },
                                { members: { some: { userId: 1 } } },
                            ],
                        },
                        {
                            OR: [
                                { name: { contains: "test" } },
                                { description: { contains: "test" } },
                            ],
                        },
                    ],
                },
                skip: 0,
                take: 20,
                orderBy: { updatedAt: "desc" },
                include: expect.any(Object),
            });
        });
    });

    describe("getProjectById", () => {
        it("should return project by id", async () => {
            req.params.id = "1";
            const mockProject = {
                id: 1,
                name: "Test Project",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                members: [],
                tasks: [],
                _count: { tasks: 0, members: 1 },
            };

            mockPrismaClient.project.findFirst.mockResolvedValue(mockProject);

            await getProjectById(req, res);

            expect(mockPrismaClient.project.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    OR: [{ ownerId: 1 }, { members: { some: { userId: 1 } } }],
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockProject,
            });
        });

        it("should return 404 if project not found", async () => {
            req.params.id = "999";
            mockPrismaClient.project.findFirst.mockResolvedValue(null);

            await getProjectById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Project not found or you don't have access to it",
            });
        });
    });

    describe("updateProject", () => {
        it("should update project successfully", async () => {
            req.params.id = "1";
            req.body = {
                name: "Updated Project",
                description: "Updated description",
            };

            const mockMember = {
                projectId: 1,
                userId: 1,
                role: "OWNER",
            };

            const updatedProject = {
                id: 1,
                name: "Updated Project",
                description: "Updated description",
                ownerId: 1,
                owner: { id: 1, authId: 1 },
                members: [],
                _count: { tasks: 0, members: 1 },
            };

            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMember,
            );
            mockPrismaClient.project.update.mockResolvedValue(updatedProject);

            await updateProject(req, res);

            expect(mockPrismaClient.project.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    name: "Updated Project",
                    description: "Updated description",
                },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedProject,
            });
        });

        it("should return 403 if user doesn't have admin access", async () => {
            req.params.id = "1";
            req.body = { name: "Updated Project" };

            mockPrismaClient.projectMember.findFirst.mockResolvedValue(null);

            await updateProject(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "You don't have permission to update this project",
            });
        });
    });

    describe("deleteProject", () => {
        it("should delete project successfully", async () => {
            req.params.id = "1";
            const mockProject = { id: 1, ownerId: 1 };

            mockPrismaClient.project.findFirst.mockResolvedValue(mockProject);
            mockPrismaClient.project.delete.mockResolvedValue(mockProject);

            await deleteProject(req, res);

            expect(mockPrismaClient.project.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "Project deleted successfully" },
            });
        });

        it("should return 404 if user doesn't own project", async () => {
            req.params.id = "1";
            mockPrismaClient.project.findFirst.mockResolvedValue(null);

            await deleteProject(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Project not found or you don't have permission to delete it",
            });
        });
    });

    describe("addMember", () => {
        it("should add member successfully", async () => {
            req.params.id = "1";
            req.body = {
                memberAuthId: 2,
                role: "MEMBER",
            };

            const currentMember = { projectId: 1, userId: 1, role: "OWNER" };
            const newMember = { id: 2, authId: 2 };
            const projectMember = {
                id: 1,
                projectId: 1,
                userId: 2,
                role: "MEMBER",
                user: { id: 2, authId: 2 },
                project: { id: 1, name: "Test Project" },
            };

            mockPrismaClient.projectMember.findFirst
                .mockResolvedValueOnce(currentMember) // Check admin access
                .mockResolvedValueOnce(null); // Check if already member

            mockPrismaClient.user.findUnique.mockResolvedValueOnce({
                id: 1,
                authId: 1,
            }); // Current user
            mockPrismaClient.user.findUnique.mockResolvedValueOnce(null); // New member not found
            mockPrismaClient.user.create.mockResolvedValue(newMember);
            mockPrismaClient.projectMember.create.mockResolvedValue(
                projectMember,
            );

            await addMember(req, res);

            expect(mockPrismaClient.projectMember.create).toHaveBeenCalledWith({
                data: {
                    projectId: 1,
                    userId: 2,
                    role: "MEMBER",
                },
                include: expect.any(Object),
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: projectMember,
            });
        });

        it("should return 403 if user doesn't have admin access", async () => {
            req.params.id = "1";
            req.body = { memberAuthId: 2 };

            mockPrismaClient.projectMember.findFirst.mockResolvedValue(null);

            await addMember(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "You don't have permission to add members to this project",
            });
        });

        it("should return 409 if user is already a member", async () => {
            req.params.id = "1";
            req.body = { memberAuthId: 2 };

            const currentMember = { projectId: 1, userId: 1, role: "OWNER" };
            const existingMember = { projectId: 1, userId: 2, role: "MEMBER" };
            const newMember = { id: 2, authId: 2 };

            mockPrismaClient.projectMember.findFirst
                .mockResolvedValueOnce(currentMember)
                .mockResolvedValueOnce(existingMember);

            mockPrismaClient.user.findUnique.mockResolvedValueOnce({
                id: 1,
                authId: 1,
            });
            mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
            mockPrismaClient.user.create.mockResolvedValue(newMember);

            await addMember(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "User is already a member of this project",
            });
        });
    });

    describe("updateMemberRole", () => {
        it("should update member role successfully", async () => {
            req.params.id = "1";
            req.params.memberId = "2";
            req.body = { role: "ADMIN" };

            const currentMember = { projectId: 1, userId: 1, role: "OWNER" };
            const updatedMember = {
                id: 2,
                projectId: 1,
                userId: 2,
                role: "ADMIN",
                user: { id: 2, authId: 2 },
                project: { id: 1, name: "Test Project" },
            };

            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                currentMember,
            );
            mockPrismaClient.projectMember.update.mockResolvedValue(
                updatedMember,
            );

            await updateMemberRole(req, res);

            expect(mockPrismaClient.projectMember.update).toHaveBeenCalledWith({
                where: { id: 2 },
                data: { role: "ADMIN" },
                include: expect.any(Object),
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedMember,
            });
        });

        it("should return 403 if user is not project owner", async () => {
            req.params.id = "1";
            req.params.memberId = "2";
            req.body = { role: "ADMIN" };

            mockPrismaClient.projectMember.findFirst.mockResolvedValue(null);

            await updateMemberRole(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Only project owner can change member roles",
            });
        });
    });

    describe("removeMember", () => {
        it("should remove member successfully", async () => {
            req.params.id = "1";
            req.params.memberId = "2";

            const memberToRemove = {
                id: 2,
                projectId: 1,
                userId: 2,
                role: "MEMBER",
                user: { id: 2, authId: 2 },
            };

            const currentMember = {
                projectId: 1,
                userId: 1,
                role: "OWNER",
            };

            mockPrismaClient.projectMember.findUnique.mockResolvedValue(
                memberToRemove,
            );
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                currentMember,
            );
            mockPrismaClient.projectMember.delete.mockResolvedValue(
                memberToRemove,
            );

            await removeMember(req, res);

            expect(mockPrismaClient.projectMember.delete).toHaveBeenCalledWith({
                where: { id: 2 },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "Member removed successfully" },
            });
        });

        it("should return 403 if trying to remove project owner", async () => {
            req.params.id = "1";
            req.params.memberId = "2";

            const memberToRemove = {
                id: 2,
                projectId: 1,
                userId: 2,
                role: "OWNER",
                user: { id: 2, authId: 2 },
            };

            const currentMember = {
                projectId: 1,
                userId: 1,
                role: "ADMIN",
            };

            mockPrismaClient.projectMember.findUnique.mockResolvedValue(
                memberToRemove,
            );
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                currentMember,
            );

            await removeMember(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: "Cannot remove project owner",
            });
        });

        it("should allow users to remove themselves", async () => {
            req.params.id = "1";
            req.params.memberId = "2";

            const memberToRemove = {
                id: 2,
                projectId: 1,
                userId: 1, // Same as current user
                role: "MEMBER",
                user: { id: 1, authId: 1 },
            };

            const currentMember = {
                projectId: 1,
                userId: 1,
                role: "MEMBER",
            };

            mockPrismaClient.projectMember.findUnique.mockResolvedValue(
                memberToRemove,
            );
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                currentMember,
            );
            mockPrismaClient.projectMember.delete.mockResolvedValue(
                memberToRemove,
            );

            await removeMember(req, res);

            expect(mockPrismaClient.projectMember.delete).toHaveBeenCalledWith({
                where: { id: 2 },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { message: "Member removed successfully" },
            });
        });
    });
});
