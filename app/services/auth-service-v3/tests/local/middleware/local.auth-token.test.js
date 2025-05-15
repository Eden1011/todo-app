const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../../local/middleware/local.auth-token");

describe("authenticateToken Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    process.env.ACCESS_TOKEN_SECRET = "test-token-secret";
  });

  it("should return 401 if no token is provided", () => {
    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authorization token required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if token is invalid", () => {
    req.headers["authorization"] = "Bearer invalid-token";

    jwt.verify = jest.fn((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      valid: false,
      error: "Invalid or expired token"
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should set req.user and call next if token is valid", () => {
    req.headers["authorization"] = "Bearer valid-token";
    const decodedToken = { id: 123 };

    jwt.verify = jest.fn((token, secret, callback) => {
      callback(null, decodedToken);
    });

    authenticateToken(req, res, next);

    expect(req.user).toEqual({ id: decodedToken.id });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
