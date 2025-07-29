# FileBlogSystem

A lightweight file-based blogging system built using **ASP.NET Core**, Markdown for content, and a folder-based content model.

The website is deployed on an Azure Virtual Machine (VM) running a Linux-based systemd service (`fileblogsystem.service`). 

 - The site is live at: **https://letsblog.switzerlandnorth.cloudapp.azure.com**

---

## Features

- Write blog posts in Markdown
- Role-based access control (admin, author, editor)
- Schedule posts for future publication
- Edit drafts and scheduled posts
- Search functionality
- JWT-based auth with cookies
- RSS feed generation
- Clean slug routing via `routes.json`
- Media Upload and Management: Upload, edit, and delete media attached to a blog
- Theme Customization: Switch between light/dark theme
- User Management: Admins can manage user profiles, roles, and assign authors to editors
- Tag Management: Admins can add, edit, and delete tags
- Category Management: Admins can add, edit, and delete categories
- Homepage: Dynamic homepage featuring latest posts and an about section
- Newsletter Subscription: Option to subscribe to a newsletter for email notifications on new blog posts
- **View My Posts**: Authors, editors, and admins can view their posts (drafts, scheduled, published)
- **User Profiles**: View user profiles with their name, role, and authored posts
- **Our Team Page**: Displays all users with names, roles, and links to their profiles
- **Bookmark Functionality**: Unlogged-in users can bookmark posts, stored in `localStorage`, and view them on a dedicated `/saved` page
- **Join Us**: Users can submit join requests to become authors, which admins can approve or reject on the `/admin/requests` page
- **Editor-Author Assignment**: Editors are assigned to specific authors and can only view and edit their assigned author’s drafts and scheduled posts

---

## Folder Structure

```txt
content/
│
├── posts/           # All blog posts (markdown + meta.json + assets/)
├── tags/            # JSON files defining tags
├── categories/      # JSON files defining categories
├── users/           # User profiles and role data
├── requests/        # Join request data stored as JSON files
└── routes.json      # Slug → post folder map
```

---

## Setup

1. Navigate to the project directory:
   ```bash
   cd src/FileBlogSystem
   ```

2. Create a `.env` file with your JWT secret key (must be at least 32 characters):
   ```bash
   JWT_SECRET=your_secret_key_here
   ```

3. Set the environment variable for development:
   ```bash
   ASPNETCORE_ENVIRONMENT=Development
   ```

4. Install dependencies:
   ```bash
   dotnet add package MailKit
   dotnet add package System.ServiceModel.Syndication
   ```

5. Build and run the server:
   ```bash
   dotnet build
   dotnet run
   ```

6. Access the application locally at `https://localhost:5000`.

---

## Usage

- `/` — Homepage showing an about section and recent posts
- `/blogs` — View and search published posts
- `/login` — Authenticate with role-based credentials
- `/dashboard` — View and manage posts based on user role
- `/create` — Write a new post (admin/author only)
- `/users` — Manage all users and assign authors to editors (admin only)
- `/tag` — Manage all tags (admin only)
- `/category` — Manage all categories (admin only)
- `/my-posts` — View and manage your own posts (authors, editors, admins)
- `/team` — View all team members with names, roles, and profile links
- `/profiles/:username` — View a user’s profile and their authored posts
- `/saved` — View bookmarked posts with search functionality
- `/join` — Submit a join request to become an author
- `/admin/requests` — Manage join requests (approve/reject) (admin only)

---

## Roles & Permissions

| Role   | View Drafts | View Scheduled | View Published | Create Post | Edit Post | Save as Draft | Delete Post | Publish/Schedule | Manage Users/Categories/Tags | Manage Join Requests |
|--------|-------------|----------------|----------------|-------------|-----------|---------------|-------------|-----------------|-----------------------------|---------------------|
| Admin  | ✅ All       | ✅ All          | ✅ All          | ✅           | ✅ Own      | ✅ All        | ✅ All       | ✅ Own           | ✅                           | ✅                   |
| Author | ✅ Own       | ✅ Own          | ✅ All          | ✅           | ✅ Own      | ✅ Own         | ✅ Own       | ✅ Own           | ❌                           | ❌                   |
| Editor | ✅ Assigned Author | ✅ Assigned Author | ✅ All    | ❌           | ✅ Assigned Author | ❌       | ❌           | ❌               | ❌                           | ❌                   |

**Notes**:
- **View Drafts**: Admins can view all drafts; authors can view their own drafts; editors can only view drafts of their assigned author.
- **View Scheduled**: Admins can view all scheduled posts; authors can view their own scheduled posts; editors can only view scheduled posts of their assigned author.
- **View Published**: All roles can view all published posts.
- **Create Post**: Admins and authors can create new posts; editors cannot.
- **Edit Post**: Admins and authors can edit their own drafts or scheduled posts; editors can edit drafts and scheduled posts of their assigned author only.
- **Save as Draft**: Admins can save any post as a draft; authors can save their own posts as drafts.
- **Delete Post**: Admins can delete any post; authors can delete their own posts.
- **Publish/Schedule**: Only post owners can publish or schedule their posts.
- **Manage Users/Categories/Tags**: Only admins can manage users, assign authors to editors, and manage categories and tags.
- **Manage Join Requests**: Only admins can view and approve/reject join requests on the `/admin/requests` page.
- **View Profiles**: All roles (including guests) can view user profiles via `/profiles/:username`.