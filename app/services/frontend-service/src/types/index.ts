// Auth types
export interface User {
    id: number;
    username?: string;
    email?: string;
    isVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginCredentials {
    username?: string;
    email?: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    email: string;
    password: string;
}

// Task types
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus =
    | "TODO"
    | "IN_PROGRESS"
    | "REVIEW"
    | "DONE"
    | "CANCELED";

export interface Task {
    id: number;
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    owner: {
        id: number;
        authId: number;
    };
    assignee?: {
        id: number;
        authId: number;
    };
    project?: {
        id: number;
        name: string;
    };
    categories?: {
        category: Category;
        assignedAt: string;
    }[];
    tags?: {
        tag: Tag;
        assignedAt: string;
    }[];
}

export interface CreateTaskData {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string;
    assigneeAuthId?: number;
    projectId?: number;
    categoryIds?: number[];
    tagIds?: number[];
}

// Project types
export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface Project {
    id: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    owner: {
        id: number;
        authId: number;
    };
    members: {
        id: number;
        role: ProjectRole;
        user: {
            id: number;
            authId: number;
        };
    }[];
    _count: {
        tasks: number;
        members: number;
    };
    tasks?: Task[];
    chats?: Chat[];
    chatCount?: number;
}

export interface CreateProjectData {
    name: string;
    description?: string;
}

// Category types
export interface Category {
    id: number;
    name: string;
    color?: string;
    createdAt: string;
    updatedAt: string;
    owner: {
        id: number;
        authId: number;
    };
    _count?: {
        tasks: number;
    };
}

export interface CreateCategoryData {
    name: string;
    color?: string;
}

// Tag types
export interface Tag {
    id: number;
    name: string;
    color?: string;
    createdAt: string;
    updatedAt: string;
    owner: {
        id: number;
        authId: number;
    };
    _count?: {
        tasks: number;
    };
}

export interface CreateTagData {
    name: string;
    color?: string;
}

// Chat types
export interface Chat {
    id: string;
    projectId: number;
    name: string;
    description?: string;
    createdBy: number;
    lastActivity: string;
    messageCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    chatId: string;
    userId: number;
    content: string;
    messageType: "text" | "system" | "file" | "image";
    metadata?: any;
    isEdited: boolean;
    editedAt?: string;
    isDeleted: boolean;
    deletedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateChatData {
    projectId: number;
    name: string;
    description?: string;
}

// Notification types
export type NotificationType =
    | "DUE_DATE_REMINDER"
    | "TASK_ASSIGNED"
    | "TASK_STATUS_CHANGED"
    | "COMMENT_ADDED"
    | "PROJECT_INVITE";

export interface Notification {
    id: number;
    type: NotificationType;
    content: string;
    isRead: boolean;
    createdAt: string;
    relatedTask?: {
        id: number;
        title: string;
        status: TaskStatus;
    };
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
}

export interface PaginatedResponse<T = any> {
    success: boolean;
    data: {
        [key: string]: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage?: boolean;
            hasPrevPage?: boolean;
        };
    };
}

// Filter and search types
export interface TaskFilters {
    status?: TaskStatus;
    priority?: TaskPriority;
    projectId?: number;
    assignedToMe?: boolean;
    search?: string;
    categoryId?: number;
    tagId?: number;
    dueDateFrom?: string;
    dueDateTo?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
}

export interface ProjectFilters {
    search?: string;
    ownedOnly?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
}

// Statistics types
export interface TaskStatistics {
    byStatus: Record<TaskStatus, number>;
    total: number;
    completion: {
        completed: number;
        inProgress: number;
        pending: number;
        canceled: number;
        completionRate: string;
    };
}

export interface UserProfile {
    user: {
        id: number;
        authId: number;
        createdAt: string;
        updatedAt: string;
    };
    statistics: {
        ownedTasks: number;
        assignedTasks: number;
        projects: number;
        categories: number;
        tags: number;
        tasksByStatus: Record<TaskStatus, number>;
    };
}
