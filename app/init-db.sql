CREATE DATABASE IF NOT EXISTS `auth_service` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `db_service` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `auth_service`.* TO 'todoapp'@'%';
GRANT ALL PRIVILEGES ON `db_service`.* TO 'todoapp'@'%';

FLUSH PRIVILEGES;
