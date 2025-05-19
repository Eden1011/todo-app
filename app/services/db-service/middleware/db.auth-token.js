const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  try {
    const authResponse = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/local/token/verify`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!authResponse.data.success || !authResponse.data.data.valid) {
      return res.status(403).json({
        valid: false,
        error: "Invalid or expired token",
      });
    }

    const authUserId = authResponse.data.data.user.id;

    let user = await prisma.user.findUnique({
      where: { authId: authUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: authUserId,
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({
      valid: false,
      error: "Invalid or expired token",
    });
  }
}

module.exports = { authenticateToken };
