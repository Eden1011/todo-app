#!/bin/bash

# docker-ops.sh - Docker operations script for Todo App

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose.yml exists
check_compose_file() {
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found in current directory."
        exit 1
    fi
}

# Function to start all services
start_services() {
    print_status "Building and starting all services..."
    docker-compose up --build -d
    print_success "All services started successfully!"
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    show_status
}

# Function to stop all services
stop_services() {
    print_status "Stopping all services..."
    docker-compose down
    print_success "All services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_status "Restarting all services..."
    docker-compose down
    docker-compose up --build -d
    print_success "All services restarted successfully!"
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_status "Health Check Results:"
    
    # Check auth-service
    if curl -s http://localhost:3000/health > /dev/null; then
        print_success "Auth Service (port 3000) - OK"
    else
        print_error "Auth Service (port 3000) - FAILED"
    fi
    
    # Check db-service
    if curl -s http://localhost:4000/health > /dev/null; then
        print_success "DB Service (port 4000) - OK"
    else
        print_error "DB Service (port 4000) - FAILED"
    fi
    
    # Check chat-service
    if curl -s http://localhost:5000/health > /dev/null; then
        print_success "Chat Service (port 5000) - OK"
    else
        print_error "Chat Service (port 5000) - FAILED"
    fi
}

# Function to show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $service..."
        docker-compose logs -f "$service"
    fi
}

# Function to clean up everything (including volumes)
cleanup() {
    print_warning "This will remove all containers, networks, and volumes (ALL DATA WILL BE LOST)."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to reset database
reset_db() {
    print_warning "This will reset all databases (ALL DATA WILL BE LOST)."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting databases..."
        docker-compose stop auth-service db-service chat-service
        docker-compose rm -f auth-service db-service chat-service
        docker volume rm $(docker-compose config --volumes | grep -E "(mariadb|mongodb)")_data 2>/dev/null || true
        docker-compose up --build -d
        print_success "Databases reset completed!"
    else
        print_status "Database reset cancelled."
    fi
}

# Function to enter a container shell
shell() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service name (auth-service, db-service, chat-service, mariadb, mongodb)"
        exit 1
    fi
    
    print_status "Opening shell for $service..."
    docker-compose exec "$service" sh
}

# Function to backup databases
backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups/$timestamp"
    mkdir -p "$backup_dir"
    
    print_status "Creating database backups..."
    
    # Backup MariaDB
    docker-compose exec mariadb mysqldump -u todoapp -ppassword --all-databases > "$backup_dir/mariadb_backup.sql"
    
    # Backup MongoDB
    docker-compose exec mongodb mongodump --username admin --password password --authenticationDatabase admin --out /tmp/mongodump
    docker cp $(docker-compose ps -q mongodb):/tmp/mongodump "$backup_dir/mongodb_backup"
    
    print_success "Backups created in $backup_dir"
}

# Function to show usage
usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|cleanup|reset-db|shell|backup|help}"
    echo ""
    echo "Commands:"
    echo "  start      - Build and start all services"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  status     - Show service status and health"
    echo "  logs       - Show logs (optional: specify service name)"
    echo "  cleanup    - Remove all containers, networks, and volumes"
    echo "  reset-db   - Reset all databases"
    echo "  shell      - Open shell in container (requires service name)"
    echo "  backup     - Backup all databases"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs auth-service"
    echo "  $0 shell mariadb"
}

# Main script logic
main() {
    check_docker
    check_compose_file
    
    case "${1:-help}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        cleanup)
            cleanup
            ;;
        reset-db)
            reset_db
            ;;
        shell)
            shell "$2"
            ;;
        backup)
            backup
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
