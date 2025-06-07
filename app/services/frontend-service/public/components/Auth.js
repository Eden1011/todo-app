const { useState, useEffect } = React;

function Auth({ onLogin }) {
    const [activeTab, setActiveTab] = useState("login");
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        checkOAuthCallback();
    }, []);

    const checkOAuthCallback = () => {
        if (window.location.hash) {
            const urlParams = new URLSearchParams(
                window.location.hash.substring(1),
            );
            const accessToken = urlParams.get("access_token");
            const refreshToken = urlParams.get("refresh_token");

            if (accessToken && refreshToken) {
                AuthUtils.setToken(accessToken);
                localStorage.setItem("refresh_token", refreshToken);

                window.history.replaceState(null, null, " ");

                verifyTokenAndLogin();
            }
        }
    };

    const verifyTokenAndLogin = async () => {
        try {
            const userData = await API.verifyToken();
            onLogin(userData, AuthUtils.getToken());
        } catch (error) {
            setErrors({ general: "OAuth login failed. Please try again." });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (activeTab === "register") {
            if (!formData.username || formData.username.length < 3) {
                newErrors.username = "Username must be at least 3 characters";
            }
            if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = "Please enter a valid email";
            }
            if (!formData.password || formData.password.length < 8) {
                newErrors.password = "Password must be at least 8 characters";
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        } else {
            if (!formData.email && !formData.username) {
                newErrors.identifier = "Please enter email or username";
            }
            if (!formData.password) {
                newErrors.password = "Password is required";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors({});
        setMessage("");

        try {
            if (activeTab === "register") {
                const response = await API.register({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                });

                if (response.success) {
                    if (
                        response.data.accessToken &&
                        response.data.refreshToken
                    ) {
                        AuthUtils.setToken(response.data.accessToken);
                        localStorage.setItem(
                            "refresh_token",
                            response.data.refreshToken,
                        );
                        onLogin(response.data.user, response.data.accessToken);
                    } else {
                        setMessage(
                            "Registration successful! Please check your email for verification.",
                        );
                        setActiveTab("login");
                    }
                }
            } else {
                const loginData = {
                    password: formData.password,
                };

                if (formData.email && formData.email.includes("@")) {
                    loginData.email = formData.email;
                } else {
                    loginData.username = formData.username || formData.email;
                }

                const response = await API.login(loginData);

                if (response.success) {
                    AuthUtils.setToken(response.data.accessToken);
                    localStorage.setItem(
                        "refresh_token",
                        response.data.refreshToken,
                    );

                    const userData = await API.verifyToken();
                    onLogin(userData, response.data.accessToken);
                }
            }
        } catch (error) {
            console.error("Auth error:", error);
            setErrors({
                general:
                    error.message || "An error occurred. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = "http://localhost:3000/oauth/google";
    };

    return (
        <div className="auth-container">
            <div className="auth-tabs">
                <button
                    className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
                    onClick={() => setActiveTab("login")}
                >
                    Login
                </button>
                <button
                    className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
                    onClick={() => setActiveTab("register")}
                >
                    Register
                </button>
            </div>

            {errors.general && <div className="error">{errors.general}</div>}

            {message && <div className="success">{message}</div>}

            <form onSubmit={handleSubmit}>
                {activeTab === "register" && (
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Enter username (3-20 characters)"
                        />
                        {errors.username && (
                            <div className="error">{errors.username}</div>
                        )}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">
                        {activeTab === "register"
                            ? "Email"
                            : "Email or Username"}
                    </label>
                    <input
                        type={activeTab === "register" ? "email" : "text"}
                        id="email"
                        name={activeTab === "register" ? "email" : "email"}
                        value={
                            activeTab === "register"
                                ? formData.email
                                : formData.email || formData.username
                        }
                        onChange={(e) => {
                            if (activeTab === "register") {
                                handleInputChange(e);
                            } else {
                                setFormData((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                    username: e.target.value,
                                }));
                            }
                        }}
                        placeholder={
                            activeTab === "register"
                                ? "Enter your email"
                                : "Enter email or username"
                        }
                    />
                    {errors.email && (
                        <div className="error">{errors.email}</div>
                    )}
                    {errors.identifier && (
                        <div className="error">{errors.identifier}</div>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={
                            activeTab === "register"
                                ? "Min 8 chars, include uppercase, lowercase, number, special char"
                                : "Enter your password"
                        }
                    />
                    {errors.password && (
                        <div className="error">{errors.password}</div>
                    )}
                </div>

                {activeTab === "register" && (
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Confirm your password"
                        />
                        {errors.confirmPassword && (
                            <div className="error">
                                {errors.confirmPassword}
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    disabled={loading}
                >
                    {loading
                        ? "Processing..."
                        : activeTab === "register"
                          ? "Register"
                          : "Login"}
                </button>
            </form>

            <button
                type="button"
                className="btn btn-google"
                onClick={handleGoogleLogin}
            >
                <span>🔍</span>
                {activeTab === "register"
                    ? "Sign up with Google"
                    : "Sign in with Google"}
            </button>

            {activeTab === "login" && (
                <p
                    style={{
                        textAlign: "center",
                        marginTop: "1rem",
                        fontSize: "0.9rem",
                        color: "#666",
                    }}
                >
                    Don't have an account?{" "}
                    <button
                        type="button"
                        style={{
                            background: "none",
                            border: "none",
                            color: "#667eea",
                            cursor: "pointer",
                        }}
                        onClick={() => setActiveTab("register")}
                    >
                        Register here
                    </button>
                </p>
            )}
        </div>
    );
}
