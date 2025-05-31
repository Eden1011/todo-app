const axios = require("axios");

const CHAT_SERVICE_URL =
    process.env.CHAT_SERVICE_URL || "http://localhost:5000";

/**
 * Create default chat when a project is created
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} - Chat creation result
 */
async function createProjectChat(projectData) {
    try {
        const { id, name, description, ownerId, members } = projectData;

        if (!id || !name || !ownerId) {
            throw new Error("Project ID, name, and owner ID are required");
        }

        // Prepare chat data
        const chatData = {
            projectId: id,
            projectName: name,
            projectDescription: description,
            ownerId: ownerId,
            members: members || [],
        };

        console.log(`Creating chat for project ${id} (${name})`);

        const response = await axios.post(
            `${CHAT_SERVICE_URL}/api/chats/auto-create`,
            chatData,
            {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 10000, // 10 seconds timeout
            },
        );

        if (response.data.success) {
            console.log(`Chat created successfully for project ${id}`);
            return {
                success: true,
                chatId: response.data.data.chat.id,
                chatName: response.data.data.chat.name,
                message: response.data.message,
            };
        } else {
            throw new Error(response.data.error || "Failed to create chat");
        }
    } catch (error) {
        console.error(
            `Failed to create chat for project ${projectData.id}:`,
            error.message,
        );

        // Don't throw error - chat creation failure shouldn't break project creation
        return {
            success: false,
            error: error.message,
            message: "Project created but chat creation failed",
        };
    }
}

/**
 * Update project chat when project is updated
 * @param {Object} projectData - Updated project data
 * @returns {Promise<Object>} - Update result
 */
async function updateProjectChat(projectData) {
    try {
        const { id, name, description } = projectData;

        if (!id) {
            throw new Error("Project ID is required");
        }

        // Note: We don't have a direct update endpoint for project chats yet
        // This could be implemented if needed
        console.log(`Project ${id} updated - chat update not implemented yet`);

        return {
            success: true,
            message: "Project updated - chat update not implemented",
        };
    } catch (error) {
        console.error(
            `Failed to update chat for project ${projectData.id}:`,
            error.message,
        );
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Deactivate project chat when project is deleted
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} - Deactivation result
 */
async function deactivateProjectChat(projectId) {
    try {
        if (!projectId) {
            throw new Error("Project ID is required");
        }

        // Note: We don't have a direct deactivation endpoint for project chats yet
        // This could be implemented if needed
        console.log(
            `Project ${projectId} deleted - chat deactivation not implemented yet`,
        );

        return {
            success: true,
            message: "Project deleted - chat deactivation not implemented",
        };
    } catch (error) {
        console.error(
            `Failed to deactivate chat for project ${projectId}:`,
            error.message,
        );
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Check if chat-service is available
 * @returns {Promise<boolean>} - True if chat-service is available
 */
async function isChatServiceAvailable() {
    try {
        const response = await axios.get(`${CHAT_SERVICE_URL}/health`, {
            timeout: 3000,
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

/**
 * Get chat-service health status
 * @returns {Promise<Object>} - Health status information
 */
async function getChatServiceHealth() {
    try {
        const response = await axios.get(`${CHAT_SERVICE_URL}/health`, {
            timeout: 3000,
        });
        return {
            available: true,
            status: response.data,
            url: CHAT_SERVICE_URL,
        };
    } catch (error) {
        return {
            available: false,
            error: error.message,
            url: CHAT_SERVICE_URL,
        };
    }
}

/**
 * Get project chats (for integration purposes)
 * @param {number} projectId - Project ID
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Array>} - Array of chats for the project
 */
async function getProjectChats(projectId, token) {
    try {
        const response = await axios.get(
            `${CHAT_SERVICE_URL}/api/chats/project/${projectId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            },
        );

        if (response.data.success) {
            return response.data.data.chats || [];
        } else {
            throw new Error("Failed to fetch project chats");
        }
    } catch (error) {
        console.error("Error fetching project chats:", error.message);
        return [];
    }
}

/**
 * Get or create default chat for a project
 * @param {number} projectId - Project ID
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} - Default chat for the project
 */
async function getOrCreateDefaultChat(projectId, token) {
    try {
        const response = await axios.get(
            `${CHAT_SERVICE_URL}/api/chats/project/${projectId}/default`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            },
        );

        if (response.data.success) {
            return response.data.data.chat;
        } else {
            throw new Error("Failed to get or create default chat");
        }
    } catch (error) {
        console.error("Error getting/creating default chat:", error.message);
        throw new Error(`Failed to get project chat: ${error.message}`);
    }
}

module.exports = {
    createProjectChat,
    updateProjectChat,
    deactivateProjectChat,
    isChatServiceAvailable,
    getChatServiceHealth,
    getProjectChats,
    getOrCreateDefaultChat,
    CHAT_SERVICE_URL,
};
