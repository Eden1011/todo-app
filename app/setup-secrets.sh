#!/bin/bash

# setup-secrets.sh
# Skrypt do konfiguracji Docker Secrets

set -e

# Kolory
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Funkcja do generowania silnych haseł
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Funkcja do generowania sekretów JWT
generate_jwt_secret() {
    openssl rand -hex 64
}

# Utwórz katalog secrets jeśli nie istnieje
SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"

log "Konfigurowanie Docker Secrets w katalogu: $SECRETS_DIR"

# Sprawdź czy pliki już istnieją
check_existing() {
    local file="$SECRETS_DIR/$1"
    if [ -f "$file" ]; then
        warn "Plik $1 już istnieje"
        read -p "Czy chcesz go nadpisać? (y/N): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            echo "Pomijam $1"
            return 1
        fi
    fi
    return 0
}

# Tworzenie plików z sekretami
create_secret_file() {
    local filename=$1
    local value=$2
    local description=$3
    
    if check_existing "$filename"; then
        echo "$value" > "$SECRETS_DIR/$filename"
        chmod 600 "$SECRETS_DIR/$filename"
        log "✅ Utworzono: $filename ($description)"
    fi
}

log "Generowanie sekretów..."

# MySQL secrets
create_secret_file "mysql_root_password.txt" "$(generate_password 24)" "MySQL root password"
create_secret_file "mysql_password.txt" "$(generate_password 20)" "MySQL app user password"

# MongoDB secrets
create_secret_file "mongodb_password.txt" "$(generate_password 20)" "MongoDB admin password"

# JWT secrets
create_secret_file "access_token_secret.txt" "$(generate_jwt_secret)" "JWT Access Token Secret"
create_secret_file "refresh_token_secret.txt" "$(generate_jwt_secret)" "JWT Refresh Token Secret"

# SMTP secret (będzie wymagać ręcznej konfiguracji)
if check_existing "smtp_password.txt"; then
    echo "# Wklej tutaj hasło aplikacji Gmail" > "$SECRETS_DIR/smtp_password.txt"
    echo "# Usuń ten komentarz i wklej rzeczywiste hasło" >> "$SECRETS_DIR/smtp_password.txt"
    echo "your_gmail_app_password_here" >> "$SECRETS_DIR/smtp_password.txt"
    chmod 600 "$SECRETS_DIR/smtp_password.txt"
    warn "📧 SMTP password: Musisz ręcznie edytować $SECRETS_DIR/smtp_password.txt"
fi

# Google OAuth secret (będzie wymagać ręcznej konfiguracji)
if check_existing "google_client_secret.txt"; then
    echo "# Wklej tutaj Google OAuth Client Secret" > "$SECRETS_DIR/google_client_secret.txt"
    echo "# Usuń ten komentarz i wklej rzeczywisty secret" >> "$SECRETS_DIR/google_client_secret.txt"
    echo "your_google_client_secret_here" >> "$SECRETS_DIR/google_client_secret.txt"
    chmod 600 "$SECRETS_DIR/google_client_secret.txt"
    warn "🔑 Google OAuth: Musisz ręcznie edytować $SECRETS_DIR/google_client_secret.txt"
fi

# Utwórz katalogi dla danych jeśli nie istnieją
mkdir -p ./data/mariadb
mkdir -p ./data/mongodb

# Ustaw odpowiednie uprawnienia
chmod 755 ./data/mariadb
chmod 755 ./data/mongodb

# Utwórz plik .env z build variables
ENV_FILE=".env"
if check_existing "../.env"; then
    cat > "$ENV_FILE" << EOF
# Build variables
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VERSION=1.0.0
REGISTRY=localhost:5000

# Compose variables
COMPOSE_PROJECT_NAME=todo-app
COMPOSE_FILE=docker-compose.yml
EOF
    log "✅ Utworzono plik .env z zmiennymi budowania"
fi

# Utwórz plik .gitignore dla sekretów
GITIGNORE_FILE="$SECRETS_DIR/.gitignore"
cat > "$GITIGNORE_FILE" << EOF
# Ignoruj wszystkie sekrety
*.txt
*.key
*.pem
*.p12
*.pfx

# Ale pozwól na README
!README.md
!.gitignore
EOF

# Utwórz README dla sekretów
README_FILE="$SECRETS_DIR/README.md"
cat > "$README_FILE" << EOF
# Docker Secrets

Ten katalog zawiera wrażliwe dane używane przez aplikację Todo App.

## Pliki sekretów:

- \`mysql_root_password.txt\` - Hasło root dla MySQL/MariaDB
- \`mysql_password.txt\` - Hasło użytkownika aplikacji dla MySQL
- \`mongodb_password.txt\` - Hasło admin dla MongoDB
- \`access_token_secret.txt\` - Sekret dla JWT access tokens
- \`refresh_token_secret.txt\` - Sekret dla JWT refresh tokens
- \`smtp_password.txt\` - Hasło aplikacji Gmail dla SMTP
- \`google_client_secret.txt\` - Google OAuth Client Secret

## Bezpieczeństwo:

- Wszystkie pliki mają uprawnienia 600 (tylko owner może czytać)
- Katalog jest w .gitignore - sekrety nie są commitowane do repo
- W produkcji używaj zewnętrznych menedżerów sekretów (AWS Secrets Manager, HashiCorp Vault, itp.)

## Konfiguracja ręczna:

1. Edytuj \`smtp_password.txt\` - wklej hasło aplikacji Gmail
2. Edytuj \`google_client_secret.txt\` - wklej Google OAuth Client Secret
3. Uruchom \`docker-compose up -d\`

## Regeneracja sekretów:

Uruchom ponownie \`./setup-secrets.sh\` aby wygenerować nowe sekrety.
EOF

log "✅ Konfiguracja sekretów zakończona!"
echo ""
echo -e "${YELLOW}⚠️  WYMAGANE AKCJE:${NC}"
echo "1. Edytuj $SECRETS_DIR/smtp_password.txt - wklej hasło aplikacji Gmail"
echo "2. Edytuj $SECRETS_DIR/google_client_secret.txt - wklej Google OAuth Client Secret"
echo "3. Sprawdź uprawnienia plików: ls -la $SECRETS_DIR"
echo ""
log "Sekrety są gotowe do użycia z Docker Compose!"

# Pokaż status
echo ""
log "Status plików sekretów:"
ls -la "$SECRETS_DIR/"
