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
 * @type {number} currentPage - Current pagination page.
 * @type {string} sortField - Current sort field.
 * @type {string} sortDirection -  Sort direction: 'asc' or 'desc'.
 */
const USERS_PER_PAGE = 10;
let users = [];
let currentPage = 1;
let sortField = 'username'; 
let sortDirection = 'asc';

/**
 * Renders users in the table with sorting and pagination
 * @param {Object[]} usersToRender - Array of user objects to display
 */
function renderUsers(usersToRender) {
    // Sort users by the current sort field and direction
    const sortedUsers = [...usersToRender].sort((a, b) => {
        const valA = a[sortField].toLowerCase();
        const valB = b[sortField].toLowerCase();
        return sortDirection === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    // Paginate users
    const start = (currentPage - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const paginatedUsers = sortedUsers.slice(start, end);

    // Render table rows
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    paginatedUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm edit-btn my-1 mx-2" data-username="${user.username}" data-bs-toggle="modal" data-bs-target="#editUserModal">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm my-1 mx-2 delete-btn" data-username="${user.username}" data-bs-toggle="modal" data-bs-target="#deleteUserModal">
                    <i class="fas fa-trash"></i> Delete
                </button>
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
        user.username.toLowerCase().includes(query) || user.name.toLowerCase().includes(query)
    );
    currentPage = given;
    renderUsers(filteredUsers);
}

/**
 * Clears the search input and re-renders all users
 */
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-users').value = '';
    currentPage = 1;
    renderUsers(users);
});

// Handle search input
document.getElementById('search-users').addEventListener('input', () => {searchUsers();});

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
            fetchUsers();
            toastMsg.textContent = 'User added successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            e.target.reset();
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
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
 * Populates edit user form with user data
 */
document.getElementById('users-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
        const username = e.target.closest('.edit-btn').dataset.username;
        const user = users.find(u => u.username === username);
        document.getElementById('edit-username-original').value = user.username;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-password').value = '';
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
            method: 'PUT',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            const updatedUser = await res.json();
            const index = users.findIndex(u => u.username === originalUsername);
            users[index] = { username: updatedUser.username, name: updatedUser.name, role: updatedUser.roles[0] };
            toastMsg.textContent = 'User updated successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            searchUsers();
        } else {
            const error = await res.json();
            toastMsg.textContent = `Failed: ${error.error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error updating user';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
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
            users.splice(users.findIndex(u => u.username === userToDelete), 1);
            toastMsg.textContent = 'User deleted successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
            searchUsers();
        } else {
            const error = await res.json();
            toastMsg.textContent = `Failed: ${error.error}`;
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