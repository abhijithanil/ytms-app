PostgreSQL Setup Instructions
Option 1: Install PostgreSQL Locally
On macOS:
bash# Install PostgreSQL using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database and user
psql postgres
On Ubuntu/Debian:
bash# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
On Windows:

Download PostgreSQL from https://www.postgresql.org/download/windows/
Follow the installation wizard
Use pgAdmin or command line to create database

Option 2: Use Docker (Recommended)

Create docker-compose.yml (provided above)
Start PostgreSQL container:

bashdocker-compose up -d postgres

Access PostgreSQL:

bash# Via psql
docker exec -it ytms-postgres psql -U ytms_user -d ytms_db

# Via pgAdmin (if enabled)
# Open http://localhost:5050
# Email: admin@ytms.com, Password: admin123
Database Setup

Run the SQL setup script (provided above) to create database and user
Update your application.properties with the PostgreSQL configuration
Create the DataLoader (provided above) to initialize sample data

Running the Application

Set the active profile:

bash# For development
java -jar -Dspring.profiles.active=dev your-app.jar

# Or set in IDE run configuration
-Dspring.profiles.active=dev

Environment variables for production:

bashexport DATABASE_URL=jdbc:postgresql://localhost:5432/ytms_db
export DATABASE_USERNAME=ytms_user
export DATABASE_PASSWORD=ytms_password
export JWT_SECRET=your-super-secret-jwt-key
Testing the Setup

Start your Spring Boot application
Check database connectivity:

Look for successful Hibernate schema creation in logs
Access actuator health endpoint: http://localhost:8080/actuator/health


Test with initial data:

Login with: admin / password123
Or: editor1 / password123



Database Schema
The application will automatically create these tables:

users - User accounts (admin, editors)
video_tasks - Video editing tasks
revisions - Task revisions/versions
comments - Comments on tasks and revisions

Monitoring

Database connections: Check Hikari connection pool metrics
Performance: Enable SQL logging in development
Health checks: Use Spring Boot Actuator endpoints

Your Spring Boot application is now configured to use PostgreSQL with proper connection pooling, profiles for different environments, and sample data initialization!