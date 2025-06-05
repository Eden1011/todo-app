const { useState, useEffect } = React;

function Dashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [recentTasks, setRecentTasks] = useState([]);
    const [dueTasks, setDueTasks] = useState([]);
    const [recentProjects, setRecentProjects] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        setError("");

        try {
            // Load all dashboard data in parallel
            const [
                profileResponse,
                activityResponse,
                statusStatsResponse,
                priorityStatsResponse,
                dueSoonResponse,
                overdueResponse,
                projectsResponse,
                notificationsResponse,
            ] = await Promise.all([
                API.getUserProfile(),
                API.getUserActivity(),
                API.getStatusStatistics(),
                API.getPriorityStatistics(),
                API.getTasksDueSoon(),
                API.getTasksOverdue(),
                API.getProjects({ limit: 5 }),
                API.getNotifications({ limit: 5, unreadOnly: true }),
            ]);

            setStats({
                profile: profileResponse.data,
                statusStats: statusStatsResponse.data,
                priorityStats: priorityStatsResponse.data,
            });

            setRecentTasks(activityResponse.data.recentTasks || []);
            setDueTasks([
                ...(dueSoonResponse.data.categorized.today || []),
                ...(dueSoonResponse.data.categorized.tomorrow || []),
                ...(overdueResponse.data.tasks || []),
            ]);
            setRecentProjects(projectsResponse.data.projects || []);
            setNotifications(notificationsResponse.data.notifications || []);
        } catch (error) {
            console.error("Error loading dashboard:", error);
            setError("Failed to load dashboard data. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkNotificationRead = async (notificationId) => {
        try {
            await API.markNotificationAsRead(notificationId);
            setNotifications((prev) =>
                prev.filter((notif) => notif.id !== notificationId),
            );
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            TODO: "#6c757d",
            IN_PROGRESS: "#007bff",
            REVIEW: "#fd7e14",
            DONE: "#28a745",
            CANCELED: "#dc3545",
        };
        return colors[status] || "#6c757d";
    };

    const getPriorityColor = (priority) => {
        const colors = {
            LOW: "#28a745",
            MEDIUM: "#ffc107",
            HIGH: "#fd7e14",
            URGENT: "#dc3545",
        };
        return colors[priority] || "#6c757d";
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No due date";
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Overdue by ${Math.abs(diffDays)} days`;
        } else if (diffDays === 0) {
            return "Due today";
        } else if (diffDays === 1) {
            return "Due tomorrow";
        } else {
            return `Due in ${diffDays} days`;
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="content">
            <h1>Dashboard</h1>

            {/* Stats Overview */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">
                            {stats.profile.statistics.ownedTasks}
                        </div>
                        <div className="stat-label">Owned Tasks</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {stats.profile.statistics.assignedTasks}
                        </div>
                        <div className="stat-label">Assigned Tasks</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {stats.profile.statistics.projects}
                        </div>
                        <div className="stat-label">Projects</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {stats.statusStats.completion.completionRate}%
                        </div>
                        <div className="stat-label">Completion Rate</div>
                    </div>
                </div>
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2rem",
                    marginBottom: "2rem",
                }}
            >
                {/* Task Status Distribution */}
                {stats && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                Task Status Distribution
                            </h3>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                            }}
                        >
                            {Object.entries(stats.statusStats.byStatus).map(
                                ([status, count]) => (
                                    <div
                                        key={status}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "12px",
                                                    height: "12px",
                                                    backgroundColor:
                                                        getStatusColor(status),
                                                    borderRadius: "2px",
                                                }}
                                            ></div>
                                            {status.replace("_", " ")}
                                        </span>
                                        <span style={{ fontWeight: "bold" }}>
                                            {count}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

                {/* Priority Distribution */}
                {stats && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                Priority Distribution
                            </h3>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                            }}
                        >
                            {Object.entries(stats.priorityStats.byPriority).map(
                                ([priority, count]) => (
                                    <div
                                        key={priority}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "12px",
                                                    height: "12px",
                                                    backgroundColor:
                                                        getPriorityColor(
                                                            priority,
                                                        ),
                                                    borderRadius: "2px",
                                                }}
                                            ></div>
                                            {priority}
                                        </span>
                                        <span style={{ fontWeight: "bold" }}>
                                            {count}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2rem",
                }}
            >
                {/* Tasks Due Soon */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Tasks Due Soon</h3>
                    </div>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {dueTasks.length === 0 ? (
                            <p
                                style={{
                                    color: "#666",
                                    textAlign: "center",
                                    padding: "2rem",
                                }}
                            >
                                No urgent tasks
                            </p>
                        ) : (
                            dueTasks.slice(0, 5).map((task) => (
                                <div
                                    key={task.id}
                                    className={`task-item priority-${task.priority.toLowerCase()}`}
                                >
                                    <div className="task-content">
                                        <div className="task-title">
                                            {task.title}
                                        </div>
                                        <div className="task-meta">
                                            <span
                                                style={{
                                                    color: getPriorityColor(
                                                        task.priority,
                                                    ),
                                                }}
                                            >
                                                {task.priority}
                                            </span>
                                            <span
                                                style={{
                                                    color:
                                                        task.dueDate &&
                                                        new Date(task.dueDate) <
                                                            new Date()
                                                            ? "#dc3545"
                                                            : "#666",
                                                }}
                                            >
                                                {formatDate(task.dueDate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Projects */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Projects</h3>
                    </div>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {recentProjects.length === 0 ? (
                            <p
                                style={{
                                    color: "#666",
                                    textAlign: "center",
                                    padding: "2rem",
                                }}
                            >
                                No projects yet
                            </p>
                        ) : (
                            recentProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className="card"
                                    style={{
                                        marginBottom: "0.5rem",
                                        padding: "1rem",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: "bold" }}>
                                                {project.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                }}
                                            >
                                                {project._count.tasks} tasks •{" "}
                                                {project._count.members} members
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.875rem",
                                                color: "#666",
                                            }}
                                        >
                                            {new Date(
                                                project.updatedAt,
                                            ).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="card" style={{ marginTop: "2rem" }}>
                    <div className="card-header">
                        <h3 className="card-title">Recent Notifications</h3>
                    </div>
                    <div>
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.75rem",
                                    border: "1px solid #eee",
                                    borderRadius: "4px",
                                    marginBottom: "0.5rem",
                                    backgroundColor: "#f8f9fa",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: "500" }}>
                                        {notification.content}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.875rem",
                                            color: "#666",
                                        }}
                                    >
                                        {new Date(
                                            notification.createdAt,
                                        ).toLocaleString()}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        padding: "0.25rem 0.5rem",
                                        fontSize: "0.875rem",
                                    }}
                                    onClick={() =>
                                        handleMarkNotificationRead(
                                            notification.id,
                                        )
                                    }
                                >
                                    Mark Read
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="card" style={{ marginTop: "2rem" }}>
                <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <button className="btn btn-primary">Create New Task</button>
                    <button className="btn btn-secondary">
                        Create New Project
                    </button>
                    <button className="btn btn-success">View All Tasks</button>
                    <button className="btn btn-secondary">Export Data</button>
                </div>
            </div>
        </div>
    );
}
