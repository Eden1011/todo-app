const { useState, useEffect } = React;

function Tasks({ user }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [projects, setProjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        status: "",
        priority: "",
        projectId: "",
        assignedToMe: false,
        sortBy: "updatedAt",
        sortOrder: "desc",
    });

    // Pagination
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Task form
    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: "",
        projectId: "",
        categoryIds: [],
        tagIds: [],
    });

    useEffect(() => {
        loadTasks();
        loadProjects();
        loadCategories();
        loadTags();
    }, [filters, pagination.page]);

    const loadTasks = async () => {
        setLoading(true);
        setError("");

        try {
            const params = {
                ...filters,
                page: pagination.page,
                limit: pagination.limit,
            };

            Object.keys(params).forEach((key) => {
                if (params[key] === "" || params[key] === false) {
                    delete params[key];
                }
            });
            delete params.search;

            const response = await API.getTasks(params);
            setTasks(response.data.tasks);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error("Error loading tasks:", error);
            setError("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await API.getProjects();
            setProjects(response.data.projects);
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await API.getCategories();
            setCategories(response.data.categories);
        } catch (error) {
            console.error("Error loading categories:", error);
        }
    };

    const loadTags = async () => {
        try {
            const response = await API.getTags();
            setTags(response.data.tags);
        } catch (error) {
            console.error("Error loading tags:", error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleTaskFormChange = (key, value) => {
        setTaskForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmitTask = async (e) => {
        e.preventDefault();

        try {
            const taskData = {
                ...taskForm,
                dueDate: taskForm.dueDate || null,
            };

            if (editingTask) {
                await API.updateTask(editingTask.id, taskData);
            } else {
                await API.createTask(taskData);
            }

            setShowModal(false);
            setEditingTask(null);
            setTaskForm({
                title: "",
                description: "",
                priority: "MEDIUM",
                status: "TODO",
                dueDate: "",
                projectId: "",
                categoryIds: [],
                tagIds: [],
            });

            loadTasks();
        } catch (error) {
            console.error("Error saving task:", error);
            setError("Failed to save task");
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
            projectId: task.projectId || "",
            categoryIds: task.categories?.map((c) => c.category.id) || [],
            tagIds: task.tags?.map((t) => t.tag.id) || [],
        });
        setShowModal(true);
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm("Are you sure you want to delete this task?")) {
            return;
        }

        try {
            await API.deleteTask(taskId);
            loadTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
            setError("Failed to delete task");
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await API.updateTaskStatus(taskId, newStatus);
            loadTasks();
        } catch (error) {
            console.error("Error updating task status:", error);
            setError("Failed to update task status");
        }
    };

    const handlePriorityChange = async (taskId, newPriority) => {
        try {
            await API.updateTaskPriority(taskId, newPriority);
            loadTasks();
        } catch (error) {
            console.error("Error updating task priority:", error);
            setError("Failed to update task priority");
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
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="content">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2rem",
                }}
            >
                <h1>Tasks</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingTask(null);
                        setTaskForm({
                            title: "",
                            description: "",
                            priority: "MEDIUM",
                            status: "TODO",
                            dueDate: "",
                            projectId: "",
                            categoryIds: [],
                            tagIds: [],
                        });
                        setShowModal(true);
                    }}
                >
                    Create Task
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="filters">
                <div className="filter-group">
                    <label>Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) =>
                            handleFilterChange("status", e.target.value)
                        }
                    >
                        <option value="">All Statuses</option>
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="DONE">Done</option>
                        <option value="CANCELED">Canceled</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Priority</label>
                    <select
                        value={filters.priority}
                        onChange={(e) =>
                            handleFilterChange("priority", e.target.value)
                        }
                    >
                        <option value="">All Priorities</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Project</label>
                    <select
                        value={filters.projectId}
                        onChange={(e) =>
                            handleFilterChange("projectId", e.target.value)
                        }
                    >
                        <option value="">All Projects</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.assignedToMe}
                            onChange={(e) =>
                                handleFilterChange(
                                    "assignedToMe",
                                    e.target.checked,
                                )
                            }
                        />
                        Assigned to me
                    </label>
                </div>

                <div className="filter-group">
                    <label>Sort by</label>
                    <select
                        value={filters.sortBy}
                        onChange={(e) =>
                            handleFilterChange("sortBy", e.target.value)
                        }
                    >
                        <option value="updatedAt">Last Updated</option>
                        <option value="createdAt">Created Date</option>
                        <option value="dueDate">Due Date</option>
                        <option value="priority">Priority</option>
                        <option value="title">Title</option>
                    </select>
                </div>
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="loading">Loading tasks...</div>
            ) : (
                <div>
                    {tasks.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "#666",
                            }}
                        >
                            <h3>No tasks found</h3>
                            <p>Create your first task to get started!</p>
                        </div>
                    ) : (
                        <>
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`task-item priority-${task.priority.toLowerCase()}`}
                                >
                                    <div className="task-content">
                                        <div className="task-title">
                                            {task.title}
                                        </div>
                                        {task.description && (
                                            <div
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                {task.description}
                                            </div>
                                        )}
                                        <div className="task-meta">
                                            <span
                                                style={{
                                                    backgroundColor:
                                                        getStatusColor(
                                                            task.status,
                                                        ),
                                                    color: "white",
                                                    padding: "0.25rem 0.5rem",
                                                    borderRadius: "4px",
                                                    fontSize: "0.75rem",
                                                }}
                                            >
                                                {task.status.replace("_", " ")}
                                            </span>
                                            <span
                                                style={{
                                                    backgroundColor:
                                                        getPriorityColor(
                                                            task.priority,
                                                        ),
                                                    color: "white",
                                                    padding: "0.25rem 0.5rem",
                                                    borderRadius: "4px",
                                                    fontSize: "0.75rem",
                                                }}
                                            >
                                                {task.priority}
                                            </span>
                                            <span>
                                                {formatDate(task.dueDate)}
                                            </span>
                                            {task.project && (
                                                <span>
                                                    Project: {task.project.name}
                                                </span>
                                            )}
                                            <span>
                                                Owner: User #{task.owner.authId}
                                            </span>
                                            {task.assignee && (
                                                <span>
                                                    Assigned: User #
                                                    {task.assignee.authId}
                                                </span>
                                            )}
                                        </div>
                                        {(task.categories?.length > 0 ||
                                            task.tags?.length > 0) && (
                                            <div
                                                style={{
                                                    marginTop: "0.5rem",
                                                    display: "flex",
                                                    gap: "0.5rem",
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                {task.categories?.map((cat) => (
                                                    <span
                                                        key={cat.category.id}
                                                        style={{
                                                            backgroundColor:
                                                                cat.category
                                                                    .color ||
                                                                "#e9ecef",
                                                            color: "white",
                                                            padding:
                                                                "0.125rem 0.375rem",
                                                            borderRadius: "4px",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        {cat.category.name}
                                                    </span>
                                                ))}
                                                {task.tags?.map((tag) => (
                                                    <span
                                                        key={tag.tag.id}
                                                        style={{
                                                            backgroundColor:
                                                                tag.tag.color ||
                                                                "#6c757d",
                                                            color: "white",
                                                            padding:
                                                                "0.125rem 0.375rem",
                                                            borderRadius: "4px",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        #{tag.tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="task-actions">
                                        <select
                                            value={task.status}
                                            onChange={(e) =>
                                                handleStatusChange(
                                                    task.id,
                                                    e.target.value,
                                                )
                                            }
                                            style={{
                                                marginRight: "0.5rem",
                                                padding: "0.25rem",
                                            }}
                                        >
                                            <option value="TODO">Todo</option>
                                            <option value="IN_PROGRESS">
                                                In Progress
                                            </option>
                                            <option value="REVIEW">
                                                Review
                                            </option>
                                            <option value="DONE">Done</option>
                                            <option value="CANCELED">
                                                Canceled
                                            </option>
                                        </select>

                                        <select
                                            value={task.priority}
                                            onChange={(e) =>
                                                handlePriorityChange(
                                                    task.id,
                                                    e.target.value,
                                                )
                                            }
                                            style={{
                                                marginRight: "0.5rem",
                                                padding: "0.25rem",
                                            }}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">
                                                Medium
                                            </option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">
                                                Urgent
                                            </option>
                                        </select>

                                        <button
                                            className="btn btn-secondary"
                                            style={{
                                                marginRight: "0.5rem",
                                                padding: "0.25rem 0.5rem",
                                            }}
                                            onClick={() => handleEditTask(task)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="btn btn-danger"
                                            style={{
                                                padding: "0.25rem 0.5rem",
                                            }}
                                            onClick={() =>
                                                handleDeleteTask(task.id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
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
                                        disabled={pagination.page === 1}
                                        onClick={() =>
                                            setPagination((prev) => ({
                                                ...prev,
                                                page: prev.page - 1,
                                            }))
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
                                        Page {pagination.page} of{" "}
                                        {pagination.totalPages}
                                    </span>

                                    <button
                                        className="btn btn-secondary"
                                        disabled={
                                            pagination.page ===
                                            pagination.totalPages
                                        }
                                        onClick={() =>
                                            setPagination((prev) => ({
                                                ...prev,
                                                page: prev.page + 1,
                                            }))
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

            {/* Task Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editingTask ? "Edit Task" : "Create Task"}</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmitTask}>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={taskForm.title}
                                    onChange={(e) =>
                                        handleTaskFormChange(
                                            "title",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={taskForm.description}
                                    onChange={(e) =>
                                        handleTaskFormChange(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    style={{
                                        width: "100%",
                                        minHeight: "80px",
                                        padding: "0.75rem",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "1rem",
                                }}
                            >
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        value={taskForm.priority}
                                        onChange={(e) =>
                                            handleTaskFormChange(
                                                "priority",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={taskForm.status}
                                        onChange={(e) =>
                                            handleTaskFormChange(
                                                "status",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="TODO">Todo</option>
                                        <option value="IN_PROGRESS">
                                            In Progress
                                        </option>
                                        <option value="REVIEW">Review</option>
                                        <option value="DONE">Done</option>
                                        <option value="CANCELED">
                                            Canceled
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "1rem",
                                }}
                            >
                                <div className="form-group">
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        value={taskForm.dueDate}
                                        onChange={(e) =>
                                            handleTaskFormChange(
                                                "dueDate",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Project</label>
                                    <select
                                        value={taskForm.projectId}
                                        onChange={(e) =>
                                            handleTaskFormChange(
                                                "projectId",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">No Project</option>
                                        {projects.map((project) => (
                                            <option
                                                key={project.id}
                                                value={project.id}
                                            >
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                    {editingTask
                                        ? "Update Task"
                                        : "Create Task"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
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
