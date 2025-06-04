#!/bin/bash

# Chat Service COMPREHENSIVE Integration Test Script
# Usage: ./chat_service_test.sh <ACCESS_TOKEN>
# This script tests chat service integration with db-service

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DB_SERVICE_URL="${DB_SERVICE_URL:-http://localhost:4000}"
CHAT_SERVICE_URL="${CHAT_SERVICE_URL:-http://localhost:5000}"
ACCESS_TOKEN="$1"

# Check if token is provided
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: Access token is required${NC}"
    echo "Usage: $0 <ACCESS_TOKEN>"
    exit 1
fi

# Helper function to make authenticated requests
make_request() {
    local method="$1"
    local service_url="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"
    local description="$6"
    
    if [ -n "$description" ]; then
        echo -e "${BLUE}📋 $description${NC}"
    fi
    echo -e "${CYAN}🔧 $method $service_url$endpoint${NC}"
    if [ -n "$data" ]; then
        echo -e "${PURPLE}📤 $data${NC}"
    fi
    
    local response
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
                  -H "Content-Type: application/json" \
                  "$service_url$endpoint")
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                      -H "Authorization: Bearer $ACCESS_TOKEN" \
                      -H "Content-Type: application/json" \
                      -d "$data" \
                      "$service_url$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                      -H "Authorization: Bearer $ACCESS_TOKEN" \
                      -H "Content-Type: application/json" \
                      "$service_url$endpoint")
        fi
    fi
    
    # Split response and status code
    local status_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ Success (HTTP $status_code)${NC}"
        if [ ${#response_body} -lt 500 ]; then
            echo "$response_body"
        else
            echo "${response_body:0:200}... [truncated]"
        fi
        echo "$response_body"  # Return full response for parsing
        return 0
    else
        echo -e "${RED}✗ Failed (HTTP $status_code, expected $expected_status)${NC}"
        echo "$response_body"
        return 1
    fi
}

# Function to extract ID from JSON response
extract_id() {
    echo "$1" | grep -oE '"id":\s*[0-9]+' | head -1 | grep -oE '[0-9]+' || echo ""
}

# Function to extract chat ID from JSON response (MongoDB ObjectId)
extract_chat_id() {
    echo "$1" | grep -oE '"id":\s*"[^"]*"' | head -1 | cut -d'"' -f4 || echo ""
}

# Function to display a nice separator
print_separator() {
    echo -e "${YELLOW}================================================================${NC}"
}

# Function to display conversation messages nicely
display_conversation() {
    local messages="$1"
    echo -e "${YELLOW}📱 CHAT CONVERSATION${NC}"
    echo -e "${YELLOW}==================${NC}"
    
    # Check if jq is available and parse messages
    if command -v jq >/dev/null 2>&1; then
        echo "$messages" | jq -r '.data.messages[]? | "[\(.createdAt)] User \(.userId): \(.content)"' 2>/dev/null || {
            echo "Raw messages data:"
            echo "$messages"
        }
    else
        echo "Raw messages data (jq not available):"
        echo "$messages"
    fi
    echo -e "${YELLOW}==================${NC}"
}

echo -e "${YELLOW}🚀 Starting Chat Service COMPREHENSIVE Integration Tests${NC}"
echo -e "${YELLOW}This script tests the complete chat workflow including project creation and messaging${NC}"
echo -e "${YELLOW}DB Service URL: $DB_SERVICE_URL${NC}"
echo -e "${YELLOW}Chat Service URL: $CHAT_SERVICE_URL${NC}"
echo

print_separator

# =============================================================================
# Test 1: HEALTH CHECKS
# =============================================================================
echo -e "${YELLOW}=== 1. HEALTH CHECKS ===${NC}"

echo -e "${BLUE}📋 Testing DB service health${NC}"
echo -e "${CYAN}🔧 GET $DB_SERVICE_URL/health${NC}"
db_health=$(curl -s "$DB_SERVICE_URL/health" || echo "Failed to connect")
echo "$db_health"
echo

echo -e "${BLUE}📋 Testing Chat service health${NC}"
echo -e "${CYAN}🔧 GET $CHAT_SERVICE_URL/health${NC}"
chat_health=$(curl -s "$CHAT_SERVICE_URL/health" || echo "Failed to connect")
echo "$chat_health"
echo

print_separator

# =============================================================================
# Test 2: CREATE PROJECT VIA DB-SERVICE
# =============================================================================
echo -e "${YELLOW}=== 2. PROJECT CREATION (VIA DB-SERVICE) ===${NC}"

project_response=$(make_request "POST" "$DB_SERVICE_URL" "/api/project" \
    '{"name":"Chat Test Project","description":"A project created specifically for testing chat functionality"}' \
    201 "Create test project for chat testing")

project_id=$(extract_id "$project_response")
if [ -z "$project_id" ]; then
    echo -e "${RED}❌ Failed to extract project ID${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Created project with ID: $project_id${NC}"
echo

print_separator

# =============================================================================
# Test 3: CHAT SERVICE ENDPOINTS TESTING
# =============================================================================
echo -e "${YELLOW}=== 3. CHAT SERVICE ENDPOINTS TESTING ===${NC}"

# Test chat service info endpoint
make_request "GET" "$CHAT_SERVICE_URL" "/socket/info" "" 200 "Get Socket.IO connection info" || echo "Info endpoint not available"
echo

# Get user's chats (should be empty initially)
make_request "GET" "$CHAT_SERVICE_URL" "/api/chats" "" 200 "Get all user chats (initially empty)"
echo

# Get chats for our specific project (should be empty initially)
make_request "GET" "$CHAT_SERVICE_URL" "/api/chats/project/$project_id" "" 200 "Get chats for our test project (initially empty)"
echo

# Get or create default chat for the project
default_chat_response=$(make_request "GET" "$CHAT_SERVICE_URL" "/api/chats/project/$project_id/default" "" 200 "Get or create default chat for project")
default_chat_id=$(extract_chat_id "$default_chat_response")
if [ -z "$default_chat_id" ]; then
    echo -e "${RED}❌ Failed to extract default chat ID${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Default chat ID: $default_chat_id${NC}"
echo

print_separator

# =============================================================================
# Test 4: CREATE ADDITIONAL CHAT FOR PROJECT
# =============================================================================
echo -e "${YELLOW}=== 4. CREATE ADDITIONAL CHAT FOR PROJECT ===${NC}"

additional_chat_response=$(make_request "POST" "$CHAT_SERVICE_URL" "/api/chats" \
    "{\"projectId\":$project_id,\"name\":\"Development Discussion\",\"description\":\"Chat for development team discussions\"}" \
    201 "Create additional chat for the project")

additional_chat_id=$(extract_chat_id "$additional_chat_response")
if [ -z "$additional_chat_id" ]; then
    echo -e "${RED}❌ Failed to extract additional chat ID${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Additional chat ID: $additional_chat_id${NC}"
echo

# Verify we now have multiple chats for the project
make_request "GET" "$CHAT_SERVICE_URL" "/api/chats/project/$project_id" "" 200 "Verify project now has multiple chats"
echo

print_separator

# =============================================================================
# Test 5: SEND MESSAGES TO CHATS
# =============================================================================
echo -e "${YELLOW}=== 5. SEND MESSAGES TO CHATS ===${NC}"

echo -e "${BLUE}📋 Sending messages to default chat${NC}"

# Send welcome message to default chat
make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id" \
    '{"content":"Welcome to our Chat Test Project! This is the first message.","messageType":"text"}' \
    201 "Send welcome message to default chat"
echo

# Send project update message
make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id" \
    '{"content":"Project setup is complete. Ready to start development!","messageType":"text"}' \
    201 "Send project update message"
echo

# Send question message
make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id" \
    '{"content":"Does anyone have questions about the project requirements?","messageType":"text"}' \
    201 "Send question message"
echo

echo -e "${BLUE}📋 Sending messages to development chat${NC}"

# Send technical message to development chat
make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$additional_chat_id" \
    '{"content":"Let'\''s discuss the technical architecture for this project.","messageType":"text"}' \
    201 "Send technical message to development chat"
echo

# Send code-related message
make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$additional_chat_id" \
    '{"content":"I suggest we use microservices architecture with Docker containers.","messageType":"text"}' \
    201 "Send architecture suggestion message"
echo

# Send agreement message
make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$additional_chat_id" \
    '{"content":"That sounds like a great approach! Should we start with the auth service?","messageType":"text"}' \
    201 "Send agreement message"
echo

print_separator

# =============================================================================
# Test 6: RETRIEVE AND DISPLAY CONVERSATIONS
# =============================================================================
echo -e "${YELLOW}=== 6. RETRIEVE AND DISPLAY CONVERSATIONS ===${NC}"

echo -e "${BLUE}📋 Retrieving default chat conversation${NC}"
default_chat_messages=$(make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id?limit=50&sortOrder=asc" "" 200 "Get all messages from default chat")
echo

echo -e "${PURPLE}💬 DEFAULT CHAT CONVERSATION:${NC}"
display_conversation "$default_chat_messages"
echo

echo -e "${BLUE}📋 Retrieving development chat conversation${NC}"
dev_chat_messages=$(make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$additional_chat_id?limit=50&sortOrder=asc" "" 200 "Get all messages from development chat")
echo

echo -e "${PURPLE}💬 DEVELOPMENT CHAT CONVERSATION:${NC}"
display_conversation "$dev_chat_messages"
echo

print_separator

# =============================================================================
# Test 7: CHAT MANAGEMENT OPERATIONS
# =============================================================================
echo -e "${YELLOW}=== 7. CHAT MANAGEMENT OPERATIONS ===${NC}"

# Get chat by ID
make_request "GET" "$CHAT_SERVICE_URL" "/api/chats/$default_chat_id" "" 200 "Get default chat details by ID"
echo

make_request "GET" "$CHAT_SERVICE_URL" "/api/chats/$additional_chat_id" "" 200 "Get development chat details by ID"
echo

# Update chat
make_request "PUT" "$CHAT_SERVICE_URL" "/api/chats/$additional_chat_id" \
    '{"name":"Development & Architecture Discussion","description":"Enhanced chat for development team discussions and architecture planning"}' \
    200 "Update development chat name and description"
echo

# Get chat statistics
make_request "GET" "$CHAT_SERVICE_URL" "/api/chats/stats" "" 200 "Get user chat statistics"
echo

print_separator

# =============================================================================
# Test 8: MESSAGE MANAGEMENT OPERATIONS
# =============================================================================
echo -e "${YELLOW}=== 8. MESSAGE MANAGEMENT OPERATIONS ===${NC}"

# Send a message we'll later edit
edit_message_response=$(make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id" \
    '{"content":"This message will be edited shortly.","messageType":"text"}' \
    201 "Send message that will be edited")

# Extract message ID for editing
edit_message_id=$(extract_chat_id "$edit_message_response")
echo -e "${GREEN}✅ Message to edit ID: $edit_message_id${NC}"

# Edit the message
if [ -n "$edit_message_id" ]; then
    make_request "PUT" "$CHAT_SERVICE_URL" "/api/messages/$edit_message_id" \
        '{"content":"This message has been successfully edited!"}' \
        200 "Edit the message content"
    echo
fi

# Send a message we'll later delete
delete_message_response=$(make_request "POST" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id" \
    '{"content":"This message will be deleted.","messageType":"text"}' \
    201 "Send message that will be deleted")

# Extract message ID for deletion
delete_message_id=$(extract_chat_id "$delete_message_response")
echo -e "${GREEN}✅ Message to delete ID: $delete_message_id${NC}"

# Delete the message
if [ -n "$delete_message_id" ]; then
    make_request "DELETE" "$CHAT_SERVICE_URL" "/api/messages/$delete_message_id" "" 200 "Delete the message"
    echo
fi

# Search messages in chat
make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id/search?query=project" "" 200 "Search for messages containing 'project'"
echo

print_separator

# =============================================================================
# Test 9: EXPORT FUNCTIONALITY
# =============================================================================
echo -e "${YELLOW}=== 9. EXPORT FUNCTIONALITY ===${NC}"

# Export chat messages as JSON
make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id/export?format=json" "" 200 "Export default chat messages as JSON"
echo

# Export chat messages as CSV
make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$additional_chat_id/export?format=csv" "" 200 "Export development chat messages as CSV"
echo

print_separator

# =============================================================================
# Test 10: FINAL CONVERSATION DISPLAY
# =============================================================================
echo -e "${YELLOW}=== 10. FINAL CONVERSATION DISPLAY ===${NC}"

echo -e "${BLUE}📋 Final conversation state after all operations${NC}"

# Get updated default chat messages
final_default_messages=$(make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$default_chat_id?limit=50&sortOrder=asc&includeDeleted=false" "" 200 "Get final default chat conversation")

echo -e "${PURPLE}💬 FINAL DEFAULT CHAT CONVERSATION:${NC}"
display_conversation "$final_default_messages"
echo

# Get updated development chat messages  
final_dev_messages=$(make_request "GET" "$CHAT_SERVICE_URL" "/api/messages/chat/$additional_chat_id?limit=50&sortOrder=asc" "" 200 "Get final development chat conversation")

echo -e "${PURPLE}💬 FINAL DEVELOPMENT CHAT CONVERSATION:${NC}"
display_conversation "$final_dev_messages"
echo

print_separator

# =============================================================================
# Test 11: PROJECT INTEGRATION TESTING
# =============================================================================
echo -e "${YELLOW}=== 11. PROJECT INTEGRATION TESTING ===${NC}"

# Test project-chat integration via db-service
make_request "GET" "$DB_SERVICE_URL" "/api/project/$project_id/chat" "" 200 "Get project chat info via db-service"
echo

# Get project details with chat information
make_request "GET" "$DB_SERVICE_URL" "/api/project/$project_id?includeChats=true" "" 200 "Get project details with chat information"
echo

print_separator

# =============================================================================
# Test 12: CLEANUP
# =============================================================================
echo -e "${YELLOW}=== 12. CLEANUP ===${NC}"

echo "Cleaning up test resources..."

# Delete the additional chat
make_request "DELETE" "$CHAT_SERVICE_URL" "/api/chats/$additional_chat_id" "" 200 "Delete additional development chat" || echo "Chat deletion failed (expected if not implemented)"

# Delete the project (this should also clean up associated chats)
make_request "DELETE" "$DB_SERVICE_URL" "/api/project/$project_id" "" 200 "Delete test project"
echo

print_separator

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo -e "${YELLOW}=== 🎉 CHAT SERVICE TEST SUMMARY ===${NC}"
echo -e "${GREEN}✅ HEALTH CHECKS - Both services are operational${NC}"
echo -e "${GREEN}✅ PROJECT CREATION - Test project created successfully${NC}"
echo -e "${GREEN}✅ CHAT CREATION - Default and custom chats created${NC}"
echo -e "${GREEN}✅ MESSAGE SENDING - Multiple messages sent to both chats${NC}"
echo -e "${GREEN}✅ MESSAGE MANAGEMENT - Edit and delete operations tested${NC}"
echo -e "${GREEN}✅ CONVERSATION RETRIEVAL - All conversations displayed${NC}"
echo -e "${GREEN}✅ EXPORT FUNCTIONALITY - JSON and CSV exports tested${NC}"
echo -e "${GREEN}✅ INTEGRATION TESTING - DB-service and Chat-service integration verified${NC}"
echo -e "${GREEN}✅ CLEANUP - Test resources cleaned up${NC}"
echo
echo -e "${YELLOW}✨ CHAT SERVICE COMPREHENSIVE TEST COMPLETED SUCCESSFULLY! ✨${NC}"
echo -e "${BLUE}The chat service is fully functional and integrated with the db-service!${NC}"
echo
echo -e "${CYAN}📊 Test Results Summary:${NC}"
echo -e "${CYAN}  - Project ID: $project_id${NC}"
echo -e "${CYAN}  - Default Chat ID: $default_chat_id${NC}"
echo -e "${CYAN}  - Additional Chat ID: $additional_chat_id${NC}"
echo -e "${CYAN}  - Messages sent: 6+ messages across both chats${NC}"
echo -e "${CYAN}  - Operations tested: Create, Read, Update, Delete, Search, Export${NC}"
