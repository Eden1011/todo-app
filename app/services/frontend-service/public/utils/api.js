const API = {
    // Base URLs for services
    AUTH_BASE: "http://localhost:3000",
    DB_BASE: "http://localhost:4000",
    CHAT_BASE: "http://localhost:5000",

    // Helper function to make requests with auth headers
    async request(url, options = {}) {
        const token = AuthUtils.getToken(); // Assumes AuthUtils is available globally or imported
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let errorData = {
                error: `HTTP ${response.status} ${response.statusText || "Error"}`,
                details: [],
            };
            try {
                errorData = await response.json();
            } catch (e) {
                // If response is not JSON, use the text or a generic error
                try {
                    const errorText = await response.text();
                    errorData.error = errorText || errorData.error;
                } catch (textErr) {
                    // Fallback if text() also fails
                }
            }

            console.error("API Error Data from server:", errorData); // Log the full error data

            const err = new Error(
                errorData.error || `HTTP error ${response.status}`,
            );
            err.details = errorData.details || []; // Attach details array
            err.status = response.status; // Attach status code
            throw err;
        }

        // Handle cases where response might be empty (e.g., 204 No Content)
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    },

    // Auth Service APIs
    async register(userData) {
        return await this.request(`${this.AUTH_BASE}/local/user/register`, {
            method: "POST",
            body: JSON.stringify(userData),
        });
    },

    async login(credentials) {
        return await this.request(`${this.AUTH_BASE}/local/user/login`, {
            method: "POST",
            body: JSON.stringify(credentials),
        });
    },

    async verifyToken() {
        const response = await this.request(
            `${this.AUTH_BASE}/local/token/verify`,
            {
                method: "POST",
            },
        );
        return response.data.user; // Assuming verifyToken response structure
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }

        return await this.request(`${this.AUTH_BASE}/local/token/token`, {
            method: "POST",
            body: JSON.stringify({ token: refreshToken }),
        });
    },

    async logout() {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
            // Logout might not return JSON, handle gracefully
            try {
                await this.request(`${this.AUTH_BASE}/local/user/logout`, {
                    method: "DELETE",
                    body: JSON.stringify({ token: refreshToken }),
                });
            } catch (error) {
                // If it's a 204 or similar, it might throw due to no JSON body.
                // Consider how your logout endpoint responds.
                if (error.status !== 204) {
                    throw error;
                }
            }
        }
    },

    // DB Service APIs - User
    async getUserProfile() {
        return await this.request(`${this.DB_BASE}/api/user/profile`);
    },

    async getUserActivity() {
        return await this.request(`${this.DB_BASE}/api/user/activity`);
    },

    // DB Service APIs - Tasks
    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`${this.DB_BASE}/api/task?${queryString}`);
    },

    async getTaskById(id) {
        return await this.request(`${this.DB_BASE}/api/task/${id}`);
    },

    async createTask(taskData) {
        return await this.request(`${this.DB_BASE}/api/task`, {
            method: "POST",
            body: JSON.stringify(taskData),
        });
    },

    async updateTask(id, taskData) {
        return await this.request(`${this.DB_BASE}/api/task/${id}`, {
            method: "PUT",
            body: JSON.stringify(taskData),
        });
    },

    async deleteTask(id) {
        // DELETE might return 204 No Content
        try {
            return await this.request(`${this.DB_BASE}/api/task/${id}`, {
                method: "DELETE",
            });
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                // Some DELETE might return 200 with a message
                throw error;
            }
            return null; // Or a success object like { success: true } if needed
        }
    },

    async updateTaskStatus(taskId, status) {
        return await this.request(`${this.DB_BASE}/api/task/${taskId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
    },

    async updateTaskPriority(taskId, priority) {
        return await this.request(
            `${this.DB_BASE}/api/task/${taskId}/priority`,
            {
                method: "PUT",
                body: JSON.stringify({ priority }),
            },
        );
    },

    async getTasksDueSoon() {
        return await this.request(`${this.DB_BASE}/api/task/due/soon`);
    },

    async getTasksOverdue() {
        return await this.request(`${this.DB_BASE}/api/task/due/overdue`);
    },

    async getStatusStatistics() {
        return await this.request(`${this.DB_BASE}/api/task/statistics/status`);
    },

    async getPriorityStatistics() {
        return await this.request(
            `${this.DB_BASE}/api/task/statistics/priority`,
        );
    },

    // DB Service APIs - Projects
    async getProjects(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`${this.DB_BASE}/api/project?${queryString}`);
    },

    async getProjectById(id) {
        return await this.request(`${this.DB_BASE}/api/project/${id}`);
    },

    async createProject(projectData) {
        return await this.request(`${this.DB_BASE}/api/project`, {
            method: "POST",
            body: JSON.stringify(projectData),
        });
    },

    async updateProject(id, projectData) {
        return await this.request(`${this.DB_BASE}/api/project/${id}`, {
            method: "PUT",
            body: JSON.stringify(projectData),
        });
    },

    async deleteProject(id) {
        // DELETE might return 204 No Content
        try {
            return await this.request(`${this.DB_BASE}/api/project/${id}`, {
                method: "DELETE",
            });
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                throw error;
            }
            return null;
        }
    },

    async addProjectMember(projectId, memberData) {
        return await this.request(
            `${this.DB_BASE}/api/project/${projectId}/members`,
            {
                method: "POST",
                body: JSON.stringify(memberData),
            },
        );
    },

    async removeProjectMember(projectId, memberId) {
        try {
            return await this.request(
                `${this.DB_BASE}/api/project/${projectId}/members/${memberId}`,
                {
                    method: "DELETE",
                },
            );
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                throw error;
            }
            return null;
        }
    },

    async getProjectChatInfo(id) {
        return await this.request(`${this.DB_BASE}/api/project/${id}/chat`);
    },

    // DB Service APIs - Categories
    async getCategories() {
        return await this.request(`${this.DB_BASE}/api/category`);
    },

    async createCategory(categoryData) {
        return await this.request(`${this.DB_BASE}/api/category`, {
            method: "POST",
            body: JSON.stringify(categoryData),
        });
    },

    async deleteCategory(id) {
        try {
            return await this.request(`${this.DB_BASE}/api/category/${id}`, {
                method: "DELETE",
            });
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                throw error;
            }
            return null;
        }
    },

    // DB Service APIs - Tags
    async getTags() {
        return await this.request(`${this.DB_BASE}/api/tag`);
    },

    async createTag(tagData) {
        return await this.request(`${this.DB_BASE}/api/tag`, {
            method: "POST",
            body: JSON.stringify(tagData),
        });
    },

    async deleteTag(id) {
        try {
            return await this.request(`${this.DB_BASE}/api/tag/${id}`, {
                method: "DELETE",
            });
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                throw error;
            }
            return null;
        }
    },

    // DB Service APIs - Notifications
    async getNotifications(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(
            `${this.DB_BASE}/api/notification?${queryString}`,
        );
    },

    async markNotificationAsRead(id) {
        return await this.request(
            `${this.DB_BASE}/api/notification/${id}/read`,
            {
                method: "PUT",
            },
        );
    },

    async markAllNotificationsAsRead() {
        return await this.request(`${this.DB_BASE}/api/notification/read/all`, {
            method: "PUT",
        });
    },

    async deleteNotification(id) {
        try {
            return await this.request(
                `${this.DB_BASE}/api/notification/${id}`,
                {
                    method: "DELETE",
                },
            );
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                throw error;
            }
            return null;
        }
    },

    // Chat Service APIs
    async getChats(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`${this.CHAT_BASE}/api/chats?${queryString}`);
    },

    async getChatById(id) {
        return await this.request(`${this.CHAT_BASE}/api/chats/${id}`);
    },

    async getProjectChats(projectId) {
        return await this.request(
            `${this.CHAT_BASE}/api/chats/project/${projectId}`,
        );
    },

    async getOrCreateProjectChat(projectId) {
        return await this.request(
            `${this.CHAT_BASE}/api/chats/project/${projectId}/default`,
        );
    },

    async createChat(chatData) {
        return await this.request(`${this.CHAT_BASE}/api/chats`, {
            method: "POST",
            body: JSON.stringify(chatData),
        });
    },

    async getChatMessages(chatId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(
            `${this.CHAT_BASE}/api/messages/chat/${chatId}?${queryString}`,
        );
    },

    async sendMessage(chatId, messageData) {
        return await this.request(
            `${this.CHAT_BASE}/api/messages/chat/${chatId}`,
            {
                method: "POST",
                body: JSON.stringify(messageData),
            },
        );
    },

    async updateMessage(messageId, content) {
        return await this.request(
            `${this.CHAT_BASE}/api/messages/${messageId}`,
            {
                method: "PUT",
                body: JSON.stringify({ content }),
            },
        );
    },

    async deleteMessage(messageId) {
        try {
            return await this.request(
                `${this.CHAT_BASE}/api/messages/${messageId}`,
                {
                    method: "DELETE",
                },
            );
        } catch (error) {
            if (error.status !== 204 && error.status !== 200) {
                throw error;
            }
            return null;
        }
    },

    async searchMessages(chatId, query) {
        return await this.request(
            `${this.CHAT_BASE}/api/messages/chat/${chatId}/search?query=${encodeURIComponent(query)}`,
        );
    },
};
