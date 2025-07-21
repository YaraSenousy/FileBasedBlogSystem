/**
 * Initialize theme based on localStorage or system preference
 */
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
}

/**
 * Configuration and state
 * @type {number} USERS_PER_PAGE - Number of users per page.
 * @type {Object[]} users - Store users as objects.
 * @type {Object[]} authors - Store authors for dropdown.
 * @type {number} currentPage - Current pagination page.
 * @type {string} sortField - Current sort field.
 * @type {string} sortDirection - Sort direction: 'asc' or 'desc'.
 */
const USERS_PER_PAGE = 10;
let users = [];
let authors = [];
let currentPage = 1;
let sortField = 'username';
let sortDirection = 'asc';

/**
 * Fetches authors from the API
 */
async function fetchAuthors() {
    try {
        const res = await fetch('/admin/users?role=author', { credentials: 'include' });
        if (res.ok) {
            authors = await res.json();
        } else {
            console.error('Failed to fetch authors');
            authors = [];
        }
    } catch (err) {
        console.error('Error fetching authors:', err.message);
        authors = [];
    }
}

/**
 * Renders users in the table with sorting, pagination, and author assignment
 * @param {Object[]} usersToRender - Array of user objects to display
 */
function renderUsers(usersToRender) {
    // Sort users by the current sort field and direction
    const sortedUsers = [...usersToRender].sort((a, b) => {
        const valA = (a[sortField] || '').toLowerCase();
        const valB = (b[sortField] || '').toLowerCase();
        return sortDirection === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    // Paginate users
    const start = (currentPage - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const paginatedUsers = sortedUsers.slice(start, end);

    // Render table rows
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }
    tbody.innerHTML = '';
    paginatedUsers.forEach(user => {
        const tr = document.createElement('tr');
        const authorSelect = user.role === 'editor' ? `
            <select class="form-select form-select-sm assign-author" data-username="${user.username}">
                <option value="" ${!user.assignedAuthor ? 'selected' : ''}>None</option>
                ${authors.map(author => `
                    <option value="${author.username}" ${user.assignedAuthor === author.username ? 'selected' : ''}>
                        ${author.username}
                    </option>
                `).join('')}
            </select>
        ` : '';
        tr.innerHTML = `
            <td>
                ${user.profilePicture
                    ? `<img src="${user.profilePicture}?width=40&height=40&mode=crop" class="user-profile-pic" alt="${user.username}'s profile picture">`
                    : '<span class="no-pic">No Image</span>'
                }
            </td>
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
            <td>${user.role === 'editor' ? (user.assignedAuthor || 'N/A') : 'N/A'}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm edit-btn my-1 mx-2" data-username="${user.username}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm my-1 mx-2 delete-btn" data-username="${user.username}" data-bs-toggle="modal" data-bs-target="#deleteUserModal">
                    <i class="fas fa-trash"></i> Delete
                </button>
                ${authorSelect}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update pagination controls
    renderPagination(sortedUsers.length);
}

/**
 * Renders pagination controls based on total users
 * @param {number} totalUsers - Total number of users after filtering
 */
function renderPagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
    const pageNumbers = document.getElementById('page-numbers');
    if (!pageNumbers) {
        console.error('Page numbers container not found');
        return;
    }
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pageNumbers.appendChild(li);
    }
    document.getElementById('prev-page').classList.toggle('disabled', currentPage === 1);
    document.getElementById('next-page').classList.toggle('disabled', currentPage === totalPages);
}

/**
 * Filters users based on search query and re-renders the table
 */
function searchUsers(given = 1) {
    const query = document.getElementById('search-users').value.toLowerCase();
    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query)
    );
    currentPage = given;
    renderUsers(filteredUsers);
}

/**
 * Clears the search input and re-renders all users
 */
document.getElementById('clear-search-btn').addEventListener('click', () => {
    const searchInput = document.getElementById('search-users');
    if (searchInput) {
        searchInput.value = '';
        currentPage = 1;
        renderUsers(users);
    }
});

// Handle search input
document.getElementById('search-users').addEventListener('input', () => {
    searchUsers();
});

// Handle pagination clicks
document.getElementById('pagination').addEventListener('click', (e) => {
    e.preventDefault();
    const pageLink = e.target.closest('.page-link');
    if (!pageLink || pageLink.parentElement.classList.contains('disabled')) return;
    if (pageLink.dataset.page) {
        currentPage = parseInt(pageLink.dataset.page);
    } else if (pageLink.parentElement.id === 'prev-page') {
        currentPage--;
    } else if (pageLink.parentElement.id === 'next-page') {
        currentPage++;
    }
    searchUsers(currentPage);
});

// Handle sorting clicks
document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = 'asc';
        }
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });
        th.querySelector('i').className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
        searchUsers();
    });
});

/**
 * Toggles the add user form visibility
 */
document.getElementById('toggle-add-user-btn').addEventListener('click', () => {
    const addFormContainer = document.getElementById('addUserFormContainer');
    addFormContainer.style.display = addFormContainer.style.display === 'none' ? 'block' : 'none';
    if (addFormContainer.style.display === 'block') {
        document.getElementById('addUserForm').reset();
    }
});

/**
 * Handles cancel button in add form
 */
document.getElementById('cancel-add-btn').addEventListener('click', () => {
    document.getElementById('addUserFormContainer').style.display = 'none';
    document.getElementById('addUserForm').reset();
});

/**
 * Handles add user form submission
 * @param {Event} e - Form submission event
 */
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch('/admin/users', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            await fetchUsers();
            toastMsg.textContent = 'User added successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            e.target.reset();
            document.getElementById('addUserFormContainer').style.display = 'none';
            searchUsers();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error adding user';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

/**
 * Populates edit user form with user data and shows the form
 */
document.getElementById('users-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
        const username = e.target.closest('.edit-btn').dataset.username;
        const user = users.find(u => u.username === username);
        if (user) {
            document.getElementById('edit-username-original').value = user.username;
            document.getElementById('edit-username').value = user.username;
            document.getElementById('edit-name').value = user.name;
            document.getElementById('edit-email').value = user.email || '';
            document.getElementById('edit-role').value = user.role;
            document.getElementById('edit-password').value = '';
            document.getElementById('editUserFormContainer').style.display = 'block';
            document.getElementById("editUserFormContainer").scrollIntoView({ behavior: "smooth" });
        }
    }
});

/**
 * Handles edit user form submission
 * @param {Event} e - Form submission event
 */
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const originalUsername = formData.get('username_original');
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/users/${originalUsername}`, {
            method: 'PATCH',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            await fetchUsers();
            toastMsg.textContent = 'User updated successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            document.getElementById('editUserFormContainer').style.display = 'none';
            searchUsers();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error updating user';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

/**
 * Handles cancel button in edit form
 */
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    document.getElementById('editUserFormContainer').style.display = 'none';
    document.getElementById('editUserForm').reset();
});

/**
 * Stores username for deletion
 */
let userToDelete = null;
document.getElementById('users-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
        userToDelete = e.target.closest('.delete-btn').dataset.username;
    }
});

/**
 * Handles author assignment dropdown
 */
document.getElementById('users-table-body').addEventListener('change', async (e) => {
    if (e.target.classList.contains('assign-author')) {
        const editorUsername = e.target.dataset.username;
        const authorUsername = e.target.value;
        const toast = document.getElementById('live-toast');
        const toastMsg = document.getElementById('toast-message');
        try {
            const url = `/admin/users/${editorUsername}/assign-author${authorUsername ? `?authorUsername=${encodeURIComponent(authorUsername)}` : ''}`;
            const res = await fetch(url, {
                method: 'PATCH',
                credentials: 'include',
            });
            if (res.ok) {
                await fetchUsers();
                toastMsg.textContent = `Author ${authorUsername || 'none'} assigned to editor`;
                toast.className = 'toast align-items-center text-bg-success border-0';
                searchUsers();
            } else {
                const error = await res.text();
                toastMsg.textContent = `Failed: ${error}`;
                toast.className = 'toast align-items-center text-bg-danger border-0';
            }
        } catch (err) {
            toastMsg.textContent = 'Error assigning author';
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
        new bootstrap.Toast(toast).show();
    }
});

/**
 * Handles delete user confirmation
 */
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!userToDelete) return;
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/users/${userToDelete}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (res.ok) {
            await fetchUsers();
            toastMsg.textContent = 'User deleted successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
            searchUsers();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error deleting user';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
    userToDelete = null;
});

/**
 * Fetches users from the API and updates the users array
 */
async function fetchUsers() {
    try {
        await fetchAuthors(); // Fetch authors first for dropdown
        const res = await fetch('/admin/users', { credentials: 'include' });
        if (res.ok) {
            users = await res.json();
            searchUsers();
        } else {
            const error = await res.json();
            const toast = document.getElementById('live-toast');
            const toastMsg = document.getElementById('toast-message');
            toastMsg.textContent = `Failed to load users: ${error.error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
            new bootstrap.Toast(toast).show();
        }
    } catch (err) {
        const toast = document.getElementById('live-toast');
        const toastMsg = document.getElementById('toast-message');
        toastMsg.textContent = `Error loading users: ${err.message}`;
        toast.className = 'toast align-items-center text-bg-danger border-0';
        new bootstrap.Toast(toast).show();
    }
}

/**
 * Handles delete user confirmation
 */
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!userToDelete) return;
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/users/${userToDelete}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (res.ok) {
            await fetchUsers();
            toastMsg.textContent = 'User deleted successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
            searchUsers();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error deleting user';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
    userToDelete = null;
});

/**
 * Fetches users from the API and updates the users array
 */
async function fetchUsers() {
    try {
        await fetchAuthors();
        const res = await fetch('/admin/users', { credentials: 'include' });
        if (res.ok) {
            users = await res.json();
            searchUsers();
        } else {
            const error = await res.json();
            const toast = document.getElementById('live-toast');
            const toastMsg = document.getElementById('toast-message');
            toastMsg.textContent = `Failed to load users: ${error.error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
            new bootstrap.Toast(toast).show();
        }
    } catch (err) {
        const toast = document.getElementById('live-toast');
        const toastMsg = document.getElementById('toast-message');
        toastMsg.textContent = `Error loading users: ${err.message}`;
        toast.className = 'toast align-items-center text-bg-danger border-0';
        new bootstrap.Toast(toast).show();
    }
}

// Initialize by fetching users
fetchUsers();