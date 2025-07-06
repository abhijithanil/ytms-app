-- PostgreSQL initialization script for YTMS

-- Drop existing types if they exist (for development)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS privacy_level CASCADE;

-- Create custom enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'USER');
CREATE TYPE task_status AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'READY', 'SCHEDULED', 'UPLOADED');
CREATE TYPE privacy_level AS ENUM ('ALL', 'SELECTED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Grant usage on types to application user
GRANT USAGE ON TYPE user_role TO ytms_user;
GRANT USAGE ON TYPE task_status TO ytms_user;
GRANT USAGE ON TYPE task_priority TO ytms_user;
GRANT USAGE ON TYPE privacy_level TO ytms_user;