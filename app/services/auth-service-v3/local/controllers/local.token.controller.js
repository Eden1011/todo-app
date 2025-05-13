const { PrismaClient } = require("@prisma/client");
const { generateAccessToken } = require("../../utils/token.utils.js");
const jwt = require("jsonwebtoken");
const {
  AuthenticationError,
  AuthorizationError,
} = require("../../shared-middleware/error.custom.js");

const prisma = new PrismaClient();


async function refreshToken(refreshToken) {
  return await prisma.$transaction(async (tx) => {
    const storedToken = await tx.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken) {
      throw new AuthenticationError("Invalid refresh token");
    }

    if (!storedToken.user.isVerified) {
      throw new AuthorizationError("Email is not verified");
    }

    if (new Date() > storedToken.expiresAt) {
      await tx.refreshToken.delete({
        where: { id: storedToken.id }
      });
      throw new AuthenticationError("Refresh token expired");
    }

    return new Promise((resolve, reject) => {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          reject(new AuthenticationError("Invalid refresh token"));
        } else {
          const accessToken = generateAccessToken(decoded.id);
          resolve({ accessToken });
        }
      });
    });
  });
}

module.exports = {
  refreshToken
};
