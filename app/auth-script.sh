#!/bin/bash


BASE_URL="http://localhost:3000"


RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' 




print_step() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}


make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local description="$4"

    echo -e "${BLUE}📋 $description${NC}"

    
    local curl_cmd="curl -s -w \"\nHTTP_STATUS:%{http_code}\" -X $method"
    curl_cmd+=" -H \"Content-Type: application/json\""
    if [ -n "$data" ]; then
        curl_cmd+=" -d '$data'"
    fi
    curl_cmd+=" \"$BASE_URL$endpoint\""

    
    echo -e "${CYAN}🔧 Executing:${NC} $curl_cmd"
    response=$(eval $curl_cmd)
    
    
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | sed 's/HTTP_STATUS://')
    response_body=$(echo "$response" | sed '$d')

    echo -e "${PURPLE}📦 Response (Status: $http_status):${NC}"
    
    if command -v jq &> /dev/null && echo "$response_body" | jq . > /dev/null 2>&1; then
        echo "$response_body" | jq .
    else
        echo "$response_body"
    fi
}




login_user_command() {
    print_step "LOGIN UTILITY"
    
    for arg in "$@"; do
        case $arg in
            username=*)
            USERNAME="${arg#*=}"
            shift
            ;;
            email=*)
            EMAIL="${arg#*=}"
            shift
            ;;
            password=*)
            PASSWORD="${arg#*=}"
            shift
            ;;
        esac
    done

    
    if [ -z "$PASSWORD" ]; then
        echo -e "${RED}Error: 'password' is required.${NC}"
        exit 1
    fi
    if [ -z "$USERNAME" ] && [ -z "$EMAIL" ]; then
        echo -e "${RED}Error: 'username' or 'email' is required.${NC}"
        exit 1
    fi

    
    login_payload="{\"password\":\"$PASSWORD\""
    if [ -n "$USERNAME" ]; then
        login_payload+=", \"username\":\"$USERNAME\""
    fi
    if [ -n "$EMAIL" ]; then
        login_payload+=", \"email\":\"$EMAIL\""
    fi
    login_payload+="}"
    
    make_request "POST" "/local/user/login" "$login_payload" "Logging in user..."
}


register_user_command() {
    print_step "REGISTER UTILITY"
    
    for arg in "$@"; do
        case $arg in
            username=*)
            USERNAME="${arg#*=}"
            shift
            ;;
            email=*)
            EMAIL="${arg#*=}"
            shift
            ;;
            password=*)
            PASSWORD="${arg#*=}"
            shift
            ;;
        esac
    done

    
    if [ -z "$USERNAME" ] || [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
        echo -e "${RED}Error: 'username', 'email', and 'password' are required arguments.${NC}"
        exit 1
    fi

    
    register_payload="{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
    make_request "POST" "/local/user/register" "$register_payload" "Registering new user..."
}




usage() {
    echo "Usage: $0 {login|register} [args...]"
    echo ""
    echo "Commands:"
    echo "  login      - Log in a user. Requires 'username' or 'email' and 'password'."
    echo "             Example: $0 login username=test password=pass"
    echo ""
    echo "  register   - Register a new user. Requires 'username', 'email', and 'password'."
    echo "             Example: $0 register username=test email=t@t.com password=pass"
}


if [ $# -eq 0 ]; then
    usage
    exit 1
fi


if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: 'jq' is not installed. JSON output will not be pretty-printed. Please install jq for better readability.${NC}"
fi


case "$1" in
    login)
        shift 
        login_user_command "$@"
        ;;
    register)
        shift 
        register_user_command "$@"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
