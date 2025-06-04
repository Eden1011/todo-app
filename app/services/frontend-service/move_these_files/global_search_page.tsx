"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { Loading } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api";
import { Task, Project, Category, Tag, Message, Notification } from "@/types";
import {
    formatDate,
    formatRelativeTime,
    truncateText,
    debounce,
} from "@/lib/utils";
import {
    Search,
    Filter,
    CheckSquare,
    Folder,
    Hash,
    Tags,
    MessageSquare,
    Bell,
    Calendar,
    User,
    Clock,
    ArrowRight,
    ExternalLink,
    X,
    Zap,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface SearchResult {
    type: "task" | "project" | "category" | "tag" | "message" | "notification";
    id: string | number;
    title: string;
    description?: string;
    context?: string;
    url: string;
    score: number;
    highlighted?: string;
    metadata?: any;
}

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    const searchTypes = [
        {
            id: "task",
            label: "Tasks",
            icon: CheckSquare,
            color: "bg-blue-100 text-blue-800",
        },
        {
            id: "project",
            label: "Projects",
            icon: Folder,
            color: "bg-green-100 text-green-800",
        },
        {
            id: "category",
            label: "Categories",
            icon: Hash,
            color: "bg-purple-100 text-purple-800",
        },
        {
            id: "tag",
            label: "Tags",
            icon: Tags,
            color: "bg-orange-100 text-orange-800",
        },
        {
            id: "message",
            label: "Messages",
            icon: MessageSquare,
            color: "bg-indigo-100 text-indigo-800",
        },
        {
            id: "notification",
            label: "Notifications",
            icon: Bell,
            color: "bg-red-100 text-red-800",
        },
    ];

    useEffect(() => {
        // Load recent searches from localStorage
        const stored = localStorage.getItem("recentSearches");
        if (stored) {
            setRecentSearches(JSON.parse(stored));
        }

        // Perform initial search if query exists
        if (initialQuery) {
            performSearch(initialQuery);
        }

        // Focus search input
        searchInputRef.current?.focus();
    }, []);

    const debouncedSearch = debounce((searchQuery: string) => {
        if (searchQuery.length >= 2) {
            performSearch(searchQuery);
            generateSuggestions(searchQuery);
        } else {
            setResults([]);
            setSuggestions([]);
        }
    }, 300);

    const performSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        try {
            const searchResults: SearchResult[] = [];

            // Search tasks
            if (selectedTypes.length === 0 || selectedTypes.includes("task")) {
                try {
                    const tasks = await apiClient.getTasks({
                        search: searchQuery,
                        limit: 10,
                    });
                    tasks.tasks.forEach((task) => {
                        searchResults.push({
                            type: "task",
                            id: task.id,
                            title: task.title,
                            description: task.description,
                            context: `Priority: ${task.priority}, Status: ${task.status}`,
                            url: `/tasks/${task.id}`,
                            score: calculateRelevanceScore(
                                searchQuery,
                                task.title,
                                task.description,
                            ),
                            metadata: {
                                priority: task.priority,
                                status: task.status,
                                dueDate: task.dueDate,
                                project: task.project?.name,
                            },
                        });
                    });
                } catch (error) {
                    console.error("Failed to search tasks:", error);
                }
            }

            // Search projects
            if (
                selectedTypes.length === 0 ||
                selectedTypes.includes("project")
            ) {
                try {
                    const projects = await apiClient.getProjects({
                        search: searchQuery,
                        limit: 10,
                    });
                    projects.projects.forEach((project) => {
                        searchResults.push({
                            type: "project",
                            id: project.id,
                            title: project.name,
                            description: project.description,
                            context: `${project._count.tasks} tasks, ${project._count.members} members`,
                            url: `/projects/${project.id}`,
                            score: calculateRelevanceScore(
                                searchQuery,
                                project.name,
                                project.description,
                            ),
                            metadata: {
                                taskCount: project._count.tasks,
                                memberCount: project._count.members,
                            },
                        });
                    });
                } catch (error) {
                    console.error("Failed to search projects:", error);
                }
            }

            // Search categories
            if (
                selectedTypes.length === 0 ||
                selectedTypes.includes("category")
            ) {
                try {
                    const categories = await apiClient.getCategories({
                        search: searchQuery,
                    });
                    categories.forEach((category) => {
                        searchResults.push({
                            type: "category",
                            id: category.id,
                            title: category.name,
                            context: `${category._count?.tasks || 0} tasks`,
                            url: `/tasks?categoryId=${category.id}`,
                            score: calculateRelevanceScore(
                                searchQuery,
                                category.name,
                            ),
                            metadata: {
                                color: category.color,
                                taskCount: category._count?.tasks,
                            },
                        });
                    });
                } catch (error) {
                    console.error("Failed to search categories:", error);
                }
            }

            // Search tags
            if (selectedTypes.length === 0 || selectedTypes.includes("tag")) {
                try {
                    const tags = await apiClient.getTags({
                        search: searchQuery,
                    });
                    tags.forEach((tag) => {
                        searchResults.push({
                            type: "tag",
                            id: tag.id,
                            title: tag.name,
                            context: `${tag._count?.tasks || 0} tasks`,
                            url: `/tasks?tagId=${tag.id}`,
                            score: calculateRelevanceScore(
                                searchQuery,
                                tag.name,
                            ),
                            metadata: {
                                color: tag.color,
                                taskCount: tag._count?.tasks,
                            },
                        });
                    });
                } catch (error) {
                    console.error("Failed to search tags:", error);
                }
            }

            // Sort results by relevance score
            searchResults.sort((a, b) => b.score - a.score);
            setResults(searchResults);

            // Save to recent searches
            saveRecentSearch(searchQuery);
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Search failed");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateRelevanceScore = (
        query: string,
        title: string,
        description?: string,
    ): number => {
        const queryLower = query.toLowerCase();
        const titleLower = title.toLowerCase();
        const descLower = description?.toLowerCase() || "";

        let score = 0;

        // Exact match in title
        if (titleLower === queryLower) score += 100;
        // Title starts with query
        else if (titleLower.startsWith(queryLower)) score += 80;
        // Title contains query
        else if (titleLower.includes(queryLower)) score += 60;

        // Description contains query
        if (descLower.includes(queryLower)) score += 20;

        // Word boundary matches get bonus
        const wordBoundaryRegex = new RegExp(`\\b${queryLower}\\b`);
        if (wordBoundaryRegex.test(titleLower)) score += 40;
        if (wordBoundaryRegex.test(descLower)) score += 10;

        return score;
    };

    const generateSuggestions = (query: string) => {
        // Generate simple suggestions based on recent searches and common terms
        const commonTerms = [
            "urgent",
            "bug",
            "feature",
            "design",
            "development",
            "testing",
            "review",
        ];
        const filtered = commonTerms.filter(
            (term) =>
                term.toLowerCase().includes(query.toLowerCase()) &&
                term !== query,
        );

        // Add recent searches that match
        const matchingRecent = recentSearches.filter(
            (term) =>
                term.toLowerCase().includes(query.toLowerCase()) &&
                term !== query,
        );

        setSuggestions(
            [...new Set([...matchingRecent, ...filtered])].slice(0, 5),
        );
    };

    const saveRecentSearch = (searchQuery: string) => {
        const trimmed = searchQuery.trim();
        if (!trimmed) return;

        const updated = [
            trimmed,
            ...recentSearches.filter((s) => s !== trimmed),
        ].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
    };

    const handleSearch = (searchQuery: string) => {
        setQuery(searchQuery);
        setShowSuggestions(false);

        // Update URL
        const url = new URL(window.location.href);
        if (searchQuery) {
            url.searchParams.set("q", searchQuery);
        } else {
            url.searchParams.delete("q");
        }
        router.replace(url.pathname + url.search);

        // Perform search
        debouncedSearch(searchQuery);
    };

    const handleTypeToggle = (type: string) => {
        setSelectedTypes((prev) =>
            prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type],
        );
    };

    const clearFilters = () => {
        setSelectedTypes([]);
        setShowFilters(false);
    };

    const getResultIcon = (type: string) => {
        const searchType = searchTypes.find((t) => t.id === type);
        if (!searchType) return <Search className="w-5 h-5 text-gray-400" />;
        const Icon = searchType.icon;
        return <Icon className="w-5 h-5 text-gray-600" />;
    };

    const getResultBadgeColor = (type: string) => {
        const searchType = searchTypes.find((t) => t.id === type);
        return searchType?.color || "bg-gray-100 text-gray-800";
    };

    const highlightText = (text: string, query: string) => {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, "gi");
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    };

    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        <Search className="w-8 h-8 inline mr-3" />
                        Search Everything
                    </h1>
                    <p className="text-gray-600">
                        Find tasks, projects, categories, tags, and more across
                        your workspace
                    </p>
                </div>

                {/* Search Input */}
                <div className="card">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowSuggestions(true);
                                handleSearch(e.target.value);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() =>
                                setTimeout(() => setShowSuggestions(false), 200)
                            }
                            className="block w-full pl-10 pr-12 py-4 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                            placeholder="Search tasks, projects, categories..."
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery("");
                                    setResults([]);
                                    setShowSuggestions(false);
                                    router.replace("/search");
                                }}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}

                        {/* Suggestions Dropdown */}
                        {showSuggestions &&
                            (suggestions.length > 0 ||
                                recentSearches.length > 0) && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                                    {suggestions.length > 0 && (
                                        <div className="p-2">
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                                Suggestions
                                            </div>
                                            {suggestions.map(
                                                (suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() =>
                                                            handleSearch(
                                                                suggestion,
                                                            )
                                                        }
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                                    >
                                                        <Search className="w-4 h-4 inline mr-2 text-gray-400" />
                                                        {suggestion}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {recentSearches.length > 0 && !query && (
                                        <div className="border-t border-gray-200 p-2">
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                                Recent Searches
                                            </div>
                                            {recentSearches
                                                .slice(0, 5)
                                                .map((recent, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() =>
                                                            handleSearch(recent)
                                                        }
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                                    >
                                                        <Clock className="w-4 h-4 inline mr-2 text-gray-400" />
                                                        {recent}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>

                    {/* Filters */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className={
                                    selectedTypes.length > 0
                                        ? "border-primary-500 text-primary-700"
                                        : ""
                                }
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                                {selectedTypes.length > 0 && (
                                    <Badge
                                        variant="primary"
                                        className="ml-2 text-xs"
                                    >
                                        {selectedTypes.length}
                                    </Badge>
                                )}
                            </Button>
                            {selectedTypes.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {query && (
                            <div className="text-sm text-gray-500">
                                {isLoading
                                    ? "Searching..."
                                    : `${results.length} results for "${query}"`}
                            </div>
                        )}
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex flex-wrap gap-2">
                                {searchTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() =>
                                            handleTypeToggle(type.id)
                                        }
                                        className={`flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                            selectedTypes.includes(type.id)
                                                ? type.color
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        <type.icon className="w-4 h-4 mr-2" />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Results */}
                <div>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loading text="Searching..." />
                        </div>
                    ) : query && results.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Search Results
                                </h2>
                                <div className="text-sm text-gray-500">
                                    {results.length} results
                                </div>
                            </div>

                            {results.map((result, index) => (
                                <SearchResultCard
                                    key={`${result.type}-${result.id}`}
                                    result={result}
                                    query={query}
                                />
                            ))}
                        </div>
                    ) : query ? (
                        <div className="text-center py-12">
                            <Search className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No results found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Try adjusting your search terms or removing
                                filters.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Zap className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                Start searching
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Enter your search query above to find tasks,
                                projects, and more.
                            </p>
                            {recentSearches.length > 0 && (
                                <div className="mt-6">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Recent Searches
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {recentSearches
                                            .slice(0, 5)
                                            .map((recent, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() =>
                                                        handleSearch(recent)
                                                    }
                                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                                >
                                                    {recent}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

// Search Result Card Component
interface SearchResultCardProps {
    result: SearchResult;
    query: string;
}

function SearchResultCard({ result, query }: SearchResultCardProps) {
    const getResultIcon = (type: string) => {
        switch (type) {
            case "task":
                return <CheckSquare className="w-5 h-5 text-blue-600" />;
            case "project":
                return <Folder className="w-5 h-5 text-green-600" />;
            case "category":
                return <Hash className="w-5 h-5 text-purple-600" />;
            case "tag":
                return <Tags className="w-5 h-5 text-orange-600" />;
            case "message":
                return <MessageSquare className="w-5 h-5 text-indigo-600" />;
            case "notification":
                return <Bell className="w-5 h-5 text-red-600" />;
            default:
                return <Search className="w-5 h-5 text-gray-400" />;
        }
    };

    const getResultBadgeColor = (type: string) => {
        switch (type) {
            case "task":
                return "bg-blue-100 text-blue-800";
            case "project":
                return "bg-green-100 text-green-800";
            case "category":
                return "bg-purple-100 text-purple-800";
            case "tag":
                return "bg-orange-100 text-orange-800";
            case "message":
                return "bg-indigo-100 text-indigo-800";
            case "notification":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const highlightText = (text: string, query: string) => {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, "gi");
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 font-medium">
                    {part}
                </mark>
            ) : (
                part
            ),
        );
    };

    return (
        <Link href={result.url}>
            <div className="card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                        {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getResultBadgeColor(result.type)}>
                                {result.type}
                            </Badge>
                            <div className="text-xs text-gray-500">
                                Score: {result.score}
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {highlightText(result.title, query)}
                        </h3>
                        {result.description && (
                            <p className="text-gray-600 mb-2">
                                {highlightText(
                                    truncateText(result.description, 150),
                                    query,
                                )}
                            </p>
                        )}
                        {result.context && (
                            <p className="text-sm text-gray-500 mb-2">
                                {result.context}
                            </p>
                        )}

                        {/* Metadata */}
                        {result.metadata && (
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                {result.metadata.priority && (
                                    <span>
                                        Priority: {result.metadata.priority}
                                    </span>
                                )}
                                {result.metadata.status && (
                                    <span>
                                        Status: {result.metadata.status}
                                    </span>
                                )}
                                {result.metadata.taskCount !== undefined && (
                                    <span>
                                        {result.metadata.taskCount} tasks
                                    </span>
                                )}
                                {result.metadata.dueDate && (
                                    <span>
                                        Due:{" "}
                                        {formatDate(result.metadata.dueDate)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
