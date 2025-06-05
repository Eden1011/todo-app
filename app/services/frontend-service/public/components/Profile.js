const { useState, useEffect } = React;

function Profile({ user }) {
    const [profile, setProfile] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    // Forms
    const [categoryForm, setCategoryForm] = useState({
        name: "",
        color: "#667eea",
    });
    const [tagForm, setTagForm] = useState({ name: "", color: "#667eea" });
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);

    // Pagination for notifications
    const [notificationPage, setNotificationPage] = useState(1);
    const [notificationPagination, setNotificationPagination] = useState({});

    useEffect(() => {
        loadProfileData();
    }, []);

    useEffect(() => {
        if (activeTab === "notifications") {
            loadNotifications();
        } else if (activeTab === "categories") {
            loadCategories();
        } else if (activeTab === "tags") {
            loadTags();
        }
    }, [activeTab, notificationPage]);

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

    const loadNotifications = async () => {
        try {
            const response = await API.getNotifications({
                page: notificationPage,
                limit: 10,
                sortBy: "createdAt",
                sortOrder: "desc",
            });
            setNotifications(response.data.notifications);
            setNotificationPagination(response.data.pagination);
        } catch (error) {
            console.error("Error loading notifications:", error);
            setError("Failed to load notifications");
        }
    };

    const loadCategories = async () => {
        try {
            const response = await API.getCategories();
            setCategories(response.data.categories);
        } catch (error) {
            console.error("Error loading categories:", error);
            setError("Failed to load categories");
        }
    };

    const loadTags = async () => {
        try {
            const response = await API.getTags();
            setTags(response.data.tags);
        } catch (error) {
            console.error("Error loading tags:", error);
            setError("Failed to load tags");
        }
    };

    const handleMarkNotificationRead = async (notificationId) => {
        try {
            await API.markNotificationAsRead(notificationId);
            loadNotifications();
        } catch (error) {
            console.error("Error marking notification as read:", error);
            setError("Failed to mark notification as read");
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        try {
            await API.markAllNotificationsAsRead();
            loadNotifications();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            setError("Failed to mark all notifications as read");
        }
    };

    const handleDeleteNotification = async (notificationId) => {
        if (!confirm("Are you sure you want to delete this notification?")) {
            return;
        }

        try {
            await API.deleteNotification(notificationId);
            loadNotifications();
        } catch (error) {
            console.error("Error deleting notification:", error);
            setError("Failed to delete notification");
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            await API.createCategory(categoryForm);
            setCategoryForm({ name: "", color: "#667eea" });
            setShowCategoryModal(false);
            loadCategories();
        } catch (error) {
            console.error("Error creating category:", error);
            setError("Failed to create category");
        }
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        try {
            await API.createTag(tagForm);
            setTagForm({ name: "", color: "#667eea" });
            setShowTagModal(false);
            loadTags();
        } catch (error) {
            console.error("Error creating tag:", error);
            setError("Failed to create tag");
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (
            !confirm(
                "Are you sure you want to delete this category? This action cannot be undone.",
            )
        ) {
            return;
        }

        try {
            await API.deleteCategory(categoryId);
            loadCategories();
        } catch (error) {
            console.error("Error deleting category:", error);
            setError("Failed to delete category");
        }
    };

    const handleDeleteTag = async (tagId) => {
        if (
            !confirm(
                "Are you sure you want to delete this tag? This action cannot be undone.",
            )
        ) {
            return;
        }

        try {
            await API.deleteTag(tagId);
            loadTags();
        } catch (error) {
            console.error("Error deleting tag:", error);
            setError("Failed to delete tag");
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getNotificationTypeColor = (type) => {
        const colors = {
            DUE_DATE_REMINDER: "#ffc107",
            TASK_ASSIGNED: "#007bff",
            TASK_STATUS_CHANGED: "#28a745",
            COMMENT_ADDED: "#17a2b8",
            PROJECT_INVITE: "#6f42c1",
        };
        return colors[type] || "#6c757d";
    };

    if (loading) {
        return <div className="loading">Loading profile...</div>;
    }

    return (
        <div className="content">
            <h1>Profile</h1>

            {error && <div className="error">{error}</div>}

            {/* Profile Tabs */}
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
                    { key: "notifications", label: "Notifications" },
                    { key: "categories", label: "Categories" },
                    { key: "tags", label: "Tags" },
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
                                    <div>
                                        Categories:{" "}
                                        <strong>
                                            {profile.statistics.categories}
                                        </strong>
                                    </div>
                                    <div>
                                        Tags:{" "}
                                        <strong>
                                            {profile.statistics.tags}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Task Status Breakdown */}
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

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "2rem",
                        }}
                    >
                        <h3>Notifications</h3>
                        <button
                            className="btn btn-primary"
                            onClick={handleMarkAllNotificationsRead}
                        >
                            Mark All as Read
                        </button>
                    </div>

                    {notifications.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "#666",
                            }}
                        >
                            <h3>No notifications</h3>
                            <p>You're all caught up!</p>
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "1rem",
                                }}
                            >
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className="card"
                                        style={{
                                            backgroundColor: notification.isRead
                                                ? "#f8f9fa"
                                                : "#fff",
                                            border: notification.isRead
                                                ? "1px solid #eee"
                                                : "1px solid #667eea",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem",
                                                        marginBottom: "0.5rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            backgroundColor:
                                                                getNotificationTypeColor(
                                                                    notification.type,
                                                                ),
                                                            color: "white",
                                                            padding:
                                                                "0.25rem 0.5rem",
                                                            borderRadius: "4px",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        {notification.type.replace(
                                                            "_",
                                                            " ",
                                                        )}
                                                    </span>
                                                    {!notification.isRead && (
                                                        <span
                                                            style={{
                                                                backgroundColor:
                                                                    "#dc3545",
                                                                color: "white",
                                                                padding:
                                                                    "0.25rem 0.5rem",
                                                                borderRadius:
                                                                    "4px",
                                                                fontSize:
                                                                    "0.75rem",
                                                            }}
                                                        >
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    style={{
                                                        marginBottom: "0.5rem",
                                                    }}
                                                >
                                                    {notification.content}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "0.875rem",
                                                        color: "#666",
                                                    }}
                                                >
                                                    {formatDate(
                                                        notification.createdAt,
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "0.5rem",
                                                    marginLeft: "1rem",
                                                }}
                                            >
                                                {!notification.isRead && (
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{
                                                            padding:
                                                                "0.25rem 0.5rem",
                                                            fontSize:
                                                                "0.875rem",
                                                        }}
                                                        onClick={() =>
                                                            handleMarkNotificationRead(
                                                                notification.id,
                                                            )
                                                        }
                                                    >
                                                        Mark Read
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-danger"
                                                    style={{
                                                        padding:
                                                            "0.25rem 0.5rem",
                                                        fontSize: "0.875rem",
                                                    }}
                                                    onClick={() =>
                                                        handleDeleteNotification(
                                                            notification.id,
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {notificationPagination.totalPages > 1 && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                        marginTop: "2rem",
                                    }}
                                >
                                    <button
                                        className="btn btn-secondary"
                                        disabled={notificationPage === 1}
                                        onClick={() =>
                                            setNotificationPage(
                                                (prev) => prev - 1,
                                            )
                                        }
                                    >
                                        Previous
                                    </button>
                                    <span
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "0 1rem",
                                        }}
                                    >
                                        Page {notificationPage} of{" "}
                                        {notificationPagination.totalPages}
                                    </span>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={
                                            notificationPage ===
                                            notificationPagination.totalPages
                                        }
                                        onClick={() =>
                                            setNotificationPage(
                                                (prev) => prev + 1,
                                            )
                                        }
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "2rem",
                        }}
                    >
                        <h3>Categories</h3>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCategoryModal(true)}
                        >
                            Create Category
                        </button>
                    </div>

                    {categories.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "#666",
                            }}
                        >
                            <h3>No categories</h3>
                            <p>
                                Create your first category to organize your
                                tasks!
                            </p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(250px, 1fr))",
                                gap: "1rem",
                            }}
                        >
                            {categories.map((category) => (
                                <div key={category.id} className="card">
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "12px",
                                                        height: "12px",
                                                        backgroundColor:
                                                            category.color,
                                                        borderRadius: "2px",
                                                    }}
                                                ></div>
                                                <h4 style={{ margin: 0 }}>
                                                    {category.name}
                                                </h4>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                }}
                                            >
                                                {category._count.tasks} tasks
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                }}
                                            >
                                                Created{" "}
                                                {new Date(
                                                    category.createdAt,
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-danger"
                                            style={{
                                                padding: "0.25rem 0.5rem",
                                                fontSize: "0.875rem",
                                            }}
                                            onClick={() =>
                                                handleDeleteCategory(
                                                    category.id,
                                                )
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tags Tab */}
            {activeTab === "tags" && (
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "2rem",
                        }}
                    >
                        <h3>Tags</h3>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowTagModal(true)}
                        >
                            Create Tag
                        </button>
                    </div>

                    {tags.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "#666",
                            }}
                        >
                            <h3>No tags</h3>
                            <p>Create your first tag to label your tasks!</p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(250px, 1fr))",
                                gap: "1rem",
                            }}
                        >
                            {tags.map((tag) => (
                                <div key={tag.id} className="card">
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "12px",
                                                        height: "12px",
                                                        backgroundColor:
                                                            tag.color,
                                                        borderRadius: "2px",
                                                    }}
                                                ></div>
                                                <h4 style={{ margin: 0 }}>
                                                    #{tag.name}
                                                </h4>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                }}
                                            >
                                                {tag._count.tasks} tasks
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                }}
                                            >
                                                Created{" "}
                                                {new Date(
                                                    tag.createdAt,
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-danger"
                                            style={{
                                                padding: "0.25rem 0.5rem",
                                                fontSize: "0.875rem",
                                            }}
                                            onClick={() =>
                                                handleDeleteTag(tag.id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                            <div>
                                <h5>Export Data</h5>
                                <p
                                    style={{
                                        color: "#666",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    Download all your data in various formats
                                </p>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "1rem",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <a
                                        href="http://localhost:4000/api/export/tasks/csv"
                                        className="btn btn-secondary"
                                    >
                                        Export Tasks (CSV)
                                    </a>
                                    <a
                                        href="http://localhost:4000/api/export/tasks/json"
                                        className="btn btn-secondary"
                                    >
                                        Export Tasks (JSON)
                                    </a>
                                    <a
                                        href="http://localhost:4000/api/export/projects/csv"
                                        className="btn btn-secondary"
                                    >
                                        Export Projects (CSV)
                                    </a>
                                    <a
                                        href="http://localhost:4000/api/export/backup"
                                        className="btn btn-success"
                                    >
                                        Full Backup (JSON)
                                    </a>
                                </div>
                            </div>

                            <hr />

                            <div>
                                <h5 style={{ color: "#dc3545" }}>
                                    Danger Zone
                                </h5>
                                <p
                                    style={{
                                        color: "#666",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    These actions cannot be undone
                                </p>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                "Are you sure you want to delete your account? This action cannot be undone and will delete all your data.",
                                            )
                                        ) {
                                            // Handle account deletion
                                            console.log(
                                                "Account deletion requested",
                                            );
                                        }
                                    }}
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create Category</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCategoryModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateCategory}>
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) =>
                                        setCategoryForm((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Color</label>
                                <input
                                    type="color"
                                    value={categoryForm.color}
                                    onChange={(e) =>
                                        setCategoryForm((prev) => ({
                                            ...prev,
                                            color: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "1rem",
                                    marginTop: "2rem",
                                }}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Create Category
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCategoryModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tag Modal */}
            {showTagModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create Tag</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowTagModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateTag}>
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={tagForm.name}
                                    onChange={(e) =>
                                        setTagForm((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Color</label>
                                <input
                                    type="color"
                                    value={tagForm.color}
                                    onChange={(e) =>
                                        setTagForm((prev) => ({
                                            ...prev,
                                            color: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "1rem",
                                    marginTop: "2rem",
                                }}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Create Tag
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowTagModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
