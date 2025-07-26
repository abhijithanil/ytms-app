# ⚙️ Resetting the PostgreSQL `postgres` User Password

This guide provides instructions for resetting the `postgres` superuser password on Windows, macOS, and Linux. This process is necessary when you have forgotten or lost the password and need to regain administrative access to your database server.

---

## Windows

This method involves temporarily changing the server's authentication policy to **`trust`**, which allows connection without a password, and then changing it back to a secure method.

### Prerequisites

* PostgreSQL is installed on your Windows machine.
* You have **Administrator** privileges to edit files and manage services.

### Steps

1.  **Stop the PostgreSQL Server**
    Open PowerShell or Command Prompt **as an Administrator** and run the following command. Adjust the version number (`15`) and path if your installation differs.

    ```powershell
    & "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\15\data"
    ```

2.  **Modify Authentication Configuration (`pg_hba.conf`)**
    Navigate to your PostgreSQL data directory (e.g., `C:\Program Files\PostgreSQL\15\data`) and open `pg_hba.conf` in a text editor run as Administrator. Change the authentication method for local connections from **`scram-sha-256`** (or `md5`) to **`trust`**.

    **Change this:**
    ```ini
    # IPv4 local connections:
    host    all             all             127.0.0.1/32            scram-sha-256
    # IPv6 local connections:
    host    all             all             ::1/128                 scram-sha-256
    ```
    **To this:**
    ```ini
    # IPv4 local connections:
    host    all             all             127.0.0.1/32            trust
    # IPv6 local connections:
    host    all             all             ::1/128                 trust
    ```
    Save and close the file.

3.  **Start the Server and Reset the Password**
    Start the server with the new temporary configuration.

    ```powershell
    & "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\15\data"
    ```
    Connect to PostgreSQL (no password will be required).
    ```powershell
    psql -U postgres
    ```
    Once connected, set a new password. **Replace `your_new_secure_password` with your actual password.**
    ```sql
    ALTER USER postgres WITH PASSWORD 'your_new_secure_password';
    \q
    ```

4.  **Revert Security Configuration 🔒**
    This is a **critical step**. Stop the server, edit `pg_hba.conf` again, and change `trust` back to `scram-sha-256` to secure your database.

5.  **Restart and Verify ✅**
    Start the server one last time.

    ```powershell
    & "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\15\data"
    ```
    Verify that the new password works using the `-W` flag, which forces a password prompt.
    ```powershell
    psql -U postgres -W
    ```

---

## macOS (with Homebrew)

This guide assumes PostgreSQL was installed with **Homebrew**.

### Steps

1.  **Stop the PostgreSQL Service**
    ```bash
    brew services stop postgresql
    ```

2.  **Modify `pg_hba.conf`**
    Find your `pg_hba.conf` file (a common path is `/opt/homebrew/var/postgres`) and edit it. Change the `METHOD` for `host` connections from `scram-sha-256` to **`trust`**.

3.  **Start Service and Reset Password**
    ```bash
    brew services start postgresql
    psql -U postgres
    ```
    Inside `psql`, set your new password:
    ```sql
    ALTER USER postgres WITH PASSWORD 'your_new_secure_password';
    \q
    ```

4.  **Revert Security Configuration and Restart 🔒**
    Edit `pg_hba.conf` back to `scram-sha-256` and then restart the service to apply the secure configuration.
    ```bash
    brew services restart postgresql
    ```

5.  **Verify ✅**
    Test your new password.
    ```bash
    psql -U postgres -W
    ```

---

## Linux

On Linux, the process is often simpler due to **peer authentication**.

### Method 1: The Easy Way (Peer Authentication)

This method works on most default `apt` or `dnf`/`yum` installations.

1.  **Connect as the `postgres` System User**
    Use `sudo` to run `psql` as the `postgres` Linux user. This bypasses the need for a database password.
    ```bash
    sudo -u postgres psql
    ```

2.  **Set the New Password**
    Once at the `postgres=#` prompt, run the `ALTER USER` command.
    ```sql
    ALTER USER postgres WITH PASSWORD 'your_new_secure_password';
    \q
    ```

3.  **Verify ✅**
    That's it! No restarts or file edits are needed. You can now connect normally.
    ```bash
    psql -U postgres -W
    ```

### Method 2: The Manual Way (If Peer Authentication Fails)

If the easy method doesn't work, follow the same manual process as on other operating systems.

1.  **Stop the PostgreSQL Service** (e.g., `sudo systemctl stop postgresql`).
2.  **Find and Modify `pg_hba.conf`** (Find with `sudo -u postgres psql -c "SHOW hba_file;"` and edit with `sudo`). Change the auth method to **`trust`**.
3.  **Start the Service** and reset the password using `psql`.
4.  **Revert Security** by editing the file back to `scram-sha-256` and **restarting the service**.
5.  **Verify** the new password with `psql -U postgres -W`.