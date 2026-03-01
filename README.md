# Final Semester Project - Social Media Management System

This project is a Social Media Management System designed to help Admins, Employees, and Customers manage social media content, projects, and scheduling.

## Technical Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** Custom Auth, OAuth (Social Media Integration)
- **File Storage:** Local storage (Multer)

## Database Schema & ER Flow

The database `admin_dashboard` consists of several key entities interacting with each other:

### 1. User Management
- **Admin (`admin`)**:
  - Superuser with full access.
  - Fields: `id`, `username`, `password`.
- **Employees (`employees`)**:
  - Staff members who manage content.
  - Fields: `emp_id`, `emp_name`, `password`, `assigned_customers`.
  - **Relationship**: Employees manage multiple Customers (stored as text/JSON in `assigned_customers` or via application logic).
- **Customers (`customers`)**:
  - Clients for whom content is created.
  - Fields: `cust_id`, `cust_name`, `password`.

### 2. Content & Project Management
- **Projects (`projects`)**:
  - High-level campaigns or tasks.
  - Fields: `project_id`, `title`, `platform`, `scheduled_date`, `status`, `assigned_to`.
- **Content (`content`)**:
  - Specific posts or content pieces.
  - Fields: `content_id`, `emp_id` (Linked to Employee), `customer_name`, `project_name`, `platform`, `status` (e.g., Draft, Published).
- **Post Media (`post_media`)**:
  - Images/Videos attached to content.
  - **Relationship**: Linked to `content` via `post_id`.
  - Fields: `id`, `post_id`, `media_path`.

### 3. Social Integration
- **Social Accounts (`social_accounts`)**:
  - Stores OAuth tokens for social platforms (Instagram, Facebook).
  - **Relationship**: Linked to `employees` via `employee_id`.
  - Fields: `employee_id`, `platform`, `social_id`, `access_token`.

## Installation & Setup

### Prerequisites
- Node.js installed
- MySQL Server installed and running

### 1. Database Setup
1. Open your MySQL client (Workbench, CLI, etc.).
2. Run the SQL scripts located in the `database code/` folder to create the database and tables.
   - Start with `module1 and module 2.txt`.
   - Then run `module3.txt`.

### 2. Backend Dependencies
The backend logic resides in `AdminModule/backend`.

**Using the automated script:**
Run the following command in the root directory:
```bash
sh install_dependencies.sh
```

**Manual Installation:**
```bash
cd AdminModule/backend
npm install
```

### 3. Running the Application
To start the backend server:
```bash
cd AdminModule/backend
npm start
```
The server will start (default is usually port 3000 or 8080, check console output).

## Project Structure
- `AdminModule/`: Contains backend code and Admin-related frontend pages.
- `UserModule/`: Contains User-related frontend pages.
- `database code/`: SQL scripts for database setup.
- `css/` & `images/`: Global assets.
