# ytms-app

ytms-app is a video task management system designed to streamline video production, review, and team collaboration. This application is built with a Java/Spring Boot backend and a JavaScript frontend, supporting user roles, video task assignments, revisions, commenting, and secure file storage. It is designed to run seamlessly both on local infrastructure and Google Cloud Platform (GCP).

---

## Features

- **Video Task Management:** Create, assign, and track video editing/production tasks.
- **Revision Tracking:** Upload, manage, and review multiple revisions per video task.
- **Commenting System:** Collaborate through comments on tasks and revisions.
- **User Roles & Permissions:** Supports Editors, Admins, Viewers, and granular task permissions.
- **Audio Instructions:** Attach and manage audio instructions for video tasks.
- **Cloud Storage:** Integrates with GCP buckets or local storage.
- **Dashboard:** View task statistics and recent activity.

---

## Technologies

- **Backend:** Java, Spring Boot, JPA (Hibernate)
- **Frontend:** JavaScript (see `ytms-ui`)
- **Database:** Relational DB (configured via JPA)
- **Cloud:** Google Cloud Platform (GCP) integration (Storage, Secrets Manager, OAuth Client)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/abhijithanil/ytms-app.git
```

### 2. Backend Setup

#### Install Dependencies

- Java 17+
- Maven
- Configure your database (e.g., PostgreSQL, MySQL, H2 for dev)

#### Configuration

Edit `ytms-server/src/main/resources/application.properties`:

- Database settings (`spring.datasource.*`)
- GCP settings (see below)

### 3. Frontend Setup

```bash
cd ytms-ui
npm install
# or
yarn install
```

Configure environment variables in `.env` (see section below).

---

## Deployment on Google Cloud Platform (GCP)

### Step 1: Create a GCP Project

1. Go to https://console.cloud.google.com/
2. Click on your project dropdown (top left) → “NEW PROJECT”.
3. Enter a name (e.g., `ytms-video-manager`), pick organization, click “Create”.

### Step 2: Set Up a Service Account

1. In your project, go to **IAM & Admin > Service Accounts**.
2. Click “Create Service Account”.
    - Name: `ytms-app-service`
    - Roles: “Storage Admin”, “Secret Manager Secret Accessor” (add others as needed)
3. After creating, click on the new service account → “Keys” → “Add Key” → “Create new key” (JSON).
    - Download and save this JSON file securely.

### Step 3: Create a GCP Storage Bucket

1. Go to **Cloud Storage > Buckets**.
2. Click “Create”.
    - Name: globally unique (e.g., `ytms-app-bucket-<your-unique-id>`)
    - Location: multi-region or region of your choice
3. Grant the service account access to the bucket (if not already covered by “Storage Admin” role).

### Step 4: Configure the Backend (`application.properties`)

In `ytms-server/src/main/resources/application.properties`:

```properties
# Storage
storage.type=GCP
gcp.bucket.name=ytms-app-bucket-<your-unique-id>
gcp.credentials.path=/path/to/downloded/service-account.json

# Database, JWT, Mail, etc...
```

### Step 5: Configure the Frontend (`.env`)

In `ytms-ui/.env`:

```bash
REACT_APP_API_BASE_URL=https://<your-backend-url>/api
REACT_APP_GCP_BUCKET=ytms-app-bucket-<your-unique-id>
REACT_APP_CLIENT_ID=<your-oauth-client-id>
REACT_APP_CALLBACK_URL=https://<your-domain>/auth/callback
REACT_APP_TEST_USER_EMAIL=<your-test-user-email>
```

---

## OAuth Setup (Google Login)

### 1. Create OAuth Client ID

1. Go to **APIs & Services > Credentials**.
2. Click “Create Credentials” → “OAuth client ID”.
    - Application type: Web application
    - Name: `ytms-app-client`
    - Authorized redirect URIs: `https://<your-domain>/auth/callback`
    - Add test user email in “OAuth consent screen” → “Test users”.

3. Copy the generated **Client ID** and **Client Secret**.

### 2. Configure Callback URL

- In Google Cloud, ensure the callback URL matches the one configured in `.env` and used by your backend.

---

## Create Secrets in GCP Secret Manager

1. Go to **Security > Secret Manager**.
2. Click “Create Secret”.
    - Name secrets for `ytms-app` (e.g., `ytms-oauth-client-secret`, `ytms-jwt-secret`, etc.).
    - Paste the secret value (e.g., OAuth client secret, JWT signing key).
3. Give the service account access to these secrets (role: Secret Manager Secret Accessor).

### Reference Secrets in Your App

- In `application.properties`, use environment variables or fetch from secrets manager at runtime (using Spring Cloud GCP or manually).

```properties
# Example (if using Spring Cloud GCP)
spring.cloud.gcp.secretmanager.enabled=true
spring.cloud.gcp.secretmanager.secret-name=ytms-oauth-client-secret
```

---

## Running the Application

1. **Backend**

   ```bash
   cd ytms-server
   mvn clean install
   java -jar target/ytms-server.jar
   ```

2. **Frontend**

   ```bash
   cd ytms-ui
   npm start
   # or
   yarn start
   ```

---

## Testing Your Setup

- Visit the frontend at `http://localhost:3000` (or your deployed domain).
- Try logging in with your test Google user.
- Upload a video, assign a task, and check revision/comments features.
- Verify files are uploaded to your GCP bucket.

---

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests.

---

## License

This project currently does not specify a license. Please contact the repository owner for usage details.

---

## Contact

For questions or suggestions, please contact [abhijithanil](dev_abhijith@outlook.com).
