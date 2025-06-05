"use client";

import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { Tag, CreateTagData } from "@/types";
import { formatDate, generateColorFromString } from "@/lib/utils";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Tag as TagIcon,
    BarChart3,
    Eye,
    Palette,
    CheckSquare,
    MoreHorizontal,
    TrendingUp,
    Star,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [popularTags, setPopularTags] = useState<Tag[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [tagCombinations, setTagCombinations] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showPopularModal, setShowPopularModal] = useState(false);
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [tagForm, setTagForm] = useState<CreateTagData>({
        name: "",
        color: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadTags();
        loadStatistics();
        loadPopularTags();
        loadTagCombinations();
    }, []);

    const loadTags = async () => {
        try {
            setIsLoading(true);
            const tagsData = await apiClient.getTags({
                search: searchTerm,
                withTaskCount: true,
                sortBy: "name",
                sortOrder: "asc",
            });
            setTags(tagsData);
        } catch (error) {
            console.error("Failed to load tags:", error);
            toast.error("Failed to load tags");
        } finally {
            setIsLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const statsData = await apiClient.getTagStatistics();
            setStatistics(statsData);
        } catch (error) {
            console.error("Failed to load tag statistics:", error);
        }
    };

    const loadPopularTags = async () => {
        try {
            const popularData = await apiClient.getPopularTags(20);
            setPopularTags(popularData);
        } catch (error) {
            console.error("Failed to load popular tags:", error);
        }
    };

    const loadTagCombinations = async () => {
        try {
            const combinationsData =
                await apiClient.getPopularTagCombinations(15);
            setTagCombinations(combinationsData);
        } catch (error) {
            console.error("Failed to load tag combinations:", error);
        }
    };

    const handleSearch = () => {
        loadTags();
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!tagForm.name.trim()) {
            errors.name = "Tag name is required";
        } else if (tagForm.name.length > 50) {
            errors.name = "Name must be less than 50 characters";
        } else if (!/^[a-zA-Z0-9\-_]+$/.test(tagForm.name)) {
            errors.name =
                "Tag name can only contain letters, numbers, hyphens, and underscores";
        }

        if (tagForm.color && !/^#[0-9A-F]{6}$/i.test(tagForm.color)) {
            errors.color =
                "Color must be a valid hex color code (e.g., #FF5733)";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const dataToSubmit = {
                ...tagForm,
                color: tagForm.color || generateColorFromString(tagForm.name),
            };

            await apiClient.createTag(dataToSubmit);
            toast.success("Tag created successfully!");
            setShowCreateModal(false);
            resetForm();
            loadTags();
            loadStatistics();
            loadPopularTags();
        } catch (error: any) {
            console.error("Failed to create tag:", error);
            toast.error(error.message || "Failed to create tag");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditTag = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTag || !validateForm()) return;

        setIsSubmitting(true);
        try {
            await apiClient.updateTag(selectedTag.id, tagForm);
            toast.success("Tag updated successfully!");
            setShowEditModal(false);
            resetForm();
            loadTags();
            loadStatistics();
            loadPopularTags();
        } catch (error: any) {
            console.error("Failed to update tag:", error);
            toast.error(error.message || "Failed to update tag");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTag = async () => {
        if (!selectedTag) return;

        setIsSubmitting(true);
        try {
            await apiClient.deleteTag(selectedTag.id);
            toast.success("Tag deleted successfully!");
            setShowDeleteModal(false);
            setSelectedTag(null);
            loadTags();
            loadStatistics();
            loadPopularTags();
        } catch (error: any) {
            console.error("Failed to delete tag:", error);
            toast.error(error.message || "Failed to delete tag");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTagForm({ name: "", color: "" });
        setFormErrors({});
        setSelectedTag(null);
    };

    const openEditModal = (tag: Tag) => {
        setSelectedTag(tag);
        setTagForm({
            name: tag.name,
            color: tag.color || "",
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (tag: Tag) => {
        setSelectedTag(tag);
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
        "#FF9F43",
        "#55A3FF",
        "#FD79A8",
        "#FDCB6E",
        "#6C5CE7",
    ];

    const filteredTags = tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Tags
                        </h1>
                        <p className="text-gray-600">
                            Label and organize your tasks with flexible tags
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowPopularModal(true)}
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Popular
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowStatsModal(true)}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Statistics
                        </Button>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Tag
                        </Button>
                    </div>
                </div>

                {/* Search and Quick Stats */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search tags..."
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
                                    {tags.length}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Total Tags
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {statistics.reduce(
                                        (sum: number, tag: any) =>
                                            sum + tag.totalTasks,
                                        0,
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Total Usages
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {Math.round(
                                        statistics.reduce(
                                            (sum: number, tag: any) =>
                                                sum + tag.totalTasks,
                                            0,
                                        ) / tags.length || 0,
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Avg Uses per Tag
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {
                                        statistics.filter(
                                            (tag: any) => tag.totalTasks > 0,
                                        ).length
                                    }
                                </div>
                                <div className="text-sm text-gray-600">
                                    Tags in Use
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Popular Tags Preview */}
                {popularTags.length > 0 && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                <Star className="w-5 h-5 inline mr-2" />
                                Most Popular Tags
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPopularModal(true)}
                            >
                                View All
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {popularTags.slice(0, 10).map((tag) => (
                                <Link
                                    key={tag.id}
                                    href={`/tasks?tagId=${tag.id}`}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                                    style={{
                                        backgroundColor: tag.color || "#ccc",
                                        color: "#fff",
                                    }}
                                >
                                    <TagIcon className="w-3 h-3 mr-1" />
                                    {tag.name}
                                    <span className="ml-1 text-xs">
                                        {tag._count?.tasks || 0}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tags Grid */}
                <div>
                    {isLoading ? (
                        <Loading text="Loading tags..." />
                    ) : filteredTags.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredTags.map((tag) => (
                                <TagCard
                                    key={tag.id}
                                    tag={tag}
                                    onEdit={() => openEditModal(tag)}
                                    onDelete={() => openDeleteModal(tag)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="card text-center py-12">
                            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No tags found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm
                                    ? `No tags match "${searchTerm}"`
                                    : "Get started by creating your first tag."}
                            </p>
                            {!searchTerm && (
                                <div className="mt-6">
                                    <Button
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Tag
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Create Tag Modal */}
                <Modal
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                    title="Create New Tag"
                >
                    <form onSubmit={handleCreateTag} className="space-y-4">
                        <Input
                            label="Tag Name"
                            value={tagForm.name}
                            onChange={(e) =>
                                setTagForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            error={formErrors.name}
                            placeholder="e.g., urgent, bug, feature"
                            helperText="Use lowercase letters, numbers, hyphens, and underscores only"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Palette className="w-4 h-4 inline mr-1" />
                                Color
                            </label>
                            <div className="flex items-center space-x-3 mb-3">
                                <Input
                                    value={tagForm.color}
                                    onChange={(e) =>
                                        setTagForm((prev) => ({
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
                                            tagForm.color ||
                                            generateColorFromString(
                                                tagForm.name,
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
                                            setTagForm((prev) => ({
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
                                Create Tag
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Edit Tag Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        resetForm();
                    }}
                    title="Edit Tag"
                >
                    <form onSubmit={handleEditTag} className="space-y-4">
                        <Input
                            label="Tag Name"
                            value={tagForm.name}
                            onChange={(e) =>
                                setTagForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            error={formErrors.name}
                            placeholder="e.g., urgent, bug, feature"
                            helperText="Use lowercase letters, numbers, hyphens, and underscores only"
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Palette className="w-4 h-4 inline mr-1" />
                                Color
                            </label>
                            <div className="flex items-center space-x-3 mb-3">
                                <Input
                                    value={tagForm.color}
                                    onChange={(e) =>
                                        setTagForm((prev) => ({
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
                                            tagForm.color || "#ccc",
                                    }}
                                />
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {predefinedColors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() =>
                                            setTagForm((prev) => ({
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
                                Update Tag
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete Tag"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to delete the tag "
                            <span className="font-semibold">
                                {selectedTag?.name}
                            </span>
                            "?
                            {selectedTag?._count?.tasks &&
                            selectedTag._count.tasks > 0 ? (
                                <span className="text-red-600">
                                    {" "}
                                    This tag has {selectedTag._count.tasks}{" "}
                                    associated task(s) and cannot be deleted.
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
                                onClick={handleDeleteTag}
                                isLoading={isSubmitting}
                                disabled={Boolean(
                                    selectedTag?._count?.tasks &&
                                        selectedTag._count.tasks > 0,
                                )}
                            >
                                Delete Tag
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Popular Tags Modal */}
                <Modal
                    isOpen={showPopularModal}
                    onClose={() => setShowPopularModal(false)}
                    title="Popular Tags & Combinations"
                    size="lg"
                >
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                Most Used Tags
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {popularTags.map((tag, index) => (
                                    <div
                                        key={tag.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm text-gray-500 w-6">
                                                #{index + 1}
                                            </span>
                                            <div
                                                className="w-4 h-4 rounded"
                                                style={{
                                                    backgroundColor: tag.color,
                                                }}
                                            />
                                            <span className="font-medium">
                                                {tag.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Badge variant="gray">
                                                {tag._count?.tasks || 0} tasks
                                            </Badge>
                                            <Link
                                                href={`/tasks?tagId=${tag.id}`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {tagCombinations &&
                            tagCombinations.popularCombinations && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">
                                        Popular Tag Combinations
                                    </h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {tagCombinations.popularCombinations.map(
                                            (combo: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        {combo.tags.map(
                                                            (
                                                                tagName: string,
                                                                tagIndex: number,
                                                            ) => (
                                                                <React.Fragment
                                                                    key={
                                                                        tagName
                                                                    }
                                                                >
                                                                    <Badge variant="primary">
                                                                        {
                                                                            tagName
                                                                        }
                                                                    </Badge>
                                                                    {tagIndex <
                                                                        combo
                                                                            .tags
                                                                            .length -
                                                                            1 && (
                                                                        <span className="text-gray-400">
                                                                            +
                                                                        </span>
                                                                    )}
                                                                </React.Fragment>
                                                            ),
                                                        )}
                                                    </div>
                                                    <Badge variant="gray">
                                                        {combo.count} times
                                                    </Badge>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                    <div className="mt-4 text-sm text-gray-600">
                                        Total unique combinations:{" "}
                                        {
                                            tagCombinations.totalUniqueCombinations
                                        }
                                    </div>
                                </div>
                            )}
                    </div>
                </Modal>

                {/* Statistics Modal */}
                <Modal
                    isOpen={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                    title="Tag Statistics"
                    size="lg"
                >
                    {statistics && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {tags.length}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Tags
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {statistics.reduce(
                                            (sum: number, tag: any) =>
                                                sum + tag.totalTasks,
                                            0,
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Usages
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {
                                            statistics.filter(
                                                (tag: any) =>
                                                    tag.totalTasks > 0,
                                            ).length
                                        }
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Active Tags
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {Math.round(
                                            statistics.reduce(
                                                (sum: number, tag: any) =>
                                                    sum + tag.totalTasks,
                                                0,
                                            ) / tags.length || 0,
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Avg per Tag
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4">
                                    Tag Usage Details
                                </h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {statistics
                                        .sort(
                                            (a: any, b: any) =>
                                                b.totalTasks - a.totalTasks,
                                        )
                                        .map((tag: any) => (
                                            <div
                                                key={tag.id}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                tag.color,
                                                        }}
                                                    />
                                                    <span className="font-medium">
                                                        {tag.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-sm text-gray-600">
                                                        {tag.totalTasks} tasks
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        {Object.entries(
                                                            tag.tasksByStatus ||
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

// Tag Card Component
interface TagCardProps {
    tag: Tag;
    onEdit: () => void;
    onDelete: () => void;
}

function TagCard({ tag, onEdit, onDelete }: TagCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: tag.color || "#ccc" }}
                    />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {tag.name}
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
                                    href={`/tasks?tagId=${tag.id}`}
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
                                    disabled={Boolean(
                                        tag._count?.tasks &&
                                            tag._count.tasks > 0,
                                    )}
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
                        {tag._count?.tasks || 0} tasks
                    </div>
                    <div className="text-xs text-gray-500">
                        Created {formatDate(tag.createdAt)}
                    </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                    <Link href={`/tasks?tagId=${tag.id}`}>
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
