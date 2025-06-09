# Docker Secrets

Ten katalog zawiera wrażliwe dane używane przez aplikację Todo App.

## Pliki sekretów:

- `mysql_root_password.txt` - Hasło root dla MySQL/MariaDB
- `mysql_password.txt` - Hasło użytkownika aplikacji dla MySQL
- `mongodb_password.txt` - Hasło admin dla MongoDB
- `access_token_secret.txt` - Sekret dla JWT access tokens
- `refresh_token_secret.txt` - Sekret dla JWT refresh tokens
- `smtp_password.txt` - Hasło aplikacji Gmail dla SMTP
- `google_client_secret.txt` - Google OAuth Client Secret

## Bezpieczeństwo:

- Wszystkie pliki mają uprawnienia 600 (tylko owner może czytać)
- Katalog jest w .gitignore - sekrety nie są commitowane do repo
- W produkcji używaj zewnętrznych menedżerów sekretów (AWS Secrets Manager, HashiCorp Vault, itp.)

## Konfiguracja ręczna:

1. Edytuj `smtp_password.txt` - wklej hasło aplikacji Gmail
2. Edytuj `google_client_secret.txt` - wklej Google OAuth Client Secret
3. Uruchom `docker-compose up -d`

## Regeneracja sekretów:

Uruchom ponownie `./setup-secrets.sh` aby wygenerować nowe sekrety.
