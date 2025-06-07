const { useState, useEffect } = React;

function App() {
    const [currentView, setCurrentView] = useState("tasks");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        const token = AuthUtils.getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const userData = await API.verifyToken();
            setUser(userData);
        } catch (error) {
            console.error("Auth check failed:", error);
            AuthUtils.removeToken();
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (userData, token) => {
        AuthUtils.setToken(token);
        setUser(userData);
        setCurrentView("tasks");
    };

    const handleLogout = () => {
        AuthUtils.removeToken();
        setUser(null);
        setCurrentView("auth");
    };

    if (loading) {
        return (
            <div className="app">
                <div className="loading">
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="app">
                <Auth onLogin={handleLogin} />
            </div>
        );
    }

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <div className="logo">Todo App</div>
                    <nav className="nav">
                        {}
                        <button
                            className={currentView === "tasks" ? "active" : ""}
                            onClick={() => setCurrentView("tasks")}
                        >
                            Tasks
                        </button>
                        <button
                            className={
                                currentView === "projects" ? "active" : ""
                            }
                            onClick={() => setCurrentView("projects")}
                        >
                            Projects
                        </button>
                        <button
                            className={currentView === "chat" ? "active" : ""}
                            onClick={() => setCurrentView("chat")}
                        >
                            Chat
                        </button>
                        <button
                            className={
                                currentView === "profile" ? "active" : ""
                            }
                            onClick={() => setCurrentView("profile")}
                        >
                            Profile
                        </button>
                    </nav>
                    <div className="user-info">
                        <span>Welcome, User #{user.id}</span>
                        <button
                            className="btn btn-secondary"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="main">
                {}
                {currentView === "tasks" && <Tasks user={user} />}
                {currentView === "projects" && <Projects user={user} />}
                {currentView === "chat" && <Chat user={user} />}
                {currentView === "profile" && <Profile user={user} />}
            </main>
        </div>
    );
}
