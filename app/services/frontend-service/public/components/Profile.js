const { useState, useEffect } = React;

function Profile({ user }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (activeTab === "overview") {
            loadProfileData();
        }
    }, [activeTab]);

    const loadProfileData = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await API.getUserProfile();
            setProfile(response.data);
        } catch (error) {
            console.error("Error loading profile:", error);
            setError("Failed to load profile data");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading && activeTab === "overview") {
        return <div className="loading">Loading profile...</div>;
    }

    return (
        <div className="content">
            <h1>Profile</h1>

            {error && <div className="error">{error}</div>}

            {}
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "2rem",
                    borderBottom: "1px solid #eee",
                }}
            >
                {[
                    { key: "overview", label: "Overview" },

                    { key: "settings", label: "Settings" },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        className={`auth-tab ${activeTab === tab.key ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && profile && (
                <div>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Profile Information</h3>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "2rem",
                            }}
                        >
                            <div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <strong>User ID:</strong> {profile.user.id}
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <strong>Auth ID:</strong>{" "}
                                    {profile.user.authId}
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <strong>Member Since:</strong>{" "}
                                    {formatDate(profile.user.createdAt)}
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <strong>Last Updated:</strong>{" "}
                                    {formatDate(profile.user.updatedAt)}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: "1rem" }}>
                                    Statistics
                                </h4>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <div>
                                        Owned Tasks:{" "}
                                        <strong>
                                            {profile.statistics.ownedTasks}
                                        </strong>
                                    </div>
                                    <div>
                                        Assigned Tasks:{" "}
                                        <strong>
                                            {profile.statistics.assignedTasks}
                                        </strong>
                                    </div>
                                    <div>
                                        Projects:{" "}
                                        <strong>
                                            {profile.statistics.projects}
                                        </strong>
                                    </div>
                                    {}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: "2rem" }}>
                        <div className="card-header">
                            <h3 className="card-title">
                                Task Status Breakdown
                            </h3>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(150px, 1fr))",
                                gap: "1rem",
                            }}
                        >
                            {Object.entries(
                                profile.statistics.tasksByStatus,
                            ).map(([status, count]) => (
                                <div key={status} className="stat-card">
                                    <div className="stat-number">{count}</div>
                                    <div className="stat-label">
                                        {status.replace("_", " ")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
                <div>
                    <h3>Account Settings</h3>
                    <div className="card">
                        <div className="card-header">
                            <h4 className="card-title">Account Actions</h4>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                            }}
                        >
                            <p>
                                Ustawienia konta pojawią się tutaj w
                                przyszłości.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
