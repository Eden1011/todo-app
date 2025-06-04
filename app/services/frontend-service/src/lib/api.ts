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

class ApiClient {
    private authClient: AxiosInstance;
    private dbClient: AxiosInstance;
    private chatClient: AxiosInstance;

    constructor() {
        // Auth service client
        this.authClient = axios.create({
            baseURL:
                process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ||
                "http://localhost:3000",
            timeout: 10000,
        });

        // DB service client
        this.dbClient = axios.create({
            baseURL:
                process.env.NEXT_PUBLIC_DB_SERVICE_URL ||
                "http://localhost:4000",
            timeout: 10000,
        });

        // Chat service client
        this.chatClient = axios.create({
            baseURL:
                process.env.NEXT_PUBLIC_CHAT_SERVICE_URL ||
                "http://localhost:5000",
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

    // Auth methods
    async login(credentials: LoginCredentials): Promise<AuthTokens> {
        const response = await this.authClient.post<ApiResponse<AuthTokens>>(
            "/local/user/login",
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
        >("/local/user/register", credentials);

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
            "/local/token/verify",
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

    logout(): void {
        const refreshToken = Cookies.get("refreshToken");

        // Clear cookies
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");

        // Call logout endpoint if refresh token exists
        if (refreshToken) {
            this.authClient
                .delete("/local/user/logout", {
                    data: { token: refreshToken },
                })
                .catch(console.error);
        }
    }

    // User profile methods
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

    // Task methods
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

    // Project methods
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

    async getProject(id: number): Promise<Project> {
        const response = await this.dbClient.get<ApiResponse<Project>>(
            `/api/project/${id}?includeChats=true`,
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

    // Category methods
    async getCategories(): Promise<Category[]> {
        const response = await this.dbClient.get<PaginatedResponse<Category>>(
            "/api/category?limit=100",
        );
        if (response.data.success) {
            return response.data.data.categories;
        }
        throw new Error(response.data.error || "Failed to fetch categories");
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

    // Tag methods
    async getTags(): Promise<Tag[]> {
        const response =
            await this.dbClient.get<PaginatedResponse<Tag>>(
                "/api/tag?limit=100",
            );
        if (response.data.success) {
            return response.data.data.tags;
        }
        throw new Error(response.data.error || "Failed to fetch tags");
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

    // Chat methods
    async getChats(projectId?: number): Promise<Chat[]> {
        const params = projectId ? { projectId } : {};
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

    async getProjectChats(projectId: number): Promise<Chat[]> {
        const response = await this.chatClient.get<PaginatedResponse<Chat>>(
            `/api/chats/project/${projectId}`,
        );
        if (response.data.success) {
            return response.data.data.chats;
        }
        throw new Error(response.data.error || "Failed to fetch project chats");
    }

    async getChatMessages(
        chatId: string,
        page = 1,
        limit = 50,
    ): Promise<{ messages: Message[]; pagination: any }> {
        const response = await this.chatClient.get<
            ApiResponse<{ messages: Message[]; pagination: any }>
        >(
            `/api/messages/chat/${chatId}?page=${page}&limit=${limit}&sortOrder=desc`,
        );
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.error || "Failed to fetch messages");
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

    // Notification methods
    async getNotifications(): Promise<Notification[]> {
        const response = await this.dbClient.get<
            PaginatedResponse<Notification>
        >("/api/notification?limit=50");
        if (response.data.success) {
            return response.data.data.notifications;
        }
        throw new Error(response.data.error || "Failed to fetch notifications");
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
}

export const apiClient = new ApiClient();
