const bcrypt = require("bcrypt")
const crypto = require("crypto")
const { PrismaClient } = require("@prisma/client")
const { generateAccessToken, generateRefreshToken } = require("../../utils/token.utils.js");
const {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} = require("../../shared-middleware/error.custom.js");

const prisma = new PrismaClient();

async function register(username, email, password) {
  return await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      throw new ConflictError("Username or email already exists");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await tx.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isVerified: false
      }
    });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + convertTimeToMilliseconds(process.env.EMAIL_EXPIRATION || "1d"));

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt
      }
    });

    setImmediate(async () => {
      try {
        await sendVerificationEmail(email, verificationToken, username);
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message: "Registration successful. Please check your email for verification instructions."
    };
  });
}


async function login(username, email, password) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        OR: [
          { username: username || "" },
          { email: email || "" }
        ]
      }
    });

    if (!user || !(bcrypt.compare(password, user.password))) {
      throw new AuthenticationError("Invalid credentials");
    }

    if (!user.isVerified) {
      throw new AuthorizationError("Please verify your email before logging in");
    }

    await tx.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const expirationMs = convertTimeToMilliseconds(process.env.REFRESH_TOKEN_EXPIRATION || "7d");
    const expiresAt = new Date(Date.now() + expirationMs);

    await tx.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return { accessToken, refreshToken };
  });
}

async function logout(refreshToken) {
  return await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  });
}

async function changePassword(refreshToken, username, email, oldPassword, newPassword) {
  return await prisma.$transaction(async (tx) => {
    const tokenData = await tx.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!tokenData) {
      throw new AuthenticationError("Invalid refresh token");
    }

    if (new Date() > tokenData.expiresAt) {
      await tx.refreshToken.delete({
        where: { id: tokenData.id }
      });
      throw new AuthenticationError("Refresh token expired");
    }

    const user = await tx.user.findFirst({
      where: {
        OR: [
          { username: username || "" },
          { email: email || "" }
        ]
      }
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.id !== tokenData.userId) {
      throw new AuthorizationError("Token does not match user");
    }

    if (!(bcrypt.compare(oldPassword, user.password))) {
      throw new AuthenticationError("Invalid old password");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await tx.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    await tx.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    return { message: "Password changed successfully" };
  });
}

async function removeUser(refreshToken, username, email, password) {
  return await prisma.$transaction(async (tx) => {
    const tokenData = await tx.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!tokenData) {
      throw new AuthenticationError("Invalid refresh token");
    }

    if (new Date() > tokenData.expiresAt) {
      await tx.refreshToken.delete({
        where: { id: tokenData.id }
      });
      throw new AuthenticationError("Refresh token expired");
    }

    const user = await tx.user.findFirst({
      where: {
        OR: [
          { username: username || "" },
          { email: email || "" }
        ]
      }
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.id !== tokenData.userId) {
      throw new AuthorizationError("Token does not match user");
    }

    if (!(bcrypt.compare(password, user.password))) {
      throw new AuthenticationError("Invalid password");
    }

    await tx.user.delete({
      where: { id: user.id }
    });

    return { message: "User account deleted successfully" };
  });
}

async function registerWithAutoLogin(username, email, password) {
  const result = await register(username, email, password);

  if (!process.env.AUTO_LOGIN_AFTER_REGISTER) {
    return result;
  }

  return await prisma.$transaction(async (tx) => {
    const accessToken = generateAccessToken(result.user.id);
    const refreshToken = generateRefreshToken(result.user.id);

    const expirationMs = convertTimeToMilliseconds(process.env.REFRESH_TOKEN_EXPIRATION || "7d");
    const expiresAt = new Date(Date.now() + expirationMs);

    await tx.refreshToken.create({
      data: {
        token: refreshToken,
        userId: result.user.id,
        expiresAt
      }
    });

    return {
      ...result,
      accessToken,
      refreshToken,
      autoLogin: true
    };
  });
}

module.exports = {
  register,
  login,
  registerWithAutoLogin,
  changePassword,
  logout,
  removeUser
}
