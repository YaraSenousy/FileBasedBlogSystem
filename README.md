# FileBlogSystem 

A lightweight file-based blogging system built using **ASP.NET Core**, Markdown for content, and a folder-based content model.

---

## Features

- Write blog posts in Markdown
- Role-based access control (admin, author, editor)
- Schedule posts for future publication
- Search functionality
- JWT-based auth with cookies
- RSS feed generation
- Clean slug routing via `routes.json`

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
- Run the server:
```
dotnet run
```

---

## Usage
- /   — homepage to view and search published posts

- /login  — authenticate with role-based credentials

- /dashboard  — view and manage all posts for admins, authors, and editors

- /create — write a new post (admin/author only)

- /addUser — add a new user (admin only)

- /addTag — add a new tag (admin only)

- /addCategory — add a new category (admin only)

---

## Roles & Permissions
| Role   | Can View | Can Create/Edit | Can Delete | Can Publish |
| ------ | -------- | --------------- | ---------- | ----------- |
| Admin  | ✅        | ✅               | ✅          | ✅           |
| Author | ✅        | ✅               | ❌          | ✅           |
| Editor | ✅        | ❌               | ❌          | ❌           |
