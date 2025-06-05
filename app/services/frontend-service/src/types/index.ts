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

export interface ChangePasswordData {
    oldPassword: string;
    newPassword: string;
    username?: string;
    email?: string;
}

export interface UserSearchResult {
    id: number;
    authId: number;
    createdAt: string;
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
    isActive?: boolean;
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

export interface MessageSearchResult extends Message {
    contentHighlighted: string;
}

export interface ChatStatistics {
    totalChats: number;
    totalMessages: number;
    chatsCreated: number;
    projectBreakdown: Array<{
        projectId: number;
        chatCount: number;
        lastActivity: string;
    }>;
}

export interface OnlineUser {
    userId: number;
    timestamp: string;
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

// API Response types (FIXED)
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
}

export interface PaginatedResponse<T = any> {
    success: boolean;
    data: Record<string, any> & {
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage?: boolean;
            hasPrevPage?: boolean;
        };
    };
    error?: string;
    details?: any;
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
    includeChats?: boolean;
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

// Export and admin types
export interface ExportOptions {
    projectId?: number;
    status?: string;
    priority?: string;
    includeArchived?: boolean;
    detailed?: boolean;
    ownedOnly?: boolean;
    includeTasks?: boolean;
}

export interface AdminUser {
    id: number;
    authId: number;
    username?: string;
    email?: string;
    isVerified: boolean;
    isActive: boolean;
    role: "USER" | "ADMIN" | "SUPER_ADMIN";
    createdAt: string;
    lastLogin?: string;
    tasksCount: number;
    projectsCount: number;
}

export interface SystemHealth {
    authService: "healthy" | "degraded" | "down";
    dbService: "healthy" | "degraded" | "down";
    chatService: "healthy" | "degraded" | "down";
    database: "connected" | "disconnected";
    uptime: string;
    version: string;
}

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    totalTasks: number;
    totalProjects: number;
    totalCategories: number;
    totalTags: number;
    totalMessages: number;
    systemLoad: number;
}

// OAuth and authentication types
export interface OAuthState {
    status: "loading" | "success" | "error";
    message: string;
    userInfo?: any;
}

// Search types
export interface SearchResult {
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

export interface SearchFilters {
    types: string[];
    dateRange?: {
        from: string;
        to: string;
    };
    sortBy: "relevance" | "date" | "title";
    sortOrder: "asc" | "desc";
}

// Component prop types
export interface LayoutProps {
    children: React.ReactNode;
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    children: React.ReactNode;
}

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export interface BadgeProps {
    children: React.ReactNode;
    variant?: "primary" | "success" | "warning" | "danger" | "gray";
    className?: string;
}

export interface LoadingProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    className?: string;
}

// Socket.IO types
export interface SocketContextType {
    socket: any | null;
    isConnected: boolean;
    joinProject: (projectId: number) => void;
    leaveProject: (projectId: number) => void;
    sendMessage: (chatId: string, content: string) => void;
    editMessage: (messageId: string, content: string) => void;
    deleteMessage: (messageId: string) => void;
    startTyping: (chatId: string) => void;
    stopTyping: (chatId: string) => void;
    onNewMessage: (callback: (message: Message) => void) => void;
    onMessageEdited: (callback: (message: Message) => void) => void;
    onMessageDeleted: (
        callback: (data: { messageId: string; chatId: string }) => void,
    ) => void;
    onUserTyping: (
        callback: (data: {
            userId: number;
            chatId: string;
            isTyping: boolean;
        }) => void,
    ) => void;
    onUserJoined: (callback: (data: { userId: number }) => void) => void;
    onUserLeft: (callback: (data: { userId: number }) => void) => void;
}

// Form types
export interface TaskFormData extends CreateTaskData {
    errors?: Record<string, string>;
}

export interface ProjectFormData extends CreateProjectData {
    errors?: Record<string, string>;
}

export interface CategoryFormData extends CreateCategoryData {
    errors?: Record<string, string>;
}

export interface TagFormData extends CreateTagData {
    errors?: Record<string, string>;
}

export interface ChatFormData extends CreateChatData {
    errors?: Record<string, string>;
}

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error types
export interface AppError {
    message: string;
    code?: string;
    details?: any;
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

// Theme and UI types
export interface ThemeColors {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    gray: string;
}

export interface NavigationItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    current?: boolean;
    badge?: number;
}

// Date and time types
export type DateFormat = "relative" | "short" | "long" | "iso";

export interface TimeRange {
    start: string;
    end: string;
}

export interface DateFilter {
    period: "today" | "week" | "month" | "quarter" | "year" | "custom";
    range?: TimeRange;
}

// Feature flags and settings
export interface FeatureFlags {
    enableOAuth: boolean;
    enableRealTimeChat: boolean;
    enableNotifications: boolean;
    enableAnalytics: boolean;
    enableExport: boolean;
}

export interface UserSettings {
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
    notifications: {
        email: boolean;
        push: boolean;
        dueDateReminders: boolean;
        taskAssignments: boolean;
        projectUpdates: boolean;
    };
}

// Analytics and metrics
export interface AnalyticsEvent {
    name: string;
    properties?: Record<string, any>;
    timestamp: string;
    userId?: number;
}

export interface MetricData {
    name: string;
    value: number;
    change?: number;
    changeType?: "increase" | "decrease";
    unit?: string;
}

// File and media types
export interface FileUpload {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    uploadedAt: string;
    uploadedBy: number;
}

export interface MediaItem {
    id: string;
    type: "image" | "video" | "audio" | "document";
    url: string;
    thumbnail?: string;
    metadata?: Record<string, any>;
}

// Internationalization
export interface LocaleData {
    code: string;
    name: string;
    flag: string;
    translations: Record<string, string>;
}

// Performance and monitoring
export interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: string;
    threshold?: number;
    status: "good" | "warning" | "critical";
}

export interface HealthCheck {
    service: string;
    status: "healthy" | "degraded" | "down";
    responseTime: number;
    lastChecked: string;
    details?: Record<string, any>;
}
