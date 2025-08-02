-- Chat system initialization script
-- This script creates default channels and sample data for the chat feature

-- Create default general channel
INSERT INTO chat_channels (name, description, type, created_by, created_at, is_private) 
SELECT 'general', 'General discussion for all team members', 'GENERAL', u.id, NOW(), false
FROM users u 
WHERE u.role = 'ADMIN' 
LIMIT 1;

-- Create project-related channel
INSERT INTO chat_channels (name, description, type, created_by, created_at, is_private) 
SELECT 'project-updates', 'Channel for project updates and announcements', 'PROJECT', u.id, NOW(), false
FROM users u 
WHERE u.role = 'ADMIN' 
LIMIT 1;

-- Create task-related channel
INSERT INTO chat_channels (name, description, type, created_by, created_at, is_private) 
SELECT 'task-discussions', 'Discuss specific video editing tasks', 'TASK', u.id, NOW(), false
FROM users u 
WHERE u.role = 'ADMIN' 
LIMIT 1;

-- Add all existing users to the general channel
INSERT INTO user_channel_membership (user_id, channel_id, role, joined_at, last_read_at, is_muted)
SELECT u.id, c.id, 'MEMBER', NOW(), NOW(), false
FROM users u
CROSS JOIN chat_channels c
WHERE c.name = 'general';

-- Make the first admin user the owner of all default channels
UPDATE user_channel_membership 
SET role = 'OWNER' 
WHERE user_id = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
AND channel_id IN (SELECT id FROM chat_channels WHERE name IN ('general', 'project-updates', 'task-discussions'));

-- Add some welcome messages to the general channel
INSERT INTO chat_messages (content, sender_id, channel_id, message_type, created_at, updated_at, is_edited, is_deleted)
SELECT 
    'Welcome to the YTMS Chat! 🎬 This is where our team collaborates on video editing projects.',
    u.id,
    c.id,
    'SYSTEM',
    NOW(),
    NOW(),
    false,
    false
FROM users u
CROSS JOIN chat_channels c
WHERE u.role = 'ADMIN' AND c.name = 'general'
LIMIT 1;

INSERT INTO chat_messages (content, sender_id, channel_id, message_type, created_at, updated_at, is_edited, is_deleted)
SELECT 
    'Feel free to ask questions, share updates, and collaborate on your video editing tasks here! 💬',
    u.id,
    c.id,
    'TEXT',
    NOW() + INTERVAL 1 MINUTE,
    NOW() + INTERVAL 1 MINUTE,
    false,
    false
FROM users u
CROSS JOIN chat_channels c
WHERE u.role = 'ADMIN' AND c.name = 'general'
LIMIT 1;