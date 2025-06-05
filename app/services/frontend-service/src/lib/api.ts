import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import {
    ApiResponse,
    PaginatedResponse,
    User,
    AuthTokens,
    LoginCredentials,
    RegisterCredentials,
    Task,
    CreateTaskData,
    TaskFilters,
    Project,
    CreateProjectData,
    ProjectFilters,
    Category,
    CreateCategoryData,
    Tag,
    CreateTagData,
    Chat,
    CreateChatData,
    Message,
    Notification,
    TaskStatistics,
    UserProfile,
} from "@/types";

// Enhanced types for missing functionality
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

export interface ExportOptions {
    projectId?: number;
    status?: string;
    priority?: string;
    includeArchived?: boolean;
    detailed?: boolean;
    ownedOnly?: boolean;
    includeTasks?: boolean;
}

export interface OnlineUser {
    userId: number;
    timestamp: string;
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

class ApiClient {
    private authClient: AxiosInstance;
    private dbClient: AxiosInstance;
    private chatClient: AxiosInstance;

    constructor() {
        // Use proxy routes instead of direct service URLs
        // All requests will go through Next.js rewrites

        // Auth service client - uses proxy route /api/auth
        this.authClient = axios.create({
            baseURL: "/api/auth", // This will be rewritten to auth service
            timeout: 10000,
        });

        // DB service client - uses proxy route /api/db
        this.dbClient = axios.create({
            baseURL: "/api/db", // This will be rewritten to db service
            timeout: 10000,
        });

        // Chat service client - uses proxy route /api/chat
        this.chatClient = axios.create({
            baseURL: "/api/chat", // This will be rewritten to chat service
            timeout: 10000,
        });

        // Add auth interceptors
        this.setupAuthInterceptors();
    }

    private setupAuthInterceptors() {
        const addAuthHeader = (config: any) => {
            const token = Cookies.get("accessToken");
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        };

        // Add auth header to db and chat requests
        this.dbClient.interceptors.request.use(addAuthHeader);
        this.chatClient.interceptors.request.use(addAuthHeader);

        // Handle auth errors
        const handleAuthError = async (error: any) => {
            if (error.response?.status === 401) {
                // Try to refresh token
                const refreshToken = Cookies.get("refreshToken");
                if (refreshToken) {
                    try {
                        const newTokens =
                            await this.refreshAccessToken(refreshToken);
                        Cookies.set("accessToken", newTokens.accessToken, {
                            expires: 1,
                        });

                        // Retry the original request
                        const originalRequest = error.config;
                        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                        return axios(originalRequest);
                    } catch (refreshError) {
                        // Refresh failed, redirect to login
                        this.logout();
                        window.location.href = "/auth/login";
                    }
                } else {
                    // No refresh token, redirect to login
                    this.logout();
                    window.location.href = "/auth/login";
                }
            }
            return Promise.reject(error);
        };

        this.dbClient.interceptors.response.use(
            (response) => response,
            handleAuthError,
        );

        this.chatClient.interceptors.response.use(
            (response) => response,
            handleAuthError,
        );
    }

    // ============================================================================
    // AUTH SERVICE METHODS (using proxy routes)
    // ============================================================================

    async login(credentials: LoginCredentials): Promise<AuthTokens> {
        const response = await this.authClient.post<ApiResponse<AuthTokens>>(
            "/local/user/login", // This becomes /api/auth/local/user/login
            credentials,
        );

        if (response.data.success && response.data.data) {
            const { accessToken, refreshToken } = response.data.data;
            Cookies.set("accessToken", accessToken, { expires: 1 });
            Cookies.set("refreshToken", refreshToken, { expires: 7 });
            return response.data.data;
        }

        throw new Error(response.data.error || "Login failed");
    }

    async register(
        credentials: RegisterCredentials,
    ): Promise<AuthTokens | { message: string }> {
        const response = await this.authClient.post<
            ApiResponse<AuthTokens & { message: string }>
        >("/local/user/register", credentials); // This becomes /api/auth/local/user/register

        if (response.data.success && response.data.data) {
            // If auto-login is enabled, save tokens
            if (
                response.data.data.accessToken &&
                response.data.data.refreshToken
            ) {
                const { accessToken, refreshToken } = response.data.data;
                Cookies.set("accessToken", accessToken, { expires: 1 });
                Cookies.set("refreshToken", refreshToken, { expires: 7 });
                return response.data.data;
            }
            return { message: response.data.data.message };
        }

        throw new Error(response.data.error || "Registration failed");
    }

    async changePassword(
        data: ChangePasswordData,
    ): Promise<{ message: string }> {
        const refreshToken = Cookies.get("refreshToken");
        if (!refreshToken) throw new Error("No refresh token found");

        const response = await this.authClient.post<
            ApiResponse<{ message: string }>
        >("/local/user/change-password", {
            token: refreshToken,
            ...data,
        });

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(response.data.error || "Password change failed");
    }

    async deleteAccount(password: string): Promise<{ message: string }> {
        const refreshToken = Cookies.get("refreshToken");
        if (!refreshToken) throw new Error("No refresh token found");

        const response = await this.authClient.delete<
            ApiResponse<{ message: string }>
        >("/local/user/remove-user", {
            data: {
                token: refreshToken,
                password,
            },
        });

        if (response.data.success && response.data.data) {
            this.logout();
            return response.data.data;
        }

        throw new Error(response.data.error || "Account deletion failed");
    }

    async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
        const response = await this.authClient.post<
            ApiResponse<{ accessToken: string }>
        >("/local/token/token", { token: refreshToken });

        if (response.data.success && response.data.data) {
            return {
                accessToken: response.data.data.accessToken,
                refreshToken,
            };
        }

        throw new Error(response.data.error || "Token refresh failed");
    }

    async verifyToken(): Promise<User> {
        const token = Cookies.get("accessToken");
        if (!token) throw new Error("No token found");

        const response = await this.authClient.post<
            ApiResponse<{ valid: boolean; user: User }>
        >(
            "/local/token/verify", // This becomes /api/auth/local/token/verify
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );

        if (response.data.success && response.data.data?.valid) {
            return response.data.data.user;
        }

        throw new Error("Token verification failed");
    }

    async resendVerificationEmail(email: string): Promise<{ message: string }> {
        const response = await this.authClient.post<
            ApiResponse<{ message: string }>
        >("/local/email/resend-verification", { email });

        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error(
            response.data.error || "Failed to resend verification email",
        );
    }

    logout(): void {
        const refreshToken = Cookies.get("refreshToken");

        // Clear cookies
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");

        // Call logout endpoint if refresh token exists
        if (refreshToken) {
            this.authClient
                .delete("/local/user/logout", {
                    // This becomes /api/auth/local/user/logout
                    data: { token: refreshToken },
                })
                .catch(console.error);
        }
    }

    // ============================================================================
    // DB SERVICE METHODS - USER PROFILE
    // ============================================================================

    async getUserProfile(): Promise<UserProfile> {
        const response =
            await this.dbClient.get<ApiResponse<UserProfile>>(
                "/api/user/profile",
            );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch user profile");
    }

    async getUserActivity(
        limit = 10,
    ): Promise<{ recentTasks: Task[]; recentProjects: Project[] }> {
        const response = await this.dbClient.get<
            ApiResponse<{ recentTasks: Task[]; recentProjects: Project[] }>
        >(`/api/user/activity?limit=${limit}`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch user activity");
    }

    async searchUsers(query: string): Promise<UserSearchResult[]> {
        const response = await this.dbClient.get<
            ApiResponse<UserSearchResult[]>
        >(`/api/user/search?query=${encodeURIComponent(query)}`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to search users");
    }

    async deleteUserAccount(): Promise<{ message: string }> {
        const response =
            await this.dbClient.delete<ApiResponse<{ message: string }>>(
                "/api/user",
            );
        if (response.data.success && response.data.data) {
            this.logout();
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to delete user account");
    }

    // ============================================================================
    // DB SERVICE METHODS - TASKS (Enhanced)
    // ============================================================================

    async getTasks(
        filters: TaskFilters = {},
    ): Promise<PaginatedResponse<Task>["data"]> {
        const response = await this.dbClient.get<PaginatedResponse<Task>>(
            "/api/task",
            {
                params: filters,
            },
        );
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch tasks");
    }

    async getTask(id: number): Promise<Task> {
        const response = await this.dbClient.get<ApiResponse<Task>>(
            `/api/task/${id}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch task");
    }

    async createTask(data: CreateTaskData): Promise<Task> {
        const response = await this.dbClient.post<ApiResponse<Task>>(
            "/api/task",
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to create task");
    }

    async updateTask(id: number, data: Partial<CreateTaskData>): Promise<Task> {
        const response = await this.dbClient.put<ApiResponse<Task>>(
            `/api/task/${id}`,
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update task");
    }

    async deleteTask(id: number): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/task/${id}`,
        );
        if (!response.data.success) {
            throw new Error(response.data.error || "Failed to delete task");
        }
    }

    async assignTask(taskId: number, assigneeAuthId?: number): Promise<Task> {
        const response = await this.dbClient.post<ApiResponse<Task>>(
            `/api/task/${taskId}/assign`,
            { assigneeAuthId },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to assign task");
    }

    async updateTaskStatus(taskId: number, status: string): Promise<Task> {
        const response = await this.dbClient.put<ApiResponse<Task>>(
            `/api/task/${taskId}/status`,
            { status },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update task status");
    }

    async updateTaskPriority(taskId: number, priority: string): Promise<Task> {
        const response = await this.dbClient.put<ApiResponse<Task>>(
            `/api/task/${taskId}/priority`,
            { priority },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to update task priority",
        );
    }

    async updateTaskDueDate(taskId: number, dueDate?: string): Promise<Task> {
        const response = await this.dbClient.put<ApiResponse<Task>>(
            `/api/task/${taskId}/due-date`,
            { dueDate },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to update task due date",
        );
    }

    async getTasksByStatus(
        status: string,
        filters: Partial<TaskFilters> = {},
    ): Promise<PaginatedResponse<Task>["data"]> {
        const response = await this.dbClient.get<PaginatedResponse<Task>>(
            `/api/task/status/${status}`,
            { params: filters },
        );
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch tasks by status",
        );
    }

    async getTasksByPriority(
        priority: string,
        filters: Partial<TaskFilters> = {},
    ): Promise<PaginatedResponse<Task>["data"]> {
        const response = await this.dbClient.get<PaginatedResponse<Task>>(
            `/api/task/priority/${priority}`,
            { params: filters },
        );
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch tasks by priority",
        );
    }

    async getTasksDueSoon(days = 7, includeOverdue = true): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            `/api/task/due/soon?days=${days}&includeOverdue=${includeOverdue}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch tasks due soon",
        );
    }

    async getOverdueTasks(): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            "/api/task/due/overdue",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch overdue tasks");
    }

    async getTasksDueToday(): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            "/api/task/due/today",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch tasks due today",
        );
    }

    async sendDueDateReminders(): Promise<{
        message: string;
        remindersSent: number;
        tasksDueSoon: number;
    }> {
        const response = await this.dbClient.post<
            ApiResponse<{
                message: string;
                remindersSent: number;
                tasksDueSoon: number;
            }>
        >("/api/task/due/reminders");
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to send due date reminders",
        );
    }

    async getTaskStatistics(): Promise<TaskStatistics> {
        const response = await this.dbClient.get<ApiResponse<TaskStatistics>>(
            "/api/task/statistics/status",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch task statistics",
        );
    }

    async getPriorityStatistics(): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            "/api/task/statistics/priority",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch priority statistics",
        );
    }

    async getDueDateStatistics(): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            "/api/task/statistics/due-dates",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch due date statistics",
        );
    }

    // ============================================================================
    // DB SERVICE METHODS - TASK CATEGORIES & TAGS
    // ============================================================================

    async addCategoryToTask(taskId: number, categoryId: number): Promise<any> {
        const response = await this.dbClient.post<ApiResponse<any>>(
            `/api/task/${taskId}/categories`,
            { categoryId },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to add category to task",
        );
    }

    async removeCategoryFromTask(
        taskId: number,
        categoryId: number,
    ): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/task/${taskId}/categories/${categoryId}`,
        );
        if (!response.data.success) {
            throw new Error(
                response.data.error || "Failed to remove category from task",
            );
        }
    }

    async getTaskCategories(taskId: number): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            `/api/task/${taskId}/categories`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch task categories",
        );
    }

    async addTagToTask(taskId: number, tagId: number): Promise<any> {
        const response = await this.dbClient.post<ApiResponse<any>>(
            `/api/task/${taskId}/tags`,
            { tagId },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to add tag to task");
    }

    async removeTagFromTask(taskId: number, tagId: number): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/task/${taskId}/tags/${tagId}`,
        );
        if (!response.data.success) {
            throw new Error(
                response.data.error || "Failed to remove tag from task",
            );
        }
    }

    async getTaskTags(taskId: number): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            `/api/task/${taskId}/tags`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch task tags");
    }

    async getCategoryTasks(
        categoryId: number,
        filters: Partial<TaskFilters> = {},
    ): Promise<PaginatedResponse<Task>["data"]> {
        const response = await this.dbClient.get<PaginatedResponse<Task>>(
            `/api/task/categories/${categoryId}/tasks`,
            { params: filters },
        );
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch category tasks",
        );
    }

    async getTagTasks(
        tagId: number,
        filters: Partial<TaskFilters> = {},
    ): Promise<PaginatedResponse<Task>["data"]> {
        const response = await this.dbClient.get<PaginatedResponse<Task>>(
            `/api/task/tags/${tagId}/tasks`,
            { params: filters },
        );
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch tag tasks");
    }

    async getPopularTagCombinations(limit = 10): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            `/api/task/tags/combinations/popular?limit=${limit}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch popular tag combinations",
        );
    }

    // ============================================================================
    // DB SERVICE METHODS - PROJECTS (Enhanced)
    // ============================================================================

    async getProjects(
        filters: ProjectFilters = {},
    ): Promise<PaginatedResponse<Project>["data"]> {
        const response = await this.dbClient.get<PaginatedResponse<Project>>(
            "/api/project",
            {
                params: filters,
            },
        );
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch projects");
    }

    async getProject(id: number, includeChats = false): Promise<Project> {
        const response = await this.dbClient.get<ApiResponse<Project>>(
            `/api/project/${id}?includeChats=${includeChats}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch project");
    }

    async createProject(data: CreateProjectData): Promise<Project> {
        const response = await this.dbClient.post<ApiResponse<Project>>(
            "/api/project",
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to create project");
    }

    async updateProject(
        id: number,
        data: Partial<CreateProjectData>,
    ): Promise<Project> {
        const response = await this.dbClient.put<ApiResponse<Project>>(
            `/api/project/${id}`,
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update project");
    }

    async deleteProject(id: number): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/project/${id}`,
        );
        if (!response.data.success) {
            throw new Error(response.data.error || "Failed to delete project");
        }
    }

    async getProjectChatInfo(id: number): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            `/api/project/${id}/chat`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch project chat info",
        );
    }

    async addProjectMember(
        projectId: number,
        memberAuthId: number,
        role = "MEMBER",
    ): Promise<any> {
        const response = await this.dbClient.post<ApiResponse<any>>(
            `/api/project/${projectId}/members`,
            { memberAuthId, role },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to add project member");
    }

    async updateMemberRole(
        projectId: number,
        memberId: number,
        role: string,
    ): Promise<any> {
        const response = await this.dbClient.put<ApiResponse<any>>(
            `/api/project/${projectId}/members/${memberId}/role`,
            { role },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update member role");
    }

    async removeProjectMember(
        projectId: number,
        memberId: number,
    ): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/project/${projectId}/members/${memberId}`,
        );
        if (!response.data.success) {
            throw new Error(
                response.data.error || "Failed to remove project member",
            );
        }
    }

    // ============================================================================
    // DB SERVICE METHODS - CATEGORIES
    // ============================================================================

    async getCategories(filters: any = {}): Promise<Category[]> {
        const response = await this.dbClient.get<PaginatedResponse<Category>>(
            "/api/category",
            { params: { limit: 100, ...filters } },
        );
        if (response.data.success) {
            return response.data.data.categories;
        }
        throw new Error(response.data.error || "Failed to fetch categories");
    }

    async getCategory(id: number): Promise<Category> {
        const response = await this.dbClient.get<ApiResponse<Category>>(
            `/api/category/${id}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch category");
    }

    async createCategory(data: CreateCategoryData): Promise<Category> {
        const response = await this.dbClient.post<ApiResponse<Category>>(
            "/api/category",
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to create category");
    }

    async updateCategory(
        id: number,
        data: Partial<CreateCategoryData>,
    ): Promise<Category> {
        const response = await this.dbClient.put<ApiResponse<Category>>(
            `/api/category/${id}`,
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update category");
    }

    async deleteCategory(id: number): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/category/${id}`,
        );
        if (!response.data.success) {
            throw new Error(response.data.error || "Failed to delete category");
        }
    }

    async getCategoryStatistics(): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            "/api/category/stats",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch category statistics",
        );
    }

    // ============================================================================
    // DB SERVICE METHODS - TAGS
    // ============================================================================

    async getTags(filters: any = {}): Promise<Tag[]> {
        const response = await this.dbClient.get<PaginatedResponse<Tag>>(
            "/api/tag",
            { params: { limit: 100, ...filters } },
        );
        if (response.data.success) {
            return response.data.data.tags;
        }
        throw new Error(response.data.error || "Failed to fetch tags");
    }

    async getTag(id: number): Promise<Tag> {
        const response = await this.dbClient.get<ApiResponse<Tag>>(
            `/api/tag/${id}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch tag");
    }

    async createTag(data: CreateTagData): Promise<Tag> {
        const response = await this.dbClient.post<ApiResponse<Tag>>(
            "/api/tag",
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to create tag");
    }

    async updateTag(id: number, data: Partial<CreateTagData>): Promise<Tag> {
        const response = await this.dbClient.put<ApiResponse<Tag>>(
            `/api/tag/${id}`,
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update tag");
    }

    async deleteTag(id: number): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/tag/${id}`,
        );
        if (!response.data.success) {
            throw new Error(response.data.error || "Failed to delete tag");
        }
    }

    async getTagStatistics(): Promise<any> {
        const response =
            await this.dbClient.get<ApiResponse<any>>("/api/tag/stats");
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch tag statistics",
        );
    }

    async getPopularTags(limit = 10): Promise<Tag[]> {
        const response = await this.dbClient.get<ApiResponse<Tag[]>>(
            `/api/tag/popular?limit=${limit}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch popular tags");
    }

    // ============================================================================
    // DB SERVICE METHODS - NOTIFICATIONS
    // ============================================================================

    async getNotifications(filters: any = {}): Promise<Notification[]> {
        const response = await this.dbClient.get<
            PaginatedResponse<Notification>
        >("/api/notification", { params: { limit: 50, ...filters } });
        if (response.data.success) {
            return response.data.data.notifications;
        }
        throw new Error(response.data.error || "Failed to fetch notifications");
    }

    async getNotification(id: number): Promise<Notification> {
        const response = await this.dbClient.get<ApiResponse<Notification>>(
            `/api/notification/${id}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch notification");
    }

    async markNotificationAsRead(id: number): Promise<void> {
        const response = await this.dbClient.put<ApiResponse>(
            `/api/notification/${id}/read`,
        );
        if (!response.data.success) {
            throw new Error(
                response.data.error || "Failed to mark notification as read",
            );
        }
    }

    async markAllNotificationsAsRead(): Promise<void> {
        const response = await this.dbClient.put<ApiResponse>(
            "/api/notification/read/all",
        );
        if (!response.data.success) {
            throw new Error(
                response.data.error ||
                    "Failed to mark all notifications as read",
            );
        }
    }

    async deleteNotification(id: number): Promise<void> {
        const response = await this.dbClient.delete<ApiResponse>(
            `/api/notification/${id}`,
        );
        if (!response.data.success) {
            throw new Error(
                response.data.error || "Failed to delete notification",
            );
        }
    }

    async deleteAllReadNotifications(): Promise<{ message: string }> {
        const response = await this.dbClient.delete<
            ApiResponse<{ message: string }>
        >("/api/notification/read/all");
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to delete read notifications",
        );
    }

    async getNotificationStatistics(): Promise<any> {
        const response = await this.dbClient.get<ApiResponse<any>>(
            "/api/notification/stats",
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch notification statistics",
        );
    }

    // ============================================================================
    // DB SERVICE METHODS - EXPORT
    // ============================================================================

    async getExportInfo(): Promise<any> {
        const response =
            await this.dbClient.get<ApiResponse<any>>("/api/export/info");
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch export info");
    }

    async exportTasksCSV(options: ExportOptions = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });

        const response = await this.dbClient.get(
            `/api/export/tasks/csv?${params.toString()}`,
            { responseType: "blob" },
        );
        return response.data;
    }

    async exportTasksJSON(options: ExportOptions = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });

        const response = await this.dbClient.get(
            `/api/export/tasks/json?${params.toString()}`,
            { responseType: "blob" },
        );
        return response.data;
    }

    async exportProjectsCSV(options: ExportOptions = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });

        const response = await this.dbClient.get(
            `/api/export/projects/csv?${params.toString()}`,
            { responseType: "blob" },
        );
        return response.data;
    }

    async exportProjectsJSON(options: ExportOptions = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });

        const response = await this.dbClient.get(
            `/api/export/projects/json?${params.toString()}`,
            { responseType: "blob" },
        );
        return response.data;
    }

    async exportUserDataBackup(): Promise<Blob> {
        const response = await this.dbClient.get("/api/export/backup", {
            responseType: "blob",
        });
        return response.data;
    }

    // ============================================================================
    // CHAT SERVICE METHODS
    // ============================================================================

    async getChats(projectId?: number, filters: any = {}): Promise<Chat[]> {
        const params = projectId ? { projectId, ...filters } : filters;
        const response = await this.chatClient.get<PaginatedResponse<Chat>>(
            "/api/chats",
            {
                params,
            },
        );
        if (response.data.success) {
            return response.data.data.chats;
        }
        throw new Error(response.data.error || "Failed to fetch chats");
    }

    async getProjectChats(
        projectId: number,
        filters: any = {},
    ): Promise<Chat[]> {
        const response = await this.chatClient.get<PaginatedResponse<Chat>>(
            `/api/chats/project/${projectId}`,
            { params: filters },
        );
        if (response.data.success) {
            return response.data.data.chats;
        }
        throw new Error(response.data.error || "Failed to fetch project chats");
    }

    async getOrCreateDefaultProjectChat(
        projectId: number,
    ): Promise<{ chat: Chat; isNewlyCreated: boolean }> {
        const response = await this.chatClient.get<
            ApiResponse<{ chat: Chat; isNewlyCreated: boolean }>
        >(`/api/chats/project/${projectId}/default`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error ||
                "Failed to get or create default project chat",
        );
    }

    async getChat(id: string): Promise<Chat> {
        const response = await this.chatClient.get<ApiResponse<Chat>>(
            `/api/chats/${id}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch chat");
    }

    async createChat(data: CreateChatData): Promise<Chat> {
        const response = await this.chatClient.post<ApiResponse<Chat>>(
            "/api/chats",
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to create chat");
    }

    async updateChat(id: string, data: Partial<CreateChatData>): Promise<Chat> {
        const response = await this.chatClient.put<ApiResponse<Chat>>(
            `/api/chats/${id}`,
            data,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update chat");
    }

    async deleteChat(id: string): Promise<void> {
        const response = await this.chatClient.delete<ApiResponse>(
            `/api/chats/${id}`,
        );
        if (!response.data.success) {
            throw new Error(response.data.error || "Failed to delete chat");
        }
    }

    async getChatStatistics(): Promise<ChatStatistics> {
        const response =
            await this.chatClient.get<ApiResponse<ChatStatistics>>(
                "/api/chats/stats",
            );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(
            response.data.error || "Failed to fetch chat statistics",
        );
    }

    async getChatMessages(
        chatId: string,
        filters: any = {},
    ): Promise<{
        messages: Message[];
        pagination: any;
        chatInfo: any;
        filters: any;
    }> {
        const response = await this.chatClient.get<
            ApiResponse<{
                messages: Message[];
                pagination: any;
                chatInfo: any;
                filters: any;
            }>
        >(`/api/messages/chat/${chatId}`, {
            params: { page: 1, limit: 50, sortOrder: "desc", ...filters },
        });
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch messages");
    }

    async exportChatMessages(chatId: string, options: any = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });

        const response = await this.chatClient.get(
            `/api/messages/chat/${chatId}/export?${params.toString()}`,
            { responseType: "blob" },
        );
        return response.data;
    }

    async searchMessagesInChat(
        chatId: string,
        query: string,
        filters: any = {},
    ): Promise<{
        messages: MessageSearchResult[];
        searchQuery: string;
        pagination: any;
    }> {
        const response = await this.chatClient.get<
            ApiResponse<{
                messages: MessageSearchResult[];
                searchQuery: string;
                pagination: any;
            }>
        >(`/api/messages/chat/${chatId}/search`, {
            params: { query, ...filters },
        });
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to search messages");
    }

    async sendMessageAPI(
        chatId: string,
        content: string,
        messageType = "text",
        metadata = {},
    ): Promise<Message> {
        const response = await this.chatClient.post<ApiResponse<Message>>(
            `/api/messages/chat/${chatId}`,
            { content, messageType, metadata },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to send message");
    }

    async getMessage(messageId: string): Promise<Message> {
        const response = await this.chatClient.get<ApiResponse<Message>>(
            `/api/messages/${messageId}`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch message");
    }

    async updateMessage(messageId: string, content: string): Promise<Message> {
        const response = await this.chatClient.put<ApiResponse<Message>>(
            `/api/messages/${messageId}`,
            { content },
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to update message");
    }

    async deleteMessage(messageId: string): Promise<void> {
        const response = await this.chatClient.delete<ApiResponse>(
            `/api/messages/${messageId}`,
        );
        if (!response.data.success) {
            throw new Error(response.data.error || "Failed to delete message");
        }
    }

    async getSocketInfo(): Promise<any> {
        const response =
            await this.chatClient.get<ApiResponse<any>>("/socket/info");
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch socket info");
    }
}

export const apiClient = new ApiClient();
