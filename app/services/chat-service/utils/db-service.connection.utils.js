const axios = require("axios");

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || "http://localhost:4000";

/**
 * Get user's projects from db-service
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Array>} - Array of projects user is member of
 */
async function getUserProjects(token) {
    try {
        const response = await axios.get(`${DB_SERVICE_URL}/api/project`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            timeout: 5000,
        });

        if (response.data.success) {
            return response.data.data.projects || [];
        } else {
            throw new Error("Failed to fetch projects");
        }
    } catch (error) {
        console.error("Error fetching user projects:", error.message);
        throw new Error(`Failed to fetch projects: ${error.message}`);
    }
}

/**
 * Get specific project details from db-service
 * @param {number} projectId - Project ID
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} - Project details
 */
async function getProjectById(projectId, token) {
    try {
        const response = await axios.get(
            `${DB_SERVICE_URL}/api/project/${projectId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            },
        );

        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error("Project not found");
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error("Project not found");
        }
        console.error("Error fetching project:", error.message);
        throw new Error(`Failed to fetch project: ${error.message}`);
    }
}

/**
 * Check if user is member of a project
 * @param {number} userId - User's auth ID
 * @param {number} projectId - Project ID
 * @param {string} token - JWT token for authentication
 * @returns {Promise<boolean>} - True if user is member
 */
async function isProjectMember(userId, projectId, token) {
    try {
        const project = await getProjectById(projectId, token);

        // Check if user is owner
        if (project.owner && project.owner.authId === userId) {
            return true;
        }

        // Check if user is in members list
        if (project.members && Array.isArray(project.members)) {
            return project.members.some(
                (member) => member.user && member.user.authId === userId,
            );
        }

        return false;
    } catch (error) {
        console.error("Error checking project membership:", error.message);
        return false;
    }
}

/**
 * Get project members
 * @param {number} projectId - Project ID
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Array>} - Array of project members
 */
async function getProjectMembers(projectId, token) {
    try {
        const project = await getProjectById(projectId, token);
        return project.members || [];
    } catch (error) {
        console.error("Error fetching project members:", error.message);
        throw new Error(`Failed to fetch project members: ${error.message}`);
    }
}

/**
 * Check if db-service is available
 * @returns {Promise<boolean>} - True if db-service is available
 */
async function isDbServiceAvailable() {
    try {
        const response = await axios.get(`${DB_SERVICE_URL}/health`, {
            timeout: 3000,
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

module.exports = {
    getUserProjects,
    getProjectById,
    isProjectMember,
    getProjectMembers,
    isDbServiceAvailable,
    DB_SERVICE_URL,
};
