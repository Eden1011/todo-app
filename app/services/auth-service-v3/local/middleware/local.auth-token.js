const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        valid: false,
        error: "Invalid or expired token"
      });
    }

    req.user = { id: decoded.id };
    next();
  });
}

module.exports = {
  authenticateToken
};
