const jwt = require("jsonwebtoken");

function generateAccessToken(userId) {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRATION || "15m";
  return jwt.sign(
    { id: userId, jwtId: crypto.randomUUID() },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn }
  );
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { id: userId, jwtId: crypto.randomUUID() },
    process.env.REFRESH_TOKEN_SECRET
  );
}

module.exports = {
  generateAccessToken,
  generateRefreshToken
};
