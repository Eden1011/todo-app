const { useState, useEffect } = React;

function Projects({ user }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showMemberModal, setShowMemberModal] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        ownedOnly: false,
        sortBy: "updatedAt",
        sortOrder: "desc",
    });

    // Pagination
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
    });

    // Project form
    const [projectForm, setProjectForm] = useState({
        name: "",
        description: "",
    });

    // Member form
    const [memberForm, setMemberForm] = useState({
        memberAuthId: "",
        role: "MEMBER",
    });

    useEffect(() => {
        loadProjects();
    }, [filters, pagination.page]);

    const loadProjects = async () => {
        setLoading(true);
        setError("");

        try {
            const params = {
                ...filters,
                page: pagination.page,
                limit: pagination.limit,
                includeChats: false,
            };

            // Remove empty filters
            Object.keys(params).forEach((key) => {
                if (params[key] === "" || params[key] === false) {
                    delete params[key];
                }
            });

            const response = await API.getProjects(params);
            setProjects(response.data.projects);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            }));
        } catch (error) {
            console.error("Error loading projects:", error);
            setError("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const loadProjectDetails = async (projectId) => {
        try {
            const response = await API.getProjectById(projectId);
            setSelectedProject(response.data);
        } catch (error) {
            console.error("Error loading project details:", error);
            setError("Failed to load project details");
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleProjectFormChange = (key, value) => {
        setProjectForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleMemberFormChange = (key, value) => {
        setMemberForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmitProject = async (e) => {
        e.preventDefault();

        try {
            if (editingProject) {
                await API.updateProject(editingProject.id, projectForm);
            } else {
                await API.createProject(projectForm);
            }

            setShowModal(false);
            setEditingProject(null);
            setProjectForm({ name: "", description: "" });
            loadProjects();
        } catch (error) {
            console.error("Error saving project:", error);
            setError("Failed to save project");
        }
    };

    const handleEditProject = (project) => {
        setEditingProject(project);
        setProjectForm({
            name: project.name,
            description: project.description || "",
        });
        setShowModal(true);
    };

    const handleDeleteProject = async (projectId) => {
        if (
            !confirm(
                "Are you sure you want to delete this project? This will also delete all associated tasks.",
            )
        ) {
            return;
        }

        try {
            await API.deleteProject(projectId);
            loadProjects();
            if (selectedProject && selectedProject.id === projectId) {
                setSelectedProject(null);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
            setError("Failed to delete project");
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();

        try {
            await API.addProjectMember(selectedProject.id, memberForm);
            setShowMemberModal(false);
            setMemberForm({ memberAuthId: "", role: "MEMBER" });
            loadProjectDetails(selectedProject.id);
        } catch (error) {
            console.error("Error adding member:", error);
            setError("Failed to add member");
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!confirm("Are you sure you want to remove this member?")) {
            return;
        }

        try {
            await API.removeProjectMember(selectedProject.id, memberId);
            loadProjectDetails(selectedProject.id);
        } catch (error) {
            console.error("Error removing member:", error);
            setError("Failed to remove member");
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            OWNER: "#dc3545",
            ADMIN: "#fd7e14",
            MEMBER: "#007bff",
            VIEWER: "#6c757d",
        };
        return colors[role] || "#6c757d";
    };

    const formatDate = (dateString) => {
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
                <h1>Projects</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingProject(null);
                        setProjectForm({ name: "", description: "" });
                        setShowModal(true);
                    }}
                >
                    Create Project
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            {/* Filters */}
            <div className="filters">
                <div className="filter-group">
                    <label>Search</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) =>
                            handleFilterChange("search", e.target.value)
                        }
                        placeholder="Search projects..."
                    />
                </div>

                <div className="filter-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.ownedOnly}
                            onChange={(e) =>
                                handleFilterChange(
                                    "ownedOnly",
                                    e.target.checked,
                                )
                            }
                        />
                        Owned by me only
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
                        <option value="name">Name</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Order</label>
                    <select
                        value={filters.sortOrder}
                        onChange={(e) =>
                            handleFilterChange("sortOrder", e.target.value)
                        }
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: selectedProject ? "1fr 1fr" : "1fr",
                    gap: "2rem",
                }}
            >
                {/* Projects List */}
                <div>
                    {loading ? (
                        <div className="loading">Loading projects...</div>
                    ) : (
                        <div>
                            {projects.length === 0 ? (
                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "3rem",
                                        color: "#666",
                                    }}
                                >
                                    <h3>No projects found</h3>
                                    <p>
                                        Create your first project to get
                                        started!
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div
                                        style={{ display: "grid", gap: "1rem" }}
                                    >
                                        {projects.map((project) => (
                                            <div
                                                key={project.id}
                                                className="card"
                                                style={{
                                                    cursor: "pointer",
                                                    border:
                                                        selectedProject &&
                                                        selectedProject.id ===
                                                            project.id
                                                            ? "2px solid #667eea"
                                                            : "1px solid #eee",
                                                }}
                                                onClick={() =>
                                                    loadProjectDetails(
                                                        project.id,
                                                    )
                                                }
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems:
                                                            "flex-start",
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <h3
                                                            style={{
                                                                margin: "0 0 0.5rem 0",
                                                                color: "#333",
                                                            }}
                                                        >
                                                            {project.name}
                                                        </h3>
                                                        {project.description && (
                                                            <p
                                                                style={{
                                                                    color: "#666",
                                                                    margin: "0 0 1rem 0",
                                                                }}
                                                            >
                                                                {
                                                                    project.description
                                                                }
                                                            </p>
                                                        )}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "1rem",
                                                                fontSize:
                                                                    "0.875rem",
                                                                color: "#666",
                                                                marginBottom:
                                                                    "1rem",
                                                            }}
                                                        >
                                                            <span>
                                                                {
                                                                    project
                                                                        ._count
                                                                        .tasks
                                                                }{" "}
                                                                tasks
                                                            </span>
                                                            <span>
                                                                {
                                                                    project
                                                                        ._count
                                                                        .members
                                                                }{" "}
                                                                members
                                                            </span>
                                                            <span>
                                                                Updated{" "}
                                                                {formatDate(
                                                                    project.updatedAt,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "1rem",
                                                                flexWrap:
                                                                    "wrap",
                                                            }}
                                                        >
                                                            {project.members
                                                                .slice(0, 3)
                                                                .map(
                                                                    (
                                                                        member,
                                                                    ) => (
                                                                        <span
                                                                            key={
                                                                                member.id
                                                                            }
                                                                            style={{
                                                                                backgroundColor:
                                                                                    getRoleColor(
                                                                                        member.role,
                                                                                    ),
                                                                                color: "white",
                                                                                padding:
                                                                                    "0.25rem 0.5rem",
                                                                                borderRadius:
                                                                                    "4px",
                                                                                fontSize:
                                                                                    "0.75rem",
                                                                            }}
                                                                        >
                                                                            User
                                                                            #
                                                                            {
                                                                                member
                                                                                    .user
                                                                                    .authId
                                                                            }{" "}
                                                                            (
                                                                            {
                                                                                member.role
                                                                            }
                                                                            )
                                                                        </span>
                                                                    ),
                                                                )}
                                                            {project.members
                                                                .length > 3 && (
                                                                <span
                                                                    style={{
                                                                        color: "#666",
                                                                        fontSize:
                                                                            "0.75rem",
                                                                    }}
                                                                >
                                                                    +
                                                                    {project
                                                                        .members
                                                                        .length -
                                                                        3}{" "}
                                                                    more
                                                                </span>
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
                                                        {project.owner
                                                            .authId ===
                                                            user.id && (
                                                            <>
                                                                <button
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        padding:
                                                                            "0.25rem 0.5rem",
                                                                    }}
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        handleEditProject(
                                                                            project,
                                                                        );
                                                                    }}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn btn-danger"
                                                                    style={{
                                                                        padding:
                                                                            "0.25rem 0.5rem",
                                                                    }}
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteProject(
                                                                            project.id,
                                                                        );
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

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
                </div>

                {/* Project Details */}
                {selectedProject && (
                    <div>
                        <div className="card">
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "1rem",
                                }}
                            >
                                <h3>{selectedProject.name}</h3>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedProject(null)}
                                >
                                    Close
                                </button>
                            </div>

                            {selectedProject.description && (
                                <p
                                    style={{
                                        color: "#666",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    {selectedProject.description}
                                </p>
                            )}

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "1rem",
                                    marginBottom: "2rem",
                                }}
                            >
                                <div>
                                    <strong>Owner:</strong> User #
                                    {selectedProject.owner.authId}
                                </div>
                                <div>
                                    <strong>Created:</strong>{" "}
                                    {formatDate(selectedProject.createdAt)}
                                </div>
                                <div>
                                    <strong>Tasks:</strong>{" "}
                                    {selectedProject._count.tasks}
                                </div>
                                <div>
                                    <strong>Members:</strong>{" "}
                                    {selectedProject._count.members}
                                </div>
                            </div>

                            {/* Project Members */}
                            <div style={{ marginBottom: "2rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <h4>Project Members</h4>
                                    {(selectedProject.owner.authId ===
                                        user.id ||
                                        selectedProject.members.some(
                                            (m) =>
                                                m.user.authId === user.id &&
                                                m.role === "ADMIN",
                                        )) && (
                                        <button
                                            className="btn btn-primary"
                                            style={{
                                                padding: "0.25rem 0.5rem",
                                                fontSize: "0.875rem",
                                            }}
                                            onClick={() =>
                                                setShowMemberModal(true)
                                            }
                                        >
                                            Add Member
                                        </button>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5rem",
                                    }}
                                >
                                    {selectedProject.members.map((member) => (
                                        <div
                                            key={member.id}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "0.75rem",
                                                border: "1px solid #eee",
                                                borderRadius: "4px",
                                            }}
                                        >
                                            <div>
                                                <span
                                                    style={{
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    User #{member.user.authId}
                                                </span>
                                                <span
                                                    style={{
                                                        backgroundColor:
                                                            getRoleColor(
                                                                member.role,
                                                            ),
                                                        color: "white",
                                                        padding:
                                                            "0.25rem 0.5rem",
                                                        borderRadius: "4px",
                                                        fontSize: "0.75rem",
                                                        marginLeft: "0.5rem",
                                                    }}
                                                >
                                                    {member.role}
                                                </span>
                                            </div>

                                            {member.role !== "OWNER" &&
                                                (selectedProject.owner
                                                    .authId === user.id ||
                                                    (selectedProject.members.some(
                                                        (m) =>
                                                            m.user.authId ===
                                                                user.id &&
                                                            m.role === "ADMIN",
                                                    ) &&
                                                        member.role !==
                                                            "ADMIN")) && (
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{
                                                            padding:
                                                                "0.25rem 0.5rem",
                                                            fontSize: "0.75rem",
                                                        }}
                                                        onClick={() =>
                                                            handleRemoveMember(
                                                                member.id,
                                                            )
                                                        }
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Tasks */}
                            {selectedProject.tasks &&
                                selectedProject.tasks.length > 0 && (
                                    <div>
                                        <h4 style={{ marginBottom: "1rem" }}>
                                            Recent Tasks
                                        </h4>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "0.5rem",
                                            }}
                                        >
                                            {selectedProject.tasks
                                                .slice(0, 5)
                                                .map((task) => (
                                                    <div
                                                        key={task.id}
                                                        style={{
                                                            padding: "0.75rem",
                                                            border: "1px solid #eee",
                                                            borderRadius: "4px",
                                                            backgroundColor:
                                                                "#f8f9fa",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontWeight:
                                                                    "500",
                                                                marginBottom:
                                                                    "0.25rem",
                                                            }}
                                                        >
                                                            {task.title}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "0.875rem",
                                                                color: "#666",
                                                                display: "flex",
                                                                gap: "1rem",
                                                            }}
                                                        >
                                                            <span>
                                                                {task.status}
                                                            </span>
                                                            <span>
                                                                {task.priority}
                                                            </span>
                                                            <span>
                                                                Owner: User #
                                                                {
                                                                    task.owner
                                                                        .authId
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </div>

            {/* Project Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {editingProject
                                    ? "Edit Project"
                                    : "Create Project"}
                            </h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmitProject}>
                            <div className="form-group">
                                <label>Project Name *</label>
                                <input
                                    type="text"
                                    value={projectForm.name}
                                    onChange={(e) =>
                                        handleProjectFormChange(
                                            "name",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={projectForm.description}
                                    onChange={(e) =>
                                        handleProjectFormChange(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    style={{
                                        width: "100%",
                                        minHeight: "100px",
                                        padding: "0.75rem",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                    }}
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
                                    {editingProject
                                        ? "Update Project"
                                        : "Create Project"}
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

            {/* Add Member Modal */}
            {showMemberModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add Project Member</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowMemberModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleAddMember}>
                            <div className="form-group">
                                <label>User Auth ID *</label>
                                <input
                                    type="number"
                                    value={memberForm.memberAuthId}
                                    onChange={(e) =>
                                        handleMemberFormChange(
                                            "memberAuthId",
                                            parseInt(e.target.value),
                                        )
                                    }
                                    placeholder="Enter user's auth ID"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={memberForm.role}
                                    onChange={(e) =>
                                        handleMemberFormChange(
                                            "role",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="MEMBER">Member</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="VIEWER">Viewer</option>
                                </select>
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
                                    Add Member
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowMemberModal(false)}
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
