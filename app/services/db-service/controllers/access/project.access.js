const { PrismaClient } = require("@prisma/client");

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

module.exports = { checkProjectWriteAccess };
