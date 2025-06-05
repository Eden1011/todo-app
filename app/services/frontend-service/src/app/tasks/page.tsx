"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api";
import {
    Task,
    TaskFilters,
    Category,
    Tag,
    Project,
    CreateTaskData,
    TaskPriority,
    TaskStatus,
} from "@/types";
import {
    formatDate,
    getPriorityColor,
    getStatusColor,
    truncateText,
} from "@/lib/utils";
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Calendar,
    User,
    Folder,
    MoreHorizontal,
    Eye,
    CheckSquare,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    const [filters, setFilters] = useState<TaskFilters>({
        page: 1,
        limit: 20,
        sortBy: "updatedAt",
        sortOrder: "desc",
    });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadTasks();
        loadResources();
    }, [filters]);

    const loadTasks = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.getTasks(filters);
            setTasks(response.tasks);
            setPagination(response.pagination);
        } catch (error) {
            console.error("Failed to load tasks:", error);
            toast.error("Failed to load tasks");
        } finally {
            setIsLoading(false);
        }
    };

    const loadResources = async () => {
        try {
            const [categoriesData, tagsData, projectsData] = await Promise.all([
                apiClient.getCategories(),
                apiClient.getTags(),
                apiClient.getProjects({ limit: 100 }),
            ]);
            setCategories(categoriesData);
            setTags(tagsData);
            setProjects(projectsData.projects);
        } catch (error) {
            console.error("Failed to load resources:", error);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const search = e.target.value;
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    const handleFilterChange = (key: keyof TaskFilters, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handleDeleteTask = async () => {
        if (!selectedTask) return;

        try {
            await apiClient.deleteTask(selectedTask.id);
            toast.success("Task deleted successfully");
            setShowDeleteModal(false);
            setSelectedTask(null);
            loadTasks();
        } catch (error) {
            console.error("Failed to delete task:", error);
            toast.error("Failed to delete task");
        }
    };

    const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
        try {
            await apiClient.updateTask(task.id, { status: newStatus });
            toast.success("Task status updated");
            loadTasks();
        } catch (error) {
            console.error("Failed to update task status:", error);
            toast.error("Failed to update task status");
        }
    };

    const clearFilters = () => {
        setFilters({
            page: 1,
            limit: 20,
            sortBy: "updatedAt",
            sortOrder: "desc",
        });
    };

    const hasActiveFilters = Boolean(
        filters.search ||
            filters.status ||
            filters.priority ||
            filters.projectId ||
            filters.categoryId ||
            filters.tagId ||
            filters.assignedToMe ||
            filters.dueDateFrom ||
            filters.dueDateTo,
    );

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Tasks
                        </h1>
                        <p className="text-gray-600">
                            Manage and track your tasks
                        </p>
                    </div>
                    <Link href="/tasks/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Task
                        </Button>
                    </Link>
                </div>

                {/* Search and Filters */}
                <div className="card">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search tasks..."
                                    value={filters.search || ""}
                                    onChange={handleSearch}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                className={
                                    hasActiveFilters
                                        ? "border-primary-500 text-primary-700"
                                        : ""
                                }
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                                {hasActiveFilters && (
                                    <Badge
                                        variant="primary"
                                        className="ml-2 text-xs"
                                    >
                                        Active
                                    </Badge>
                                )}
                            </Button>
                            {hasActiveFilters && (
                                <Button variant="ghost" onClick={clearFilters}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={filters.status || ""}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "status",
                                                e.target.value || undefined,
                                            )
                                        }
                                        className="input"
                                    >
                                        <option value="">All Statuses</option>
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        value={filters.priority || ""}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "priority",
                                                e.target.value || undefined,
                                            )
                                        }
                                        className="input"
                                    >
                                        <option value="">All Priorities</option>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Project
                                    </label>
                                    <select
                                        value={filters.projectId || ""}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "projectId",
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined,
                                            )
                                        }
                                        className="input"
                                    >
                                        <option value="">All Projects</option>
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={filters.categoryId || ""}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "categoryId",
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined,
                                            )
                                        }
                                        className="input"
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={filters.assignedToMe || false}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "assignedToMe",
                                                e.target.checked || undefined,
                                            )
                                        }
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Assigned to me
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tasks List */}
                <div className="card">
                    {isLoading ? (
                        <Loading text="Loading tasks..." />
                    ) : tasks.length > 0 ? (
                        <div className="space-y-4">
                            {tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={() => {
                                        setSelectedTask(task);
                                        setShowEditModal(true);
                                    }}
                                    onDelete={() => {
                                        setSelectedTask(task);
                                        setShowDeleteModal(true);
                                    }}
                                    onStatusChange={handleStatusChange}
                                />
                            ))}

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="text-sm text-gray-700">
                                        Showing{" "}
                                        {(pagination.page - 1) *
                                            pagination.limit +
                                            1}{" "}
                                        to{" "}
                                        {Math.min(
                                            pagination.page * pagination.limit,
                                            pagination.total,
                                        )}{" "}
                                        of {pagination.total} results
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page <= 1}
                                            onClick={() =>
                                                handleFilterChange(
                                                    "page",
                                                    pagination.page - 1,
                                                )
                                            }
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                pagination.page >=
                                                pagination.totalPages
                                            }
                                            onClick={() =>
                                                handleFilterChange(
                                                    "page",
                                                    pagination.page + 1,
                                                )
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No tasks found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {hasActiveFilters
                                    ? "Try adjusting your filters or search terms."
                                    : "Get started by creating a new task."}
                            </p>
                            {!hasActiveFilters && (
                                <div className="mt-6">
                                    <Link href="/tasks/new">
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            New Task
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Task"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to delete "
                            {selectedTask?.title}"? This action cannot be
                            undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDeleteTask}>
                                Delete Task
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
}

// Task Card Component
interface TaskCardProps {
    task: Task;
    onEdit: () => void;
    onDelete: () => void;
    onStatusChange: (task: Task, status: TaskStatus) => void;
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                        </h3>
                        <Badge className={getStatusColor(task.status)}>
                            {task.status.replace("_", " ")}
                        </Badge>
                        <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                        </Badge>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 mb-2">
                            {truncateText(task.description, 100)}
                        </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {task.dueDate && (
                            <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(task.dueDate)}
                            </div>
                        )}
                        {task.assignee && (
                            <div className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                Assigned
                            </div>
                        )}
                        {task.project && (
                            <div className="flex items-center">
                                <Folder className="w-3 h-3 mr-1" />
                                {task.project.name}
                            </div>
                        )}
                        <div>Updated {formatDate(task.updatedAt)}</div>
                    </div>
                </div>

                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowActions(!showActions)}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>

                    {showActions && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                                <Link
                                    href={`/tasks/${task.id}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                </Link>
                                <button
                                    onClick={onEdit}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                </button>

                                {/* Status Change Options */}
                                <div className="border-t border-gray-100 my-1"></div>
                                <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Change Status
                                </div>
                                {(
                                    [
                                        "TODO",
                                        "IN_PROGRESS",
                                        "REVIEW",
                                        "DONE",
                                        "CANCELED",
                                    ] as TaskStatus[]
                                )
                                    .filter((status) => status !== task.status)
                                    .map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                onStatusChange(task, status);
                                                setShowActions(false);
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <Badge
                                                className={`${getStatusColor(status)} mr-2`}
                                            >
                                                {status.replace("_", " ")}
                                            </Badge>
                                        </button>
                                    ))}

                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={onDelete}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
