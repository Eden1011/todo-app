# How to run?

```text
minikube start

minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable storage-provisioner

eval $(minikube -p minikube docker-env)

cd services/auth-service
docker build -t auth-service:latest .

cd ../db-service
docker build -t db-service:latest .

cd ../chat-service
docker build -t chat-service:latest .

cd ../frontend-service
docker build -t frontend-service:latest .

cd ../..

kubectl apply -f k8s/todo-app-k8s.yaml

kubectl get pods

kubectl port-forward service/auth-service 3000:3000 &
kubectl port-forward service/db-service 4000:4000 &
kubectl port-forward service/chat-service 5000:5000 &
kubectl port-forward service/frontend-service 3001:3001 &

```

# Todo App Microservices API Documentation

## Overview

This document provides comprehensive API documentation for the Todo App microservices architecture consisting of three main services:

1. **Auth Service** (Port 3000) - Authentication, authorization, and user management
2. **DB Service** (Port 4000) - Task management, projects, categories, tags, and notifications
3. **Chat Service** (Port 5000) - Real-time chat functionality for project collaboration

## Authentication Flow

All services except auth-service require JWT tokens in the `Authorization: Bearer <token>` header. The auth-service provides these tokens.

---

# AUTH SERVICE (Port 3000)

## Base URL: `http://localhost:3000`

### Health Check

- **GET** `/health`
- **Description**: Service health status
- **Response**: `{ status: "ok", timestamp: "...", service: "auth-service", version: "1.0.0" }`

---

## User Management Endpoints

### Register User

- **POST** `/local/user/register`
- **Rate Limit**: 5 requests per 15 minutes
- **Body**:
    ```json
    {
        "username": "string (3-20 chars, alphanumeric)",
        "email": "string (valid email)",
        "password": "string (min 8 chars, must contain uppercase, lowercase, number, special char)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "user": {
                "id": 1,
                "username": "...",
                "email": "...",
                "isVerified": false
            },
            "message": "Registration successful. Please check your email for verification instructions.",
            "accessToken": "string (if AUTO_LOGIN_AFTER_REGISTER=true)",
            "refreshToken": "string (if AUTO_LOGIN_AFTER_REGISTER=true)",
            "autoLogin": true
        }
    }
    ```

### Login User

- **POST** `/local/user/login`
- **Rate Limit**: 10 requests per 10 minutes
- **Body**:
    ```json
    {
        "username": "string (optional)",
        "email": "string (optional)",
        "password": "string (required)"
    }
    ```
- **Note**: Either username OR email must be provided
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "accessToken": "string (expires in 15min)",
            "refreshToken": "string (expires in 7d)"
        }
    }
    ```

### Change Password

- **POST** `/local/user/change-password`
- **Body**:
    ```json
    {
        "token": "string (refresh token)",
        "username": "string (optional)",
        "email": "string (optional)",
        "oldPassword": "string",
        "newPassword": "string (same validation as register)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "Password changed successfully" }
    }
    ```

### Logout User

- **DELETE** `/local/user/logout`
- **Body**:
    ```json
    {
        "token": "string (refresh token)"
    }
    ```
- **Response**: `204 No Content`

### Remove User Account

- **DELETE** `/local/user/remove-user`
- **Body**:
    ```json
    {
        "token": "string (refresh token)",
        "username": "string (optional)",
        "email": "string (optional)",
        "password": "string"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "User account deleted successfully" }
    }
    ```

---

## Email Verification Endpoints

### Verify Email

- **GET** `/local/email/verify-email?token=<verification_token>`
- **Query Parameters**:
    - `token`: Email verification token (required)
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "Email verified successfully" }
    }
    ```

### Resend Verification Email

- **POST** `/local/email/resend-verification`
- **Rate Limit**: 3 requests per 1 minute
- **Body**:
    ```json
    {
        "email": "string (valid email)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "Verification email sent" }
    }
    ```

---

## Token Management Endpoints

### Refresh Access Token

- **POST** `/local/token/token`
- **Body**:
    ```json
    {
        "token": "string (refresh token)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "accessToken": "string (new access token)"
        }
    }
    ```

### Verify Token

- **POST** `/local/token/verify`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "valid": true,
            "user": { "id": 1 }
        }
    }
    ```

---

## Google OAuth Endpoints

### Initiate Google OAuth

- **GET** `/oauth/google`
- **Description**: Redirects to Google OAuth consent screen
- **Response**: Redirect to Google

### Google OAuth Callback

- **GET** `/oauth/google/callback`
- **Description**: Handles Google OAuth callback
- **Response**: Redirect to `/test/login#access_token=...&refresh_token=...`

### OAuth Login Failed

- **GET** `/oauth/login-failed`
- **Response**:
    ```json
    {
        "success": false,
        "error": "Login using Google failed"
    }
    ```

---

## Development Endpoints (NODE_ENV=development)

### Test Interface

- **GET** `/test/login`
- **Description**: Returns HTML test interface for authentication testing

---

# DB SERVICE (Port 4000)

## Base URL: `http://localhost:4000`

## Authentication: All endpoints require `Authorization: Bearer <access_token>`

### Health Check

- **GET** `/health`
- **Description**: Service health status
- **Response**: `{ status: "ok", timestamp: "...", service: "db-service", version: "1.0.0" }`

---

## User Profile Endpoints

### Get User Profile

- **GET** `/api/user/profile`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "user": {
                "id": 1,
                "authId": 123,
                "createdAt": "...",
                "updatedAt": "..."
            },
            "statistics": {
                "ownedTasks": 15,
                "assignedTasks": 8,
                "projects": 3,
                "categories": 5,
                "tags": 12,
                "tasksByStatus": { "TODO": 5, "IN_PROGRESS": 3, "DONE": 7 }
            }
        }
    }
    ```

### Get User Activity

- **GET** `/api/user/activity?limit=10`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `limit`: Number of items to return (optional, default: 10)
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "recentTasks": [...],
        "recentProjects": [...]
      }
    }
    ```

### Search Users

- **GET** `/api/user/search?query=john`
- **Rate Limit**: 30 requests per 1 minute
- **Query Parameters**:
    - `query`: Search term (required, min 2 chars)
- **Response**:
    ```json
    {
        "success": true,
        "data": [{ "id": 1, "authId": 123, "createdAt": "..." }]
    }
    ```

### Delete User Account

- **DELETE** `/api/user`
- **Rate Limit**: 20 requests per 10 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "message": "User account and all associated data deleted successfully"
        }
    }
    ```

---

## Task Management Endpoints

### Create Task

- **POST** `/api/task`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**:
    ```json
    {
        "title": "string (1-200 chars, required)",
        "description": "string (max 1000 chars, optional)",
        "priority": "LOW|MEDIUM|HIGH|URGENT (optional, default: MEDIUM)",
        "status": "TODO|IN_PROGRESS|REVIEW|DONE|CANCELED (optional, default: TODO)",
        "dueDate": "ISO8601 date string (optional)",
        "assigneeAuthId": "number (optional)",
        "projectId": "number (optional)",
        "categoryIds": "[1, 2, 3] (optional)",
        "tagIds": "[1, 2, 3] (optional)"
    }
    ```
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "title": "...",
        "description": "...",
        "priority": "MEDIUM",
        "status": "TODO",
        "dueDate": null,
        "createdAt": "...",
        "updatedAt": "...",
        "owner": { "id": 1, "authId": 123 },
        "assignee": null,
        "project": null,
        "categories": [...],
        "tags": [...]
      }
    }
    ```

### Get Tasks

- **GET** `/api/task?page=1&limit=20&status=TODO&priority=HIGH&projectId=1&assignedToMe=true&search=test&sortBy=dueDate&sortOrder=asc&categoryId=1&tagId=2&dueDateFrom=2024-01-01&dueDateTo=2024-12-31`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 20, max: 100)
    - `status`: Filter by status (optional)
    - `priority`: Filter by priority (optional)
    - `projectId`: Filter by project (optional)
    - `assignedToMe`: Show only assigned tasks (optional, boolean)
    - `search`: Search in title/description (optional, 2-100 chars)
    - `sortBy`: Sort field (optional, default: updatedAt)
    - `sortOrder`: Sort direction (optional, default: desc)
    - `categoryId`: Filter by category (optional)
    - `tagId`: Filter by tag (optional)
    - `dueDateFrom`: Filter by due date range (optional)
    - `dueDateTo`: Filter by due date range (optional)
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "tasks": [...],
        "pagination": {
          "page": 1,
          "limit": 20,
          "total": 100,
          "totalPages": 5
        }
      }
    }
    ```

### Get Task by ID

- **GET** `/api/task/{id}`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Same as Create Task response

### Update Task

- **PUT** `/api/task/{id}`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**: Same as Create Task (all fields optional)
- **Note**: Only owner can modify priority, project, assignee. Owner and assignee can modify status.
- **Response**: Same as Create Task response

### Delete Task

- **DELETE** `/api/task/{id}`
- **Rate Limit**: 20 requests per 10 minutes
- **Note**: Only task owner can delete
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "Task deleted successfully" }
    }
    ```

### Assign Task

- **POST** `/api/task/{id}/assign`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**:
    ```json
    {
        "assigneeAuthId": "number (optional, null to unassign)"
    }
    ```
- **Response**: Same as Create Task response

---

## Task Status Management

### Update Task Status

- **PUT** `/api/task/{taskId}/status`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**:
    ```json
    {
        "status": "TODO|IN_PROGRESS|REVIEW|DONE|CANCELED"
    }
    ```
- **Response**: Updated task object

### Get Task Status History

- **GET** `/api/task/{taskId}/status/history`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "taskId": 1,
        "currentStatus": "IN_PROGRESS",
        "createdAt": "...",
        "lastUpdated": "...",
        "history": [...]
      }
    }
    ```

### Get Tasks by Status

- **GET** `/api/task/status/{status}?page=1&limit=20&sortBy=updatedAt&sortOrder=desc`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Paginated list of tasks with specified status

### Get Status Statistics

- **GET** `/api/task/statistics/status`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "byStatus": {
                "TODO": 5,
                "IN_PROGRESS": 3,
                "REVIEW": 1,
                "DONE": 7,
                "CANCELED": 2
            },
            "total": 18,
            "completion": {
                "completed": 7,
                "inProgress": 4,
                "pending": 5,
                "canceled": 2,
                "completionRate": "38.89"
            }
        }
    }
    ```

---

## Task Priority Management

### Update Task Priority

- **PUT** `/api/task/{taskId}/priority`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**:
    ```json
    {
        "priority": "LOW|MEDIUM|HIGH|URGENT"
    }
    ```
- **Response**: Updated task object

### Get Tasks by Priority

- **GET** `/api/task/priority/{priority}?page=1&limit=20&status=TODO&sortBy=dueDate&sortOrder=asc`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Paginated list of tasks with specified priority

### Get Priority Statistics

- **GET** `/api/task/statistics/priority`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "byPriority": {
                "LOW": 5,
                "MEDIUM": 8,
                "HIGH": 4,
                "URGENT": 1
            },
            "total": 18,
            "urgentTasksDueSoon": 1,
            "distribution": {
                "urgent": "5.56",
                "high": "22.22",
                "medium": "44.44",
                "low": "27.78"
            }
        }
    }
    ```

### Get High Priority Overdue Tasks

- **GET** `/api/task/priority/high/overdue`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "tasks": [...],
        "count": 3,
        "message": "You have 3 high priority overdue tasks"
      }
    }
    ```

---

## Task Due Date Management

### Update Task Due Date

- **PUT** `/api/task/{taskId}/due-date`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**:
    ```json
    {
        "dueDate": "ISO8601 date string (optional, null to remove)"
    }
    ```
- **Response**: Updated task object

### Get Tasks Due Soon

- **GET** `/api/task/due/soon?days=7&page=1&limit=20&includeOverdue=true`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `days`: Number of days ahead to check (optional, default: 7)
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 20)
    - `includeOverdue`: Include overdue tasks (optional, default: true)
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "categorized": {
          "overdue": [...],
          "today": [...],
          "tomorrow": [...],
          "thisWeek": [...],
          "later": [...]
        },
        "summary": {
          "overdue": 2,
          "today": 1,
          "tomorrow": 3,
          "thisWeek": 5,
          "later": 2,
          "total": 13
        },
        "pagination": {...}
      }
    }
    ```

### Get Overdue Tasks

- **GET** `/api/task/due/overdue?page=1&limit=20&sortBy=dueDate&sortOrder=asc`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "tasks": [
          {
            "...": "task properties",
            "overdueDays": 5
          }
        ],
        "count": 3,
        "pagination": {...}
      }
    }
    ```

### Get Tasks Due Today

- **GET** `/api/task/due/today`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "tasks": [...],
        "count": 2,
        "message": "You have 2 tasks due today"
      }
    }
    ```

### Send Due Date Reminders

- **POST** `/api/task/due/reminders`
- **Rate Limit**: 100 requests per 15 minutes
- **Description**: Creates notifications for tasks due in the next 24 hours
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "message": "Sent 5 due date reminders",
            "remindersSent": 5,
            "tasksDueSoon": 8
        }
    }
    ```

### Get Due Date Statistics

- **GET** `/api/task/statistics/due-dates`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "total": 50,
            "withDueDate": 35,
            "withoutDueDate": 15,
            "overdue": 5,
            "dueToday": 2,
            "dueTomorrow": 3,
            "dueThisWeek": 8,
            "percentages": {
                "withDueDate": "70.00",
                "overdue": "14.29"
            }
        }
    }
    ```

---

## Task Category Management

### Add Category to Task

- **POST** `/api/task/{taskId}/categories`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**:
    ```json
    {
        "categoryId": "number"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "category": { "id": 1, "name": "...", "color": "..." },
            "task": { "id": 1, "title": "..." },
            "assignedAt": "..."
        }
    }
    ```

### Remove Category from Task

- **DELETE** `/api/task/{taskId}/categories/{categoryId}`
- **Rate Limit**: 20 requests per 10 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "Category removed from task successfully" }
    }
    ```

### Get Task Categories

- **GET** `/api/task/{taskId}/categories`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "taskId": 1,
            "categories": [
                {
                    "id": 1,
                    "name": "...",
                    "color": "...",
                    "ownerId": 1,
                    "assignedAt": "..."
                }
            ]
        }
    }
    ```

### Get Category Tasks

- **GET** `/api/task/categories/{categoryId}/tasks?page=1&limit=20&status=TODO&priority=HIGH`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Paginated list of tasks in category

---

## Task Tag Management

### Add Tag to Task

- **POST** `/api/task/{taskId}/tags`
- **Rate Limit**: 50 requests per 5 minutes
- **Body**:
    ```json
    {
        "tagId": "number"
    }
    ```
- **Response**: Similar to category assignment

### Remove Tag from Task

- **DELETE** `/api/task/{taskId}/tags/{tagId}`
- **Rate Limit**: 20 requests per 10 minutes
- **Response**: Success message

### Get Task Tags

- **GET** `/api/task/{taskId}/tags`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: List of tags assigned to task

### Get Tag Tasks

- **GET** `/api/task/tags/{tagId}/tasks?page=1&limit=20&status=TODO&priority=HIGH`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Paginated list of tasks with tag

### Get Popular Tag Combinations

- **GET** `/api/task/tags/combinations/popular?limit=10`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "popularCombinations": [
                {
                    "combination": "urgent + bug",
                    "count": 5,
                    "tags": ["urgent", "bug"]
                }
            ],
            "totalUniqueCombinations": 25
        }
    }
    ```

---

## Category Management Endpoints

### Create Category

- **POST** `/api/category`
- **Rate Limit**: 15 requests per 5 minutes
- **Body**:
    ```json
    {
        "name": "string (1-100 chars, required)",
        "color": "string (hex color code, optional)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "id": 1,
            "name": "Work",
            "color": "#FF5733",
            "ownerId": 1,
            "createdAt": "...",
            "updatedAt": "...",
            "owner": { "id": 1, "authId": 123 },
            "_count": { "tasks": 0 }
        }
    }
    ```

### Get Categories

- **GET** `/api/category?page=1&limit=50&search=work&sortBy=name&sortOrder=asc&withTaskCount=true`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 50, max: 100)
    - `search`: Search in name (optional)
    - `sortBy`: Sort field (optional, default: name)
    - `sortOrder`: Sort direction (optional, default: asc)
    - `withTaskCount`: Include task count (optional, default: true)
- **Response**: Paginated list of categories

### Get Category by ID

- **GET** `/api/category/{id}`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "id": 1,
            "name": "Work",
            "color": "#FF5733",
            "ownerId": 1,
            "createdAt": "...",
            "owner": { "id": 1, "authId": 123 },
            "tasks": [
                {
                    "task": {
                        "id": 1,
                        "title": "...",
                        "status": "TODO",
                        "priority": "HIGH",
                        "dueDate": "...",
                        "createdAt": "..."
                    }
                }
            ],
            "_count": { "tasks": 5 }
        }
    }
    ```

### Update Category

- **PUT** `/api/category/{id}`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**: Same as Create Category (all fields optional)
- **Response**: Updated category object

### Delete Category

- **DELETE** `/api/category/{id}`
- **Rate Limit**: 20 requests per 10 minutes
- **Note**: Cannot delete if category has associated tasks
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "Category deleted successfully" }
    }
    ```

### Get Category Statistics

- **GET** `/api/category/stats`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": [
            {
                "id": 1,
                "name": "Work",
                "color": "#FF5733",
                "totalTasks": 10,
                "tasksByStatus": {
                    "TODO": 3,
                    "IN_PROGRESS": 2,
                    "DONE": 5
                }
            }
        ]
    }
    ```

---

## Tag Management Endpoints

### Create Tag

- **POST** `/api/tag`
- **Rate Limit**: 15 requests per 5 minutes
- **Body**:
    ```json
    {
        "name": "string (1-50 chars, required)",
        "color": "string (hex color code, optional)"
    }
    ```
- **Response**: Similar to category creation

### Get Tags

- **GET** `/api/tag?page=1&limit=50&search=urgent&sortBy=name&sortOrder=asc&withTaskCount=true`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Paginated list of tags

### Get Tag by ID

- **GET** `/api/tag/{id}`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Similar to category response

### Update Tag

- **PUT** `/api/tag/{id}`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**: Same as Create Tag (all fields optional)
- **Response**: Updated tag object

### Delete Tag

- **DELETE** `/api/tag/{id}`
- **Rate Limit**: 20 requests per 10 minutes
- **Note**: Cannot delete if tag has associated tasks
- **Response**: Success message

### Get Tag Statistics

- **GET** `/api/tag/stats`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**: Similar to category statistics

### Get Popular Tags

- **GET** `/api/tag/popular?limit=10`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": [
            {
                "id": 1,
                "name": "urgent",
                "color": "#FF0000",
                "ownerId": 1,
                "_count": { "tasks": 15 }
            }
        ]
    }
    ```

---

## Project Management Endpoints

### Create Project

- **POST** `/api/project`
- **Rate Limit**: 15 requests per 5 minutes
- **Body**:
    ```json
    {
        "name": "string (1-200 chars, required)",
        "description": "string (max 1000 chars, optional)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "id": 1,
            "name": "Website Redesign",
            "description": "...",
            "ownerId": 1,
            "createdAt": "...",
            "updatedAt": "...",
            "owner": { "id": 1, "authId": 123 },
            "members": [
                {
                    "id": 1,
                    "role": "OWNER",
                    "user": { "id": 1, "authId": 123 }
                }
            ],
            "_count": { "tasks": 0, "members": 1 },
            "chat": {
                "id": "chat_id",
                "name": "Website Redesign General",
                "created": true
            }
        }
    }
    ```

### Get Projects

- **GET** `/api/project?page=1&limit=20&search=website&ownedOnly=false&sortBy=updatedAt&sortOrder=desc&includeChats=false`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 20, max: 100)
    - `search`: Search in name/description (optional)
    - `ownedOnly`: Show only owned projects (optional, default: false)
    - `sortBy`: Sort field (optional, default: updatedAt)
    - `sortOrder`: Sort direction (optional, default: desc)
    - `includeChats`: Include chat information (optional, default: false)
- **Response**: Paginated list of projects

### Get Project by ID

- **GET** `/api/project/{id}?includeChats=false`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "name": "Website Redesign",
        "description": "...",
        "ownerId": 1,
        "owner": { "id": 1, "authId": 123 },
        "members": [...],
        "tasks": [...], // Recent 10 tasks
        "_count": { "tasks": 25, "members": 5 },
        "chats": [...] // if includeChats=true
      }
    }
    ```

### Get Project Chat Info

- **GET** `/api/project/{id}/chat`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "projectId": 1,
        "projectName": "Website Redesign",
        "chats": [...],
        "defaultChat": { "id": "...", "name": "..." },
        "totalChats": 2
      }
    }
    ```

### Update Project

- **PUT** `/api/project/{id}`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**: Same as Create Project (all fields optional)
- **Note**: Only owners and admins can update
- **Response**: Updated project object

### Delete Project

- **DELETE** `/api/project/{id}`
- **Rate Limit**: 20 requests per 10 minutes
- **Note**: Only project owner can delete
- **Response**: Success message

### Add Member to Project

- **POST** `/api/project/{id}/members`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**:
    ```json
    {
        "memberAuthId": "number (required)",
        "role": "OWNER|ADMIN|MEMBER|VIEWER (optional, default: MEMBER)"
    }
    ```
- **Note**: Only owners and admins can add members
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "id": 2,
            "projectId": 1,
            "userId": 2,
            "role": "MEMBER",
            "createdAt": "...",
            "user": { "id": 2, "authId": 456 },
            "project": { "id": 1, "name": "..." }
        }
    }
    ```

### Update Member Role

- **PUT** `/api/project/{id}/members/{memberId}/role`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**:
    ```json
    {
        "role": "OWNER|ADMIN|MEMBER|VIEWER"
    }
    ```
- **Note**: Only project owner can change roles
- **Response**: Updated member object

### Remove Member from Project

- **DELETE** `/api/project/{id}/members/{memberId}`
- **Rate Limit**: 20 requests per 10 minutes
- **Note**: Users can remove themselves, or admins/owners can remove others. Cannot remove project owner.
- **Response**: Success message

---

## Notification Management Endpoints

### Get Notifications

- **GET** `/api/notification?page=1&limit=20&unreadOnly=false&type=DUE_DATE_REMINDER&sortBy=createdAt&sortOrder=desc`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 20, max: 100)
    - `unreadOnly`: Show only unread notifications (optional, default: false)
    - `type`: Filter by notification type (optional)
    - `sortBy`: Sort field (optional, default: createdAt)
    - `sortOrder`: Sort direction (optional, default: desc)
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "notifications": [
          {
            "id": 1,
            "type": "DUE_DATE_REMINDER",
            "content": "Task 'Complete design' is due soon",
            "isRead": false,
            "userId": 1,
            "relatedTaskId": 5,
            "createdAt": "...",
            "relatedTask": {
              "id": 5,
              "title": "Complete design",
              "status": "IN_PROGRESS"
            }
          }
        ],
        "pagination": {...},
        "unreadCount": 3
      }
    }
    ```

### Get Notification by ID

- **GET** `/api/notification/{id}`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Single notification object

### Mark Notification as Read

- **PUT** `/api/notification/{id}/read`
- **Rate Limit**: 20 requests per 2 minutes
- **Response**: Updated notification object

### Mark All Notifications as Read

- **PUT** `/api/notification/read/all`
- **Rate Limit**: 20 requests per 2 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "5 notifications marked as read" }
    }
    ```

### Delete Notification

- **DELETE** `/api/notification/{id}`
- **Rate Limit**: 20 requests per 10 minutes
- **Response**: Success message

### Delete All Read Notifications

- **DELETE** `/api/notification/read/all`
- **Rate Limit**: 20 requests per 10 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": { "message": "8 read notifications deleted" }
    }
    ```

### Get Notification Statistics

- **GET** `/api/notification/stats`
- **Rate Limit**: 30 requests per 5 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "totalCount": 25,
            "unreadCount": 5,
            "readCount": 20,
            "byType": {
                "DUE_DATE_REMINDER": 10,
                "TASK_ASSIGNED": 8,
                "TASK_STATUS_CHANGED": 5,
                "PROJECT_INVITE": 2
            }
        }
    }
    ```

---

## Export Endpoints

### Get Export Information

- **GET** `/api/export/info`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "availableData": {
          "tasks": 50,
          "projects": 5,
          "categories": 8,
          "tags": 15
        },
        "supportedFormats": {
          "tasks": ["CSV", "JSON"],
          "projects": ["CSV", "JSON"]
        },
        "exportOptions": {...}
      }
    }
    ```

### Export Tasks to CSV

- **GET** `/api/export/tasks/csv?projectId=1&status=TODO&priority=HIGH&includeArchived=false`
- **Rate Limit**: 5 requests per 15 minutes
- **Query Parameters**:
    - `projectId`: Filter by project (optional)
    - `status`: Filter by status (optional)
    - `priority`: Filter by priority (optional)
    - `includeArchived`: Include canceled tasks (optional, default: false)
- **Response**: CSV file download

### Export Tasks to JSON

- **GET** `/api/export/tasks/json?projectId=1&detailed=true`
- **Rate Limit**: 5 requests per 15 minutes
- **Query Parameters**: Same as CSV export plus:
    - `detailed`: Include full task details (optional, default: true)
- **Response**: JSON file download

### Export Projects to CSV

- **GET** `/api/export/projects/csv?ownedOnly=false`
- **Rate Limit**: 5 requests per 15 minutes
- **Query Parameters**:
    - `ownedOnly`: Export only owned projects (optional, default: false)
- **Response**: CSV file download

### Export Projects to JSON

- **GET** `/api/export/projects/json?ownedOnly=false&includeTasks=false`
- **Rate Limit**: 5 requests per 15 minutes
- **Query Parameters**:
    - `ownedOnly`: Export only owned projects (optional, default: false)
    - `includeTasks`: Include project tasks (optional, default: false)
- **Response**: JSON file download

### Export User Data Backup

- **GET** `/api/export/backup`
- **Rate Limit**: 5 requests per 15 minutes
- **Description**: Complete user data backup including all tasks, projects, categories, tags, and recent notifications
- **Response**: JSON file download with complete user data

---

# CHAT SERVICE (Port 5000)

## Base URL: `http://localhost:5000`

## Authentication: All endpoints require `Authorization: Bearer <access_token>`

### Health Check

- **GET** `/health`
- **Description**: Service health status with database connection info
- **Response**: `{ status: "ok", timestamp: "...", service: "chat-service", version: "1.0.0", database: "connected" }`

---

## Chat Management Endpoints

### Create Chat

- **POST** `/api/chats`
- **Rate Limit**: 5 requests per 5 minutes
- **Body**:
    ```json
    {
        "projectId": "number (required)",
        "name": "string (1-100 chars, required)",
        "description": "string (max 500 chars, optional)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "chat": {
                "id": "60f7b3b3b3b3b3b3b3b3b3b3",
                "projectId": 1,
                "name": "Design Discussion",
                "description": "Chat about design decisions",
                "isActive": true,
                "createdBy": 123,
                "lastActivity": "...",
                "createdAt": "...",
                "updatedAt": "..."
            },
            "message": "Chat created successfully"
        }
    }
    ```

### Auto-Create Project Chat (Internal)

- **POST** `/api/chats/auto-create`
- **Rate Limit**: 5 requests per 5 minutes
- **Description**: Internal endpoint for db-service to auto-create chats when projects are created
- **Body**:
    ```json
    {
        "projectId": "number (required)",
        "projectName": "string (required)",
        "projectDescription": "string (optional)",
        "ownerId": "number (required)",
        "members": "array (optional)"
    }
    ```
- **Response**: Chat creation result

### Get Chats

- **GET** `/api/chats?projectId=1&page=1&limit=20&search=design`
- **Rate Limit**: 60 requests per 1 minute
- **Query Parameters**:
    - `projectId`: Filter by specific project (optional)
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 20, max: 50)
    - `search`: Search in chat name/description (optional, 2-100 chars)
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "chats": [
                {
                    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
                    "projectId": 1,
                    "name": "Design Discussion",
                    "description": "...",
                    "createdBy": 123,
                    "lastActivity": "...",
                    "messageCount": 25,
                    "unreadCount": 3,
                    "createdAt": "...",
                    "updatedAt": "..."
                }
            ],
            "pagination": {
                "page": 1,
                "limit": 20,
                "total": 50,
                "totalPages": 3,
                "hasNextPage": true,
                "hasPrevPage": false
            }
        }
    }
    ```

### Get Chat Statistics

- **GET** `/api/chats/stats`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "totalChats": 15,
            "totalMessages": 450,
            "chatsCreated": 3,
            "projectBreakdown": [
                {
                    "projectId": 1,
                    "chatCount": 2,
                    "lastActivity": "..."
                }
            ]
        }
    }
    ```

### Get Project Chats

- **GET** `/api/chats/project/{projectId}?page=1&limit=20&search=general`
- **Rate Limit**: 60 requests per 1 minute
- **Response**: Paginated list of chats for specific project

### Get or Create Default Project Chat

- **GET** `/api/chats/project/{projectId}/default`
- **Rate Limit**: 60 requests per 1 minute
- **Description**: Gets the default chat for a project, creates one if it doesn't exist
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "chat": {
                "id": "60f7b3b3b3b3b3b3b3b3b3b3",
                "projectId": 1,
                "name": "Project Name General",
                "description": "General discussion for Project Name",
                "createdBy": 123,
                "lastActivity": "...",
                "messageCount": 0,
                "createdAt": "...",
                "updatedAt": "..."
            },
            "isNewlyCreated": true
        }
    }
    ```

### Get Chat by ID

- **GET** `/api/chats/{id}`
- **Rate Limit**: 60 requests per 1 minute
- **Response**: Single chat object with message count

### Update Chat

- **PUT** `/api/chats/{id}`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**:
    ```json
    {
        "name": "string (1-100 chars, optional)",
        "description": "string (max 500 chars, optional)"
    }
    ```
- **Response**: Updated chat object

### Delete Chat

- **DELETE** `/api/chats/{id}`
- **Rate Limit**: 10 requests per 10 minutes
- **Note**: Only the chat creator can delete the chat. This is a soft delete (marks as inactive).
- **Response**: Success message

---

## Message Management Endpoints

### Get Chat Messages

- **GET** `/api/messages/chat/{chatId}?page=1&limit=50&before=2024-01-01T00:00:00Z&after=2024-01-01T00:00:00Z&includeDeleted=false&sortOrder=desc`
- **Rate Limit**: 30 requests per 1 minute
- **Query Parameters**:
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 50, max: 100)
    - `before`: Get messages before this date (optional, ISO8601)
    - `after`: Get messages after this date (optional, ISO8601)
    - `includeDeleted`: Include soft-deleted messages (optional, default: false)
    - `sortOrder`: Sort direction - "desc" for newest first, "asc" for oldest first (optional, default: desc)
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "messages": [
                {
                    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
                    "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
                    "userId": 123,
                    "content": "Hello everyone!",
                    "messageType": "text",
                    "metadata": {},
                    "isEdited": false,
                    "editedAt": null,
                    "isDeleted": false,
                    "deletedAt": null,
                    "createdAt": "...",
                    "updatedAt": "..."
                }
            ],
            "pagination": {
                "page": 1,
                "limit": 50,
                "total": 200,
                "totalPages": 4,
                "hasNextPage": true,
                "hasPrevPage": false,
                "nextPage": 2,
                "prevPage": null
            },
            "chatInfo": {
                "id": "60f7b3b3b3b3b3b3b3b3b3b3",
                "name": "Design Discussion",
                "description": "...",
                "projectId": 1,
                "createdBy": 123,
                "lastActivity": "...",
                "createdAt": "...",
                "updatedAt": "..."
            },
            "filters": {
                "before": null,
                "after": null,
                "includeDeleted": false,
                "sortOrder": "desc"
            }
        }
    }
    ```

### Export Chat Messages

- **GET** `/api/messages/chat/{chatId}/export?format=json&includeDeleted=false&includeMetadata=true`
- **Rate Limit**: 3 requests per 15 minutes
- **Query Parameters**:
    - `format`: Export format - "json" or "csv" (optional, default: json)
    - `includeDeleted`: Include deleted messages (optional, default: false)
    - `includeMetadata`: Include message metadata (optional, default: true)
- **Response**: File download (JSON or CSV)

### Search Messages in Chat

- **GET** `/api/messages/chat/{chatId}/search?query=hello&page=1&limit=20`
- **Rate Limit**: 100 requests per 15 minutes
- **Query Parameters**:
    - `query`: Search term (required, min 2 chars)
    - `page`: Page number (optional, default: 1)
    - `limit`: Items per page (optional, default: 20, max: 100)
- **Response**:
    ```json
    {
      "success": true,
      "data": {
        "messages": [
          {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
            "userId": 123,
            "content": "Hello everyone!",
            "messageType": "text",
            "createdAt": "...",
            "contentHighlighted": "<mark>Hello</mark> everyone!"
          }
        ],
        "searchQuery": "hello",
        "pagination": {...}
      }
    }
    ```

### Send Message (API)

- **POST** `/api/messages/chat/{chatId}`
- **Rate Limit**: 30 requests per 1 minute
- **Description**: API endpoint for sending messages (mainly for testing - use Socket.IO for real-time)
- **Body**:
    ```json
    {
        "content": "string (1-2000 chars, required)",
        "messageType": "text|system|file|image (optional, default: text)",
        "metadata": "object (optional)"
    }
    ```
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
            "userId": 123,
            "content": "Hello everyone!",
            "messageType": "text",
            "metadata": {},
            "isEdited": false,
            "isDeleted": false,
            "createdAt": "...",
            "updatedAt": "..."
        }
    }
    ```

### Get Message by ID

- **GET** `/api/messages/{messageId}`
- **Rate Limit**: 100 requests per 15 minutes
- **Response**: Single message object

### Update Message

- **PUT** `/api/messages/{messageId}`
- **Rate Limit**: 20 requests per 5 minutes
- **Body**:
    ```json
    {
        "content": "string (1-2000 chars, required)"
    }
    ```
- **Note**: Only message owner can edit
- **Response**: Updated message object

### Delete Message

- **DELETE** `/api/messages/{messageId}`
- **Rate Limit**: 10 requests per 10 minutes
- **Note**: Only message owner can delete. This is a soft delete.
- **Response**: Success message with deletion timestamp

---

## Socket.IO Real-Time Events

### Connection

- **URL**: `ws://localhost:5000`
- **Authentication**: Include JWT token in:
    - `Authorization` header: `Bearer <token>`
    - Query parameter: `?token=<token>`
    - Auth object: `{ auth: { token: '<token>' } }`

### Socket Events (Client to Server)

#### Join Project Room

- **Event**: `join_project`
- **Data**:
    ```json
    {
        "projectId": 1
    }
    ```
- **Response**: `joined_project` event
- **Error Response**: `error` event

#### Leave Project Room

- **Event**: `leave_project`
- **Data**:
    ```json
    {
        "projectId": 1
    }
    ```
- **Response**: `left_project` event

#### Send Message

- **Event**: `send_message`
- **Rate Limit**: 60 messages per minute per user
- **Data**:
    ```json
    {
        "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "content": "Hello everyone!",
        "messageType": "text",
        "metadata": {}
    }
    ```
- **Broadcast**: `new_message` event to all users in project room

#### Edit Message

- **Event**: `edit_message`
- **Data**:
    ```json
    {
        "messageId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "content": "Updated message content"
    }
    ```
- **Broadcast**: `message_edited` event to all users in project room

#### Delete Message

- **Event**: `delete_message`
- **Data**:
    ```json
    {
        "messageId": "60f7b3b3b3b3b3b3b3b3b3b3"
    }
    ```
- **Broadcast**: `message_deleted` event to all users in project room

#### Typing Indicators

- **Event**: `typing_start`
- **Data**:
    ```json
    {
        "chatId": "60f7b3b3b3b3b3b3b3b3b3b3"
    }
    ```
- **Broadcast**: `user_typing` event to other users in project room

- **Event**: `typing_stop`
- **Data**:
    ```json
    {
        "chatId": "60f7b3b3b3b3b3b3b3b3b3b3"
    }
    ```
- **Broadcast**: `user_typing` event to other users in project room

#### Get Online Users

- **Event**: `get_online_users`
- **Data**:
    ```json
    {
        "projectId": 1
    }
    ```
- **Response**: `online_users` event

### Socket Events (Server to Client)

#### Joined Project

- **Event**: `joined_project`
- **Data**:
    ```json
    {
        "success": true,
        "projectId": 1,
        "room": "project_1",
        "message": "Joined project 1 chat"
    }
    ```

#### Left Project

- **Event**: `left_project`
- **Data**:
    ```json
    {
        "success": true,
        "projectId": 1,
        "room": "project_1",
        "message": "Left project 1 chat"
    }
    ```

#### New Message

- **Event**: `new_message`
- **Data**:
    ```json
    {
        "success": true,
        "data": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
            "userId": 123,
            "content": "Hello everyone!",
            "messageType": "text",
            "metadata": {},
            "createdAt": "...",
            "isEdited": false
        },
        "chatInfo": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "name": "Design Discussion",
            "projectId": 1
        }
    }
    ```

#### Message Edited

- **Event**: `message_edited`
- **Data**:
    ```json
    {
        "success": true,
        "data": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
            "userId": 123,
            "content": "Updated message content",
            "messageType": "text",
            "metadata": {},
            "createdAt": "...",
            "isEdited": true,
            "editedAt": "..."
        }
    }
    ```

#### Message Deleted

- **Event**: `message_deleted`
- **Data**:
    ```json
    {
        "success": true,
        "messageId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "deletedBy": 123,
        "deletedAt": "..."
    }
    ```

#### User Typing

- **Event**: `user_typing`
- **Data**:
    ```json
    {
        "userId": 123,
        "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "isTyping": true
    }
    ```

#### User Joined/Left

- **Event**: `user_joined` / `user_left`
- **Data**:
    ```json
    {
        "userId": 123,
        "timestamp": "..."
    }
    ```

#### Online Users

- **Event**: `online_users`
- **Data**:
    ```json
    {
        "success": true,
        "projectId": 1,
        "onlineUsers": [123, 456, 789]
    }
    ```

#### Error

- **Event**: `error`
- **Data**:
    ```json
    {
        "success": false,
        "error": "Error message",
        "timestamp": "..."
    }
    ```

---

## Socket.IO Information Endpoint

### Get Socket Info

- **GET** `/socket/info`
- **Description**: Provides information about Socket.IO capabilities
- **Response**:
    ```json
    {
        "success": true,
        "data": {
            "connectedClients": 25,
            "supportedEvents": [
                "join_project",
                "leave_project",
                "send_message",
                "edit_message",
                "delete_message",
                "typing_start",
                "typing_stop",
                "get_online_users"
            ],
            "authenticationRequired": true,
            "instructions": {
                "connection": "Connect with JWT token in auth header or query parameter",
                "rooms": "Join project rooms using join_project event with projectId",
                "messaging": "Send messages using send_message event with chatId and content"
            }
        }
    }
    ```

---

# Common Data Models

## User Object

```json
{
    "id": 1,
    "authId": 123,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Task Object

```json
{
  "id": 1,
  "title": "Complete project setup",
  "description": "Set up the initial project structure and dependencies",
  "priority": "MEDIUM",
  "status": "TODO",
  "dueDate": "2024-01-15T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "ownerId": 1,
  "owner": { "id": 1, "authId": 123 },
  "assigneeId": 2,
  "assignee": { "id": 2, "authId": 456 },
  "projectId": 1,
  "project": { "id": 1, "name": "Website Redesign" },
  "categories": [...],
  "tags": [...]
}
```

## Project Object

```json
{
  "id": 1,
  "name": "Website Redesign",
  "description": "Complete redesign of company website",
  "ownerId": 1,
  "owner": { "id": 1, "authId": 123 },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "members": [
    {
      "id": 1,
      "projectId": 1,
      "userId": 1,
      "role": "OWNER",
      "user": { "id": 1, "authId": 123 },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "tasks": [...],
  "_count": { "tasks": 15, "members": 3 }
}
```

## Category/Tag Object

```json
{
    "id": 1,
    "name": "Work",
    "color": "#FF5733",
    "ownerId": 1,
    "owner": { "id": 1, "authId": 123 },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "_count": { "tasks": 10 }
}
```

## Notification Object

```json
{
    "id": 1,
    "type": "DUE_DATE_REMINDER",
    "content": "Task 'Complete design' is due soon",
    "isRead": false,
    "userId": 1,
    "relatedTaskId": 5,
    "relatedTask": {
        "id": 5,
        "title": "Complete design",
        "status": "IN_PROGRESS"
    },
    "createdAt": "2024-01-01T00:00:00Z"
}
```

## Chat Object

```json
{
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "projectId": 1,
    "name": "Design Discussion",
    "description": "Chat about design decisions",
    "isActive": true,
    "createdBy": 123,
    "lastActivity": "2024-01-01T12:00:00Z",
    "messageCount": 25,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Message Object

```json
{
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "chatId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "userId": 123,
    "content": "Hello everyone!",
    "messageType": "text",
    "metadata": {},
    "isEdited": false,
    "editedAt": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

# Enums and Constants

## Task Priority

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

## Task Status

- `TODO`
- `IN_PROGRESS`
- `REVIEW`
- `DONE`
- `CANCELED`

## Project Role

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

## Notification Type

- `DUE_DATE_REMINDER`
- `TASK_ASSIGNED`
- `TASK_STATUS_CHANGED`
- `COMMENT_ADDED`
- `PROJECT_INVITE`

## Message Type

- `text`
- `system`
- `file`
- `image`

---

# Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [...] // Optional, for validation errors
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (dependent service down)
- `504` - Gateway Timeout (dependent service timeout)

---

# Rate Limiting

## Auth Service

- Registration: 5 requests per 15 minutes
- Login: 10 requests per 10 minutes
- Email operations: 3 requests per 1 minute

## DB Service

- General operations: 100 requests per 15 minutes
- Task creation: 20 requests per 5 minutes
- Resource creation: 15 requests per 5 minutes
- Updates: 50 requests per 5 minutes
- Deletions: 20 requests per 10 minutes
- Exports: 5 requests per 15 minutes
- Statistics: 30 requests per 5 minutes
- Search: 30 requests per 1 minute

## Chat Service

- General operations: 100 requests per 15 minutes
- Chat creation: 5 requests per 5 minutes
- Message sending (API): 30 requests per 1 minute
- Message fetching: 30 requests per 1 minute
- Chat fetching: 60 requests per 1 minute
- Updates: 20 requests per 5 minutes
- Deletions: 10 requests per 10 minutes
- Exports: 3 requests per 15 minutes
- Socket messages: 60 messages per minute per user
- Socket connections: 10 connections per 5 minutes per user

---

# Service Dependencies

## Auth Service

- **Database**: MySQL (MariaDB)
- **Dependencies**: None (base service)

## DB Service

- **Database**: MySQL (MariaDB)
- **Dependencies**:
    - Auth Service (for token verification)
    - Chat Service (for project chat creation, optional)

## Chat Service

- **Database**: MongoDB
- **Dependencies**:
    - Auth Service (for token verification)
    - DB Service (for project membership verification)

---

# Development and Testing

## Development Endpoints

- Auth Service test interface: `GET http://localhost:3000/test/login` (only in development mode)

## Health Check Endpoints

- Auth Service: `GET http://localhost:3000/health`
- DB Service: `GET http://localhost:4000/health`
- Chat Service: `GET http://localhost:5000/health`

## Socket.IO Testing

- Chat Service socket info: `GET http://localhost:5000/socket/info`
- Socket.IO endpoint: `ws://localhost:5000`

This documentation provides complete coverage of all microservice endpoints, parameters, responses, and real-time functionality. A developer can use this to understand the full system architecture and extend or integrate with these services.
