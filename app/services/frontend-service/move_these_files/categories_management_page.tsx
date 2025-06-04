"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { Category, CreateCategoryData } from "@/types";
import { formatDate, generateColorFromString } from "@/lib/utils";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Hash,
    BarChart3,
    Eye,
    Palette,
    CheckSquare,
    MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [categoryForm, setCategoryForm] = useState<CreateCategoryData>({
        name: "",
        color: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadCategories();
        loadStatistics();
    }, []);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const categoriesData = await apiClient.getCategories({
                search: searchTerm,
                withTaskCount: true,
                sortBy: "name",
                sortOrder: "asc",
            });
            setCategories(categoriesData);
        } catch (error) {
            console.error("Failed to load categories:", error);
            toast.error("Failed to load categories");
        } finally {
            setIsLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const statsData = await apiClient.getCategoryStatistics();
            setStatistics(statsData);
        } catch (error) {
            console.error("Failed to load category statistics:", error);
        }
    };

    const handleSearch = () => {
        loadCategories();
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!categoryForm.name.trim()) {
            errors.name = "Category name is required";
        } else if (categoryForm.name.length > 100) {
            errors.name = "Name must be less than 100 characters";
        }

        if (categoryForm.color && !/^#[0-9A-F]{6}$/i.test(categoryForm.color)) {
            errors.color =
                "Color must be a valid hex color code (e.g., #FF5733)";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const dataToSubmit = {
                ...categoryForm,
                color:
                    categoryForm.color ||
                    generateColorFromString(categoryForm.name),
            };

            await apiClient.createCategory(dataToSubmit);
            toast.success("Category created successfully!");
            setShowCreateModal(false);
            resetForm();
            loadCategories();
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to create category:", error);
            toast.error(error.message || "Failed to create category");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCategory = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCategory || !validateForm()) return;

        setIsSubmitting(true);
        try {
            await apiClient.updateCategory(selectedCategory.id, categoryForm);
            toast.success("Category updated successfully!");
            setShowEditModal(false);
            resetForm();
            loadCategories();
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to update category:", error);
            toast.error(error.message || "Failed to update category");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!selectedCategory) return;

        setIsSubmitting(true);
        try {
            await apiClient.deleteCategory(selectedCategory.id);
            toast.success("Category deleted successfully!");
            setShowDeleteModal(false);
            setSelectedCategory(null);
            loadCategories();
            loadStatistics();
        } catch (error: any) {
            console.error("Failed to delete category:", error);
            toast.error(error.message || "Failed to delete category");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setCategoryForm({ name: "", color: "" });
        setFormErrors({});
        setSelectedCategory(null);
    };

    const openEditModal = (category: Category) => {
        setSelectedCategory(category);
        setCategoryForm({
            name: category.name,
            color: category.color || "",
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (category: Category) => {
        setSelectedCategory(category);
        setShowDeleteModal(true);
    };

    const predefinedColors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7",
        "#DDA0DD",
        "#98D8C8",
        "#F7DC6F",
        "#BB8FCE",
        "#85C1E9",
    ];

    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Categories
                        </h1>
                        <p className="text-gray-600">
                            Organize your tasks with custom categories
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowStatsModal(true)}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Statistics
                        </Button>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Category
                        </Button>
                    </div>
                </div>

                {/* Search and Stats */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search categories..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    onKeyPress={(e) =>
                                        e.key === "Enter" && handleSearch()
                                    }
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleSearch}>
                            Search
                        </Button>
                    </div>

                    {statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {categories.length}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Total Categories
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {statistics.reduce(
                                        (sum: number, cat: any) =>
                                            sum + cat.totalTasks,
                                        0,
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Total Tasks
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {Math.round(
                                        statistics.reduce(
                                            (sum: number, cat: any) =>
                                                sum + cat.totalTasks,
                                            0,
                                        ) / categories.length || 0,
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Avg Tasks per Category
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {
                                        statistics.filter(
                                            (cat: any) => cat.totalTasks > 0,
                                        ).length
                                    }
                                </div>
                                <div className="text-sm text-gray-600">
                                    Categories in Use
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Categories Grid */}
                <div>
                    {isLoading ? (
                        <Loading text="Loading categories..." />
                    ) : filteredCategories.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredCategories.map((category) => (
                                <CategoryCard
                                    key={category.id}
                                    category={category}
                                    onEdit={() => openEditModal(category)}
                                    onDelete={() => openDeleteModal(category)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="card text-center py-12">
                            <Hash className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No categories found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm
                                    ? `No categories match "${searchTerm}"`
                                    : "Get started by creating your first category."}
                            </p>
                            {!searchTerm && (
                                <div className="mt-6">
                                    <Button
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Category
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Create Category Modal */}
                <Modal
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                    title="Create New Category"
                >
                    <form onSubmit={handleCreateCategory} className="space-y-4">
                        <Input
                            label="Category Name"
                            value={categoryForm.name}
                            onChange={(e) =>
                                setCategoryForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            error={formErrors.name}
                            placeholder="Enter category name"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Palette className="w-4 h-4 inline mr-1" />
                                Color
                            </label>
                            <div className="flex items-center space-x-3 mb-3">
                                <Input
                                    value={categoryForm.color}
                                    onChange={(e) =>
                                        setCategoryForm((prev) => ({
                                            ...prev,
                                            color: e.target.value,
                                        }))
                                    }
                                    placeholder="#FF5733"
                                    className="w-32"
                                />
                                <div
                                    className="w-8 h-8 rounded border-2 border-gray-300"
                                    style={{
                                        backgroundColor:
                                            categoryForm.color ||
                                            generateColorFromString(
                                                categoryForm.name,
                                            ),
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {predefinedColors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() =>
                                            setCategoryForm((prev) => ({
                                                ...prev,
                                                color,
                                            }))
                                        }
                                        className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            {formErrors.color && (
                                <p className="text-sm text-red-600 mt-1">
                                    {formErrors.color}
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
                                Create Category
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Edit Category Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        resetForm();
                    }}
                    title="Edit Category"
                >
                    <form onSubmit={handleEditCategory} className="space-y-4">
                        <Input
                            label="Category Name"
                            value={categoryForm.name}
                            onChange={(e) =>
                                setCategoryForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            error={formErrors.name}
                            placeholder="Enter category name"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Palette className="w-4 h-4 inline mr-1" />
                                Color
                            </label>
                            <div className="flex items-center space-x-3 mb-3">
                                <Input
                                    value={categoryForm.color}
                                    onChange={(e) =>
                                        setCategoryForm((prev) => ({
                                            ...prev,
                                            color: e.target.value,
                                        }))
                                    }
                                    placeholder="#FF5733"
                                    className="w-32"
                                />
                                <div
                                    className="w-8 h-8 rounded border-2 border-gray-300"
                                    style={{
                                        backgroundColor:
                                            categoryForm.color || "#ccc",
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {predefinedColors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() =>
                                            setCategoryForm((prev) => ({
                                                ...prev,
                                                color,
                                            }))
                                        }
                                        className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            {formErrors.color && (
                                <p className="text-sm text-red-600 mt-1">
                                    {formErrors.color}
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
                                Update Category
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Category"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to delete the category "
                            <span className="font-semibold">
                                {selectedCategory?.name}
                            </span>
                            "?
                            {selectedCategory?._count?.tasks &&
                            selectedCategory._count.tasks > 0 ? (
                                <span className="text-red-600">
                                    {" "}
                                    This category has{" "}
                                    {selectedCategory._count.tasks} associated
                                    task(s) and cannot be deleted.
                                </span>
                            ) : (
                                " This action cannot be undone."
                            )}
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
                                onClick={handleDeleteCategory}
                                isLoading={isSubmitting}
                                disabled={
                                    selectedCategory?._count?.tasks &&
                                    selectedCategory._count.tasks > 0
                                }
                            >
                                Delete Category
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Statistics Modal */}
                <Modal
                    isOpen={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                    title="Category Statistics"
                    size="lg"
                >
                    {statistics && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {categories.length}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Categories
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {statistics.reduce(
                                            (sum: number, cat: any) =>
                                                sum + cat.totalTasks,
                                            0,
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Tasks
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {
                                            statistics.filter(
                                                (cat: any) =>
                                                    cat.totalTasks > 0,
                                            ).length
                                        }
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Active Categories
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {Math.round(
                                            statistics.reduce(
                                                (sum: number, cat: any) =>
                                                    sum + cat.totalTasks,
                                                0,
                                            ) / categories.length || 0,
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Avg per Category
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4">
                                    Category Usage
                                </h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {statistics
                                        .sort(
                                            (a: any, b: any) =>
                                                b.totalTasks - a.totalTasks,
                                        )
                                        .map((cat: any) => (
                                            <div
                                                key={cat.id}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                cat.color,
                                                        }}
                                                    />
                                                    <span className="font-medium">
                                                        {cat.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-sm text-gray-600">
                                                        {cat.totalTasks} tasks
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        {Object.entries(
                                                            cat.tasksByStatus ||
                                                                {},
                                                        ).map(
                                                            ([status, count]: [
                                                                string,
                                                                any,
                                                            ]) => (
                                                                <Badge
                                                                    key={status}
                                                                    variant="gray"
                                                                    className="text-xs"
                                                                >
                                                                    {status}:{" "}
                                                                    {count}
                                                                </Badge>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </Layout>
    );
}

// Category Card Component
interface CategoryCardProps {
    category: Category;
    onEdit: () => void;
    onDelete: () => void;
}

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: category.color || "#ccc" }}
                    />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {category.name}
                    </h3>
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
                                    href={`/tasks?categoryId=${category.id}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Tasks
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
                                    disabled={
                                        category._count?.tasks &&
                                        category._count.tasks > 0
                                    }
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                        <CheckSquare className="w-4 h-4 mr-1" />
                        {category._count?.tasks || 0} tasks
                    </div>
                    <div className="text-xs text-gray-500">
                        Created {formatDate(category.createdAt)}
                    </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                    <Link href={`/tasks?categoryId=${category.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            View Tasks
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
