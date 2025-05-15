const { PrismaClient } = require("@prisma/client");
const convertTimeToMilliseconds = require("../../utils/time.utils.js");
const { sendVerificationEmail } = require("../../utils/email.utils.js");
const crypto = require("crypto");
const {
  ValidationError,
  NotFoundError,
} = require("../../shared-middleware/error.custom.js");

const prisma = new PrismaClient();


async function verifyEmail(token) {
  return await prisma.$transaction(async (tx) => {
    const verification = await tx.emailVerification.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verification) {
      throw new ValidationError("Invalid verification token");
    }

    if (new Date() > verification.expiresAt) {
      await tx.emailVerification.delete({
        where: { id: verification.id }
      });
      throw new ValidationError("Verification token has expired");
    }

    await tx.user.update({
      where: { id: verification.userId },
      data: { isVerified: true }
    });

    await tx.emailVerification.delete({
      where: { id: verification.id }
    });

    return { message: "Email verified successfully" };
  });
}


async function resendVerificationEmail(email) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email },
      include: { EmailVerification: true }
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.isVerified) {
      throw new ValidationError("Email is already verified");
    }

    if (user.EmailVerification) {
      await tx.emailVerification.delete({
        where: { id: user.EmailVerification.id }
      });
    }

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
        await sendVerificationEmail(user.email, verificationToken, user.username);
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    });

    return { message: "Verification email sent" };
  });
}


module.exports = {
  verifyEmail,
  resendVerificationEmail
};
