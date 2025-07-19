-- PostgreSQL initialization script for YTMS

-- Grant the ability for your user to connect to the database.
GRANT CONNECT ON DATABASE ytms_db TO ytms_user;

-- Grant the USAGE privilege on the public schema. This allows the user to access objects in the schema.
GRANT USAGE ON SCHEMA public TO ytms_user;

-- Grant the CREATE privilege on the public schema. This allows the user to create new tables, views, etc.
GRANT CREATE ON SCHEMA public TO ytms_user;

-- You might also want to grant permissions on all tables within the public schema.
-- This is particularly useful for ongoing operations.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ytms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ytms_user;

                            
GRANT USAGE ON SCHEMA public TO ytms_user;
GRANT CREATE ON SCHEMA public TO ytms_user;

-- Drop existing types if they exist (for development)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS privacy_level CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- Create custom enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'USER');
CREATE TYPE task_status AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'READY', 'SCHEDULED', 'UPLOADED');
CREATE TYPE privacy_level AS ENUM ('ALL', 'SELECTED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'DELETED');



-- Grant usage on types to application user
GRANT USAGE ON TYPE user_role TO ytms_user;
GRANT USAGE ON TYPE task_status TO ytms_user;
GRANT USAGE ON TYPE task_priority TO ytms_user;
GRANT USAGE ON TYPE privacy_level TO ytms_user;
GRANT USAGE ON TYPE user_status TO ytms_user;


---

-- Add refresh_token_key column to youtube_channels table
ALTER TABLE youtube_channels
    ADD COLUMN refresh_token_key VARCHAR(100)
    AFTER youtube_channel_owner_email;

-- Set default refresh token keys for existing channels
UPDATE youtube_channels
SET refresh_token_key = CONCAT('YT_REFRESH_TOKEN_',
                               UPPER(REPLACE(REPLACE(REPLACE(channel_name, ' ', '_'), '-', '_'), '.', '_')))
WHERE refresh_token_key IS NULL;

-- Add index for better performance
CREATE INDEX idx_youtube_channels_refresh_token_key
    ON youtube_channels(refresh_token_key);