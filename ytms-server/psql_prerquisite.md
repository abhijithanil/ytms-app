# ⚙️ Database Prerequisites for YTMS

This document outlines the necessary SQL commands to set up the PostgreSQL database for the YTMS (YouTube Task Management System) application. It includes creating a dedicated user and database, assigning the correct permissions, and defining custom data types required for the application to function correctly.

---

### Instructions

You can execute these commands in a few ways:
1.  **Interactively:** Connect to PostgreSQL as a superuser (like `postgres`) and run each command one by one.
2.  **As a Script:** Save the complete script at the end of this file as `init.sql` and run it using `psql -U postgres -f init.sql`.

Connect to your PostgreSQL server as a superuser to begin:
```bash
sudo -u postgres psql

1. Create the Database User
First, we create a dedicated user for the application to interact with the database. This is a security best practice, as it avoids using the superuser account for application operations.

CREATE USER ytms_user WITH PASSWORD 'ytms_password';

Note: For production environments, always use a strong, securely generated password instead of 'ytms_password'.

2. Create the Database
Next, create the database itself. We assign ownership to the ytms_user we just created, which gives that user administrative rights over this specific database.

CREATE DATABASE ytms_db OWNER ytms_user;

3. Connect to the New Database
Switch your connection to the newly created ytms_db to run the subsequent commands in the correct context.

\c ytms_db

4. Grant Privileges
Now, we grant the necessary permissions to ytms_user within the ytms_db.

-- Grant the ability for the user to connect to the database.
GRANT CONNECT ON DATABASE ytms_db TO ytms_user;

-- Grant usage on the 'public' schema, allowing the user to access objects within it.
GRANT USAGE ON SCHEMA public TO ytms_user;

-- Grant create privileges on the 'public' schema, allowing the user to create tables, views, etc.
GRANT CREATE ON SCHEMA public TO ytms_user;

-- Grant all permissions on all existing and future tables and sequences in the schema.
-- This simplifies management as new tables are added.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ytms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ytms_user;

5. Define Custom Data Types (ENUMs)
The application uses several ENUM types to ensure data integrity by restricting the possible values for certain columns.

First, we include DROP statements to ensure a clean setup, which is especially useful during development if the script needs to be re-run.

-- Drop existing types if they exist (for development/re-running the script)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS privacy_level CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

Now, create the required ENUM types.

-- Create custom enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'USER');
CREATE TYPE task_status AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'READY', 'SCHEDULED', 'UPLOADED', 'UPLOADING', 'COMPLETED');
CREATE TYPE privacy_level AS ENUM ('ALL', 'SELECTED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'DELETED');

```
Complete Initialization Script
Here is the full, ordered script for convenience. You can save this to a file (e.g., init.sql) and run it.
```
-- ==
--  PostgreSQL Initialization Script for YTMS
-- ==

-- Step 1: Create a dedicated user for the application
CREATE USER ytms_user WITH PASSWORD 'ytms_password';

-- Step 2: Create the database and assign ownership to the new user
CREATE DATABASE ytms_db OWNER ytms_user;

-- Step 3: Connect to the new database to run the next commands
-- Note: The '\c' command must be run manually in an interactive psql session.
-- If running as a script, you may need to connect to the DB from the command line:
-- psql -U postgres -d ytms_db -f your_script_file.sql
\c ytms_db;

-- Step 4: Grant necessary privileges to the user
GRANT CONNECT ON DATABASE ytms_db TO ytms_user;
GRANT USAGE, CREATE ON SCHEMA public TO ytms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ytms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ytms_user;

-- Step 5: Define custom ENUM types for data integrity

-- Drop existing types if they exist (for development)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS privacy_level CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- Create the ENUM types
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'USER');
CREATE TYPE task_status AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'READY', 'SCHEDULED', 'UPLOADED', 'UPLOADING', 'COMPLETED');
CREATE TYPE privacy_level AS ENUM ('ALL', 'SELECTED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'DELETED');

-- ==
--  Initialization Complete
-- ==
```