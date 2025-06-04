"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api";
import { Project, ProjectFilters, CreateProjectData } from "@/types";
import { formatDate, truncateText } from "@/lib/utils";
import {
    Plus,
    Search,
    Users,
    CheckSquare,
    Calendar,
    Edit2,
    Trash2,
    Eye,
    MessageSquare,
    MoreHorizontal,
    Folder,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    const [filters, setFilters] = useState<ProjectFilters>({
        page: 1,
        limit: 20,
        sortBy: "updatedAt",
        sortOrder: "desc",
    });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [projectForm, setProjectForm] = useState<CreateProjectData>({
        name: "",
        description: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadProjects();
    }, [filters]);

    const loadProjects = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.getProjects({
                ...filters,
                includeChats: true,
            });
            setProjects(response.projects);
            setPagination(response.pagination);
        } catch (error) {
            console.error("Failed to load projects:", error);
            toast.error("Failed to load projects");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const search = e.target.value;
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await apiClient.createProject(projectForm);
            toast.success("Project created successfully!");
            setShowCreateModal(false);
            resetForm();
            loadProjects();
        } catch (error: any) {
            console.error("Failed to create project:", error);
            toast.error(error.message || "Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProject || !validateForm()) return;

        setIsSubmitting(true);
        try {
            await apiClient.updateProject(selectedProject.id, projectForm);
            toast.success("Project updated successfully!");
            setShowEditModal(false);
            resetForm();
            loadProjects();
        } catch (error: any) {
            console.error("Failed to update project:", error);
            toast.error(error.message || "Failed to update project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProject) return;

        setIsSubmitting(true);
        try {
            await apiClient.deleteProject(selectedProject.id);
            toast.success("Project deleted successfully!");
            setShowDeleteModal(false);
            setSelectedProject(null);
            loadProjects();
        } catch (error: any) {
            console.error("Failed to delete project:", error);
            toast.error(error.message || "Failed to delete project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!projectForm.name.trim()) {
            errors.name = "Project name is required";
        } else if (projectForm.name.length > 200) {
            errors.name = "Name must be less than 200 characters";
        }

        if (projectForm.description && projectForm.description.length > 1000) {
            errors.description =
                "Description must be less than 1000 characters";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetForm = () => {
        setProjectForm({ name: "", description: "" });
        setFormErrors({});
        setSelectedProject(null);
    };

    const openEditModal = (project: Project) => {
        setSelectedProject(project);
        setProjectForm({
            name: project.name,
            description: project.description || "",
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (project: Project) => {
        setSelectedProject(project);
        setShowDeleteModal(true);
    };

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Projects
                        </h1>
                        <p className="text-gray-600">
                            Manage your projects and team collaboration
                        </p>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </div>

                {/* Search */}
                <div className="card">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search projects..."
                            value={filters.search || ""}
                            onChange={handleSearch}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Projects Grid */}
                <div>
                    {isLoading ? (
                        <Loading text="Loading projects..." />
                    ) : projects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onEdit={() => openEditModal(project)}
                                    onDelete={() => openDeleteModal(project)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="card text-center py-12">
                            <Folder className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No projects found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {filters.search
                                    ? "Try adjusting your search terms."
                                    : "Get started by creating your first project."}
                            </p>
                            {!filters.search && (
                                <div className="mt-6">
                                    <Button
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Project
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-gray-700">
                                Showing{" "}
                                {(pagination.page - 1) * pagination.limit + 1}{" "}
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
                                        setFilters((prev) => ({
                                            ...prev,
                                            page: pagination.page - 1,
                                        }))
                                    }
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        pagination.page >= pagination.totalPages
                                    }
                                    onClick={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            page: pagination.page + 1,
                                        }))
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Create Project Modal */}
                <Modal
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                    title="Create New Project"
                >
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <Input
                            label="Project Name"
                            value={projectForm.name}
                            onChange={(e) =>
                                setProjectForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            error={formErrors.name}
                            placeholder="Enter project name"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={projectForm.description}
                                onChange={(e) =>
                                    setProjectForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                className="input min-h-[100px] resize-y"
                                placeholder="Enter project description (optional)"
                            />
                            {formErrors.description && (
                                <p className="text-sm text-red-600 mt-1">
                                    {formErrors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                Create Project
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Edit Project Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        resetForm();
                    }}
                    title="Edit Project"
                >
                    <form onSubmit={handleEditProject} className="space-y-4">
                        <Input
                            label="Project Name"
                            value={projectForm.name}
                            onChange={(e) =>
                                setProjectForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            error={formErrors.name}
                            placeholder="Enter project name"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={projectForm.description}
                                onChange={(e) =>
                                    setProjectForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                className="input min-h-[100px] resize-y"
                                placeholder="Enter project description (optional)"
                            />
                            {formErrors.description && (
                                <p className="text-sm text-red-600 mt-1">
                                    {formErrors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                Update Project
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Project"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to delete "
                            {selectedProject?.name}"? This action cannot be
                            undone and will remove all associated tasks and
                            data.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDeleteProject}
                                isLoading={isSubmitting}
                            >
                                Delete Project
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
}

// Project Card Component
interface ProjectCardProps {
    project: Project;
    onEdit: () => void;
    onDelete: () => void;
}

function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {project.name}
                </h3>
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
                                    href={`/projects/${project.id}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                </Link>
                                <Link
                                    href={`/projects/${project.id}/chat`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Open Chat
                                </Link>
                                <button
                                    onClick={() => {
                                        onEdit();
                                        setShowActions(false);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={() => {
                                        onDelete();
                                        setShowActions(false);
                                    }}
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

            {project.description && (
                <p className="text-gray-600 text-sm mb-4">
                    {truncateText(project.description, 100)}
                </p>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                        <CheckSquare className="w-4 h-4 mr-1" />
                        {project._count.tasks} tasks
                    </div>
                    <div className="flex items-center text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {project._count.members} members
                    </div>
                </div>

                {project.chatCount !== undefined && (
                    <div className="flex items-center text-sm text-gray-500">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {project.chatCount} chat
                        {project.chatCount !== 1 ? "s" : ""}
                    </div>
                )}

                <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Updated {formatDate(project.updatedAt)}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                    <Link href={`/projects/${project.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                        </Button>
                    </Link>
                    <Link
                        href={`/projects/${project.id}/chat`}
                        className="flex-1"
                    >
                        <Button size="sm" className="w-full">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
