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
- / — homepage showing an about section and some recent posts
- /blogs   — view and search published posts
- /login  — authenticate with role-based credentials
- /dashboard  — view and manage all posts for admins, authors, and editors
- /create — write a new post (admin/author only)
- /users — manage all users (admin only)
- /tag — manage all tags (admin only)
- /category — manage all categories (admin only)

---

## Roles & Permissions

| Role   | View Drafts | View Scheduled | View Published | Create Post | Edit Post | Save as Draft | Delete Post | Publish/Schedule | Manage Users/Categories/Tags |
|--------|-------------|----------------|----------------|-------------|-----------|---------------|-------------|-----------------|-----------------------------|
| Admin  | ✅ All       | ✅ All          | ✅ All          | ✅           | ✅ Own      | ✅ All        | ✅ All       | ✅ Own           | ✅                           |
| Author | ✅ Own       | ✅ Own          | ✅ All          | ✅           | ✅ Own      | ✅ Own         | ✅ Own (non-published) | ✅ Own | ❌                           |
| Editor | ✅ All       | ✅ All          | ✅ All          | ❌           | ✅ All      | ❌             | ❌           | ❌               | ❌                           |

**Notes**:
- **View Drafts**: Admins and editors can view all drafts; authors can only view their own drafts.
- **View Scheduled**: Admins and editors can view all scheduled posts; authors can only view their own.
- **View Published**: All roles can view all published posts.
- **Create Post**: Admins and authors can create new posts; editors cannot.
- **Edit Post**: Admins and authors can edit their own posts (drafts or scheduled); editors can edit all drafts and scheduled posts.
- **Save as Draft**: Admins and authors can save their own posts as drafts; editors cannot.
- **Delete Post**: Admins can delete any post (published, scheduled, or draft); authors can delete their own non-published posts (drafts or scheduled).
- **Publish/Schedule**: Only post owners (admins or authors) can publish or schedule their posts.
- **Manage Users/Categories/Tags**: Only admins can manage users, categories, and tags.