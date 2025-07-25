sudo -u postgres psql
CREATE DATABASE ytms_db OWNER ytms_user;
\c ytms_db

-- PostgreSQL initialization script for YTMS
CREATE USER ytms_user WITH PASSWORD 'ytms_password';
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
CREATE TYPE task_status AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'READY', 'SCHEDULED', 'UPLOADED', 'UPLOADING', 'COMPLETED');
CREATE TYPE privacy_level AS ENUM ('ALL', 'SELECTED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'DELETED');
ALTER TABLE video_tasks
    DROP CONSTRAINT video_tasks_task_status_check;

ALTER TABLE video_tasks
    ADD CONSTRAINT video_tasks_task_status_check
        CHECK (task_status IN (
                               'DRAFT',
                               'ASSIGNED',
                               'IN_PROGRESS',
                               'REVIEW',
                               'READY',
                               'SCHEDULED',
                               'UPLOADED',
                               'UPLOADING',
                               'COMPLETED'
            ));


-- Grant usage on types to application user
GRANT USAGE ON TYPE user_role TO ytms_user;
GRANT USAGE ON TYPE task_status TO ytms_user;
GRANT USAGE ON TYPE task_priority TO ytms_user;
GRANT USAGE ON TYPE privacy_level TO ytms_user;
GRANT USAGE ON TYPE user_status TO ytms_user;


---
--
-- -- Add refresh_token_key column to youtube_channels table
-- ALTER TABLE youtube_channels
--     ADD COLUMN refresh_token_key VARCHAR(100)
--     AFTER youtube_channel_owner_email;
--
-- -- Set default refresh token keys for existing channels
-- UPDATE youtube_channels
-- SET refresh_token_key = CONCAT('YT_REFRESH_TOKEN_',
--                                UPPER(REPLACE(REPLACE(REPLACE(channel_name, ' ', '_'), '-', '_'), '.', '_')))
-- WHERE refresh_token_key IS NULL;
--
-- -- Add index for better performance
-- CREATE INDEX idx_youtube_channels_refresh_token_key
--     ON youtube_channels(refresh_token_key);


-- Add file size column to revisions table
ALTER TABLE revisions ADD COLUMN file_size BIGINT;

-- Ensure revision type column exists with default
ALTER TABLE revisions ADD COLUMN type VARCHAR(10) DEFAULT 'main';

-- Update existing revisions to have 'main' type if null
UPDATE revisions SET type = 'main' WHERE type IS NULL;

-- Create raw_videos table for multiple video support
CREATE TABLE raw_videos (
    id BIGSERIAL PRIMARY KEY,
    video_task_id BIGINT NOT NULL REFERENCES video_tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(10) NOT NULL DEFAULT 'main', -- 'main' or 'short'
    size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Drop table raw_videos cascade

-- Create index for better performance
CREATE INDEX idx_raw_videos_task_id ON raw_videos(video_task_id);
CREATE INDEX idx_raw_videos_type ON raw_videos(type);

-- Update video_metadata table to support revision and raw video specific metadata
ALTER TABLE video_metadata ADD COLUMN revision_id BIGINT REFERENCES revisions(id) ON DELETE CASCADE;
ALTER TABLE video_metadata ADD COLUMN raw_video_id BIGINT REFERENCES raw_videos(id) ON DELETE CASCADE;
ALTER TABLE video_metadata ADD COLUMN video_type VARCHAR(10) DEFAULT 'MAIN';
ALTER TABLE video_metadata ADD COLUMN is_short BOOLEAN DEFAULT FALSE;
ALTER TABLE video_metadata ADD COLUMN short_hashtags TEXT;

-- Ensure only one of video_task_id, revision_id, or raw_video_id is set
ALTER TABLE video_metadata ADD CONSTRAINT check_metadata_target
    CHECK ((video_task_id IS NOT NULL)::integer +
           (revision_id IS NOT NULL)::integer +
           (raw_video_id IS NOT NULL)::integer = 1);