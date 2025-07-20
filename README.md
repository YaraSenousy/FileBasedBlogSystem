# FileBlogSystem

A lightweight file-based blogging system built using **ASP.NET Core**, Markdown for content, and a folder-based content model.

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
- User Management: Admins can manage user profiles and roles
- Tag Management: Admins can add, edit, and delete tags
- Category Management: Admins can add, edit, and delete categories
- Homepage: Dynamic homepage featuring latest posts and an about section
- Newsletter Subscription: Option to subscribe to a newsletter for email notifications on new blog posts
- **View My Posts**: Authors, editors, and admins can view their posts (drafts, scheduled, published)
- **User Profiles**: View user profiles with their name, role, and authored posts
- **Our Team Page**: Displays all users with names, roles, and links to their profiles
- **Bookmark Functionality**: Unlogged-in users can bookmark posts, stored in `localStorage`, and view them on a dedicated `/saved` page

---

## Folder Structure

```txt
content/
│
├── posts/           # All blog posts (markdown + meta.json + assets/)
├── tags/            # JSON files defining tags
├── categories/      # JSON files defining categories
├── users/           # User profiles and role data
└── routes.json      # Slug → post folder map
```

---

## Setup

- ```cd src/FileBlogSystem```

- Create a .env file with your JWT secret key, must be at least 32 characters:
```
JWT_SECRET=your_secret_key_here
```

- Install dependencies:
```
dotnet add package MailKit
dotnet add package System.ServiceModel.Syndication
```

- Build & Run the server:
```
dotnet build
dotnet run
```

---

## Usage

- `/` — Homepage showing an about section and recent posts
- `/blogs` — View and search published posts
- `/login` — Authenticate with role-based credentials
- `/dashboard` — View and manage all posts for admins, authors, and editors
- `/create` — Write a new post (admin/author only)
- `/users` — Manage all users (admin only)
- `/tag` — Manage all tags (admin only)
- `/category` — Manage all categories (admin only)
- `/my-posts` — View and manage your own posts (authors, editors, admins)
- `/team` — View all team members with names, roles, and profile links
- `/profiles/:username` — View a user’s profile and their authored posts
- `/saved` — View bookmarked posts with search functionality

---

## Roles & Permissions

| Role   | View Drafts | View Scheduled | View Published | Create Post | Edit Post | Save as Draft | Delete Post | Publish/Schedule | Manage Users/Categories/Tags |
|--------|-------------|----------------|----------------|-------------|-----------|---------------|-------------|-----------------|-----------------------------|
| Admin  | ✅ All       | ✅ All          | ✅ All          | ✅           | ✅ Own      | ✅ All        | ✅ All       | ✅ Own           | ✅                           |
| Author | ✅ Own       | ✅ Own          | ✅ All          | ✅           | ✅ Own      | ✅ Own         | ✅ Own  | ✅ Own | ❌                           |
| Editor | ✅ All       | ✅ All          | ✅ All          | ❌           | ✅ All      | ❌             | ❌           | ❌               | ❌                           |

**Notes**:
- **View Drafts**: Admins and editors can view all drafts; authors can only view their own drafts.
- **View Scheduled**: Admins and editors can view all scheduled posts; authors can only view their own.
- **View Published**: All roles can view all published posts.
- **Create Post**: Admins and authors can create new posts; editors cannot.
- **Edit Post**: Admins and authors can edit their own posts (drafts or scheduled); editors can edit all drafts and scheduled posts.
- **Save as Draft**: Admins can save as draft any post; authors can save as draft their own posts.
- **Delete Post**: Admins can delete any post; authors can delete their own posts.
- **Publish/Schedule**: Only post owners can publish or schedule their posts.
- **Manage Users/Categories/Tags**: Only admins can manage users, categories, and tags.
- **View Profiles**: All roles (including guests) can view user profiles via `/profiles/:username`.