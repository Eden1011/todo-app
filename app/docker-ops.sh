#!/bin/bash



set -e


RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' 


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


check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}


check_compose_file() {
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found in current directory."
        exit 1
    fi
}


start_services() {
    print_status "Building and starting all services..."
    docker-compose up --build -d
    print_success "All services started successfully!"
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    show_status
}


stop_services() {
    print_status "Stopping all services..."
    docker-compose down
    print_success "All services stopped successfully!"
}


restart_services() {
    print_status "Restarting all services..."
    docker-compose down
    docker-compose up --build -d
    print_success "All services restarted successfully!"
}


show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_status "Health Check Results:"
    
    
    if curl -s http://localhost:3000/health > /dev/null; then
        print_success "Auth Service (port 3000) - OK"
    else
        print_error "Auth Service (port 3000) - FAILED"
    fi
    
    
    if curl -s http://localhost:4000/health > /dev/null; then
        print_success "DB Service (port 4000) - OK"
    else
        print_error "DB Service (port 4000) - FAILED"
    fi
    
    
    if curl -s http://localhost:5000/health > /dev/null; then
        print_success "Chat Service (port 5000) - OK"
    else
        print_error "Chat Service (port 5000) - FAILED"
    fi
}


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


shell() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service name (auth-service, db-service, chat-service, mariadb, mongodb)"
        exit 1
    fi
    
    print_status "Opening shell for $service..."
    docker-compose exec "$service" sh
}


backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups/$timestamp"
    mkdir -p "$backup_dir"
    
    print_status "Creating database backups..."
    
    
    if ! docker-compose ps | grep -q "mariadb.*Up"; then
        print_error "MariaDB service is not running. Please start services first."
        exit 1
    fi
    
    if ! docker-compose ps | grep -q "mongodb.*Up"; then
        print_error "MongoDB service is not running. Please start services first."
        exit 1
    fi
    
    
    print_status "Backing up MariaDB..."
    if docker-compose exec mariadb mysqldump -u todoapp -ppassword --all-databases > "$backup_dir/mariadb_backup.sql"; then
        print_success "MariaDB backup completed"
    else
        print_error "MariaDB backup failed"
        exit 1
    fi
    
    
    print_status "Backing up MongoDB..."
    if docker-compose exec mongodb mongodump --username admin --password password --authenticationDatabase admin --out /tmp/mongodump; then
        docker cp $(docker-compose ps -q mongodb):/tmp/mongodump "$backup_dir/mongodb_backup"
        print_success "MongoDB backup completed"
    else
        print_error "MongoDB backup failed"
        exit 1
    fi
    
    
    cat > "$backup_dir/backup_info.txt" << EOF
Backup Information
==================
Timestamp: $timestamp
Date: $(date)
MariaDB: mariadb_backup.sql
MongoDB: mongodb_backup/
Services: auth-service, db-service, chat-service
EOF
    
    print_success "Backups created in $backup_dir"
    print_status "Backup size: $(du -sh "$backup_dir" | cut -f1)"
}


list_backups() {
    if [ ! -d "backups" ]; then
        print_warning "No backup directory found."
        return 1
    fi
    
    local backups=$(find backups -maxdepth 1 -type d -name "20*" | sort -r)
    
    if [ -z "$backups" ]; then
        print_warning "No backups found."
        return 1
    fi
    
    print_status "Available backups:"
    echo ""
    local counter=1
    for backup in $backups; do
        local backup_name=$(basename "$backup")
        local backup_date=$(date -d "${backup_name:0:8} ${backup_name:9:2}:${backup_name:11:2}:${backup_name:13:2}" 2>/dev/null || echo "Unknown date")
        local backup_size=$(du -sh "$backup" 2>/dev/null | cut -f1 || echo "Unknown size")
        
        printf "%2d) %s (%s) - %s\n" "$counter" "$backup_name" "$backup_date" "$backup_size"
        counter=$((counter + 1))
    done
    echo ""
}


restore() {
    local backup_timestamp=$1
    
    
    if [ -z "$backup_timestamp" ]; then
        if ! list_backups; then
            return 1
        fi
        
        echo -n "Enter backup timestamp (format: YYYYMMDD_HHMMSS) or backup number: "
        read -r user_input
        
        
        if [[ "$user_input" =~ ^[0-9]+$ ]]; then
            local backups=($(find backups -maxdepth 1 -type d -name "20*" | sort -r))
            local backup_index=$((user_input - 1))
            
            if [ $backup_index -ge 0 ] && [ $backup_index -lt ${#backups[@]} ]; then
                backup_timestamp=$(basename "${backups[$backup_index]}")
            else
                print_error "Invalid backup number."
                return 1
            fi
        else
            backup_timestamp="$user_input"
        fi
    fi
    
    local backup_dir="backups/$backup_timestamp"
    
    
    if [ ! -d "$backup_dir" ]; then
        print_error "Backup directory $backup_dir not found."
        return 1
    fi
    
    
    if [ ! -f "$backup_dir/mariadb_backup.sql" ]; then
        print_error "MariaDB backup file not found in $backup_dir"
        return 1
    fi
    
    if [ ! -d "$backup_dir/mongodb_backup" ]; then
        print_error "MongoDB backup directory not found in $backup_dir"
        return 1
    fi
    
    
    print_warning "This will COMPLETELY REPLACE all current database data with backup from $backup_timestamp"
    print_warning "ALL CURRENT DATA WILL BE LOST!"
    echo ""
    read -p "Are you absolutely sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled."
        return 0
    fi
    
    
    if ! docker-compose ps | grep -q "mariadb.*Up"; then
        print_error "MariaDB service is not running. Please start services first."
        return 1
    fi
    
    if ! docker-compose ps | grep -q "mongodb.*Up"; then
        print_error "MongoDB service is not running. Please start services first."
        return 1
    fi
    
    print_status "Starting restore from backup: $backup_timestamp"
    
    
    print_status "Stopping application services..."
    docker-compose stop auth-service db-service chat-service
    
    
    print_status "Restoring MariaDB..."
    if docker-compose exec -T mariadb mysql -u todoapp -ppassword < "$backup_dir/mariadb_backup.sql"; then
        print_success "MariaDB restore completed"
    else
        print_error "MariaDB restore failed"
        print_status "Restarting application services..."
        docker-compose start auth-service db-service chat-service
        return 1
    fi
    
    
    print_status "Restoring MongoDB..."
    
    
    docker cp "$backup_dir/mongodb_backup" $(docker-compose ps -q mongodb):/tmp/mongodb_restore
    
    
    if docker-compose exec mongodb mongorestore --username admin --password password --authenticationDatabase admin --drop /tmp/mongodb_restore; then
        print_success "MongoDB restore completed"
    else
        print_error "MongoDB restore failed"
        print_status "Restarting application services..."
        docker-compose start auth-service db-service chat-service
        return 1
    fi
    
    
    docker-compose exec mongodb rm -rf /tmp/mongodb_restore
    
    
    print_status "Restarting application services..."
    docker-compose start auth-service db-service chat-service
    
    
    print_status "Waiting for services to start..."
    sleep 15
    
    print_success "Database restore completed successfully!"
    print_status "Backup restored: $backup_timestamp"
    
    
    show_status
}


test_backup_restore() {
    print_status "Testing backup and restore functionality..."
    
    
    print_status "Creating test backup..."
    backup
    
    
    local latest_backup=$(find backups -maxdepth 1 -type d -name "20*" | sort -r | head -1)
    local backup_name=$(basename "$latest_backup")
    
    if [ -z "$backup_name" ]; then
        print_error "No backup created for testing"
        return 1
    fi
    
    print_status "Test backup created: $backup_name"
    print_status "To test restore, run: $0 restore $backup_name"
    print_warning "Note: Restore will replace all current data!"
}


usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|cleanup|reset-db|shell|backup|restore|list-backups|test-backup|help}"
    echo ""
    echo "Commands:"
    echo "  start         - Build and start all services"
    echo "  stop          - Stop all services"
    echo "  restart       - Restart all services"
    echo "  status        - Show service status and health"
    echo "  logs          - Show logs (optional: specify service name)"
    echo "  cleanup       - Remove all containers, networks, and volumes"
    echo "  reset-db      - Reset all databases"
    echo "  shell         - Open shell in container (requires service name)"
    echo "  backup        - Backup all databases"
    echo "  restore       - Restore databases from backup (optional: timestamp)"
    echo "  list-backups  - List all available backups"
    echo "  test-backup   - Test backup functionality"
    echo "  help          - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs auth-service"
    echo "  $0 shell mariadb"
    echo "  $0 backup"
    echo "  $0 restore"
    echo "  $0 restore 20250607_143021"
    echo "  $0 list-backups"
}


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
        restore)
            restore "$2"
            ;;
        list-backups)
            list_backups
            ;;
        test-backup)
            test_backup_restore
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


main "$@"
