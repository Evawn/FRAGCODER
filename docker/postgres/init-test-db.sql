-- PostgreSQL initialization script
-- Creates test database alongside the main development database
-- This script runs automatically when PostgreSQL container is first created

-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE shader_playground_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shader_playground_test')\gexec

-- Grant all privileges to shader_user on test database
GRANT ALL PRIVILEGES ON DATABASE shader_playground_test TO shader_user;
