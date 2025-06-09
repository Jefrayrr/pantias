-- MySQL Schema for Form Builder
-- This replaces the PostgreSQL schema

-- Create database
CREATE DATABASE IF NOT EXISTS form_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE form_builder;

-- Create user_role enum equivalent using CHECK constraint
-- MySQL doesn't have ENUM types like PostgreSQL, so we'll use VARCHAR with CHECK

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSON NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    INDEX idx_created_by (created_by),
    INDEX idx_updated_at (updated_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    form_id VARCHAR(36) NOT NULL,
    form_version INT NOT NULL,
    responses JSON NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_offline BOOLEAN DEFAULT FALSE,
    INDEX idx_form_id (form_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (id, username, password, role) VALUES 
(UUID(), 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Note: The password hash above is for 'admin123' - change this in production!