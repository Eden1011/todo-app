"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { apiClient } from "@/lib/api";
import {
    CreateTaskData,
    Category,
    Tag,
    Project,
    TaskPriority,
    TaskStatus,
} from "@/types";
import {
    ArrowLeft,
    Calendar,
    User,
    Folder,
    Tag as TagIcon,
    Hash,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewTaskPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<CreateTaskData>({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: "",
        assigneeAuthId: undefined,
        projectId: undefined,
        categoryIds: [],
        tagIds: [],
    });

    useEffect(() => {
        loadResources();
    }, []);

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
            toast.error("Failed to load form data");
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleMultiSelect = (
        name: "categoryIds" | "tagIds",
        value: number,
    ) => {
        setFormData((prev) => {
            const currentValues = prev[name] || [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter((id) => id !== value)
                : [...currentValues, value];
            return { ...prev, [name]: newValues };
        });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = "Task title is required";
        } else if (formData.title.length > 200) {
            newErrors.title = "Title must be less than 200 characters";
        }

        if (formData.description && formData.description.length > 1000) {
            newErrors.description =
                "Description must be less than 1000 characters";
        }

        if (formData.dueDate) {
            const dueDate = new Date(formData.dueDate);
            if (dueDate < new Date()) {
                newErrors.dueDate = "Due date cannot be in the past";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const taskData: CreateTaskData = {
                ...formData,
                assigneeAuthId: formData.assigneeAuthId || undefined,
                projectId: formData.projectId || undefined,
                dueDate: formData.dueDate || undefined,
                categoryIds: formData.categoryIds?.length
                    ? formData.categoryIds
                    : undefined,
                tagIds: formData.tagIds?.length ? formData.tagIds : undefined,
            };

            await apiClient.createTask(taskData);
            toast.success("Task created successfully!");
            router.push("/tasks");
        } catch (error: any) {
            console.error("Failed to create task:", error);
            toast.error(error.message || "Failed to create task");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-6">
                    <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="mr-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Tasks
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Create New Task
                        </h1>
                        <p className="text-gray-600">
                            Add a new task to your workflow
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Basic Information
                        </h2>
                        <div className="space-y-4">
                            <Input
                                label="Task Title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                error={errors.title}
                                placeholder="Enter task title"
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="input min-h-[100px] resize-y"
                                    placeholder="Enter task description (optional)"
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600 mt-1">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="TODO">Todo</option>
                                        <option value="IN_PROGRESS">
                                            In Progress
                                        </option>
                                        <option value="REVIEW">Review</option>
                                        <option value="DONE">Done</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assignment and Project */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Assignment & Project
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Due Date
                                </label>
                                <Input
                                    name="dueDate"
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={handleChange}
                                    error={errors.dueDate}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Folder className="w-4 h-4 inline mr-1" />
                                    Project
                                </label>
                                <select
                                    name="projectId"
                                    value={formData.projectId || ""}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            projectId: e.target.value
                                                ? parseInt(e.target.value)
                                                : undefined,
                                        }))
                                    }
                                    className="input"
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

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <User className="w-4 h-4 inline mr-1" />
                                Assign to User ID (Optional)
                            </label>
                            <Input
                                name="assigneeAuthId"
                                type="number"
                                value={formData.assigneeAuthId || ""}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        assigneeAuthId: e.target.value
                                            ? parseInt(e.target.value)
                                            : undefined,
                                    }))
                                }
                                placeholder="Enter user Auth ID"
                                helperText="Enter the Auth ID of the user you want to assign this task to"
                            />
                        </div>
                    </div>

                    {/* Categories and Tags */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Organization
                        </h2>

                        {/* Categories */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Hash className="w-4 h-4 inline mr-1" />
                                Categories
                            </label>
                            {categories.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((category) => {
                                        const isSelected =
                                            formData.categoryIds?.includes(
                                                category.id,
                                            );
                                        return (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() =>
                                                    handleMultiSelect(
                                                        "categoryIds",
                                                        category.id,
                                                    )
                                                }
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                                    isSelected
                                                        ? "bg-primary-100 text-primary-800 border-primary-200"
                                                        : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                                                } border`}
                                                style={{
                                                    backgroundColor:
                                                        isSelected &&
                                                        category.color
                                                            ? category.color
                                                            : undefined,
                                                }}
                                            >
                                                {category.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No categories available.
                                    <Link
                                        href="/categories"
                                        className="text-primary-600 hover:text-primary-500 ml-1"
                                    >
                                        Create some categories
                                    </Link>
                                </p>
                            )}
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <TagIcon className="w-4 h-4 inline mr-1" />
                                Tags
                            </label>
                            {tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => {
                                        const isSelected =
                                            formData.tagIds?.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() =>
                                                    handleMultiSelect(
                                                        "tagIds",
                                                        tag.id,
                                                    )
                                                }
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                                    isSelected
                                                        ? "bg-primary-100 text-primary-800 border-primary-200"
                                                        : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                                                } border`}
                                                style={{
                                                    backgroundColor:
                                                        isSelected && tag.color
                                                            ? tag.color
                                                            : undefined,
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No tags available.
                                    <Link
                                        href="/tags"
                                        className="text-primary-600 hover:text-primary-500 ml-1"
                                    >
                                        Create some tags
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-4">
                        <Link href="/tasks">
                            <Button variant="secondary" disabled={isLoading}>
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" isLoading={isLoading}>
                            Create Task
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
