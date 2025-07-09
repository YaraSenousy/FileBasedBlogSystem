
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
}

const mockUsers = [
    { username: "admin1", name: "John Doe", role: "admin" },
    { username: "author1", name: "Jane Smith", role: "author" },
    { username: "editor1", name: "Alice Johnson", role: "editor" },
    { username: "user4", name: "Bob Wilson", role: "author" },
    { username: "user5", name: "Emma Brown", role: "editor" },
    { username: "user6", name: "Michael Lee", role: "admin" },
    { username: "user7", name: "Sarah Davis", role: "author" },
    { username: "user8", name: "David Clark", role: "editor" },
    { username: "user9", name: "Laura Martinez", role: "admin" },
    { username: "user10", name: "James Taylor", role: "author" },
    { username: "user11", name: "Olivia White", role: "editor" },
    { username: "user12", name: "William Harris", role: "admin" }
];

const USERS_PER_PAGE = 10;
let currentPage = 1;
let sortField = 'username';
let sortDirection = 'asc';

// Render users with pagination and sorting
function renderUsers(users) {
    // Sort users
    const sortedUsers = [...users].sort((a, b) => {
        const valA = a[sortField].toLowerCase();
        const valB = b[sortField].toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Paginate
    const start = (currentPage - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const paginatedUsers = sortedUsers.slice(start, end);

    // Render table
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

    // Update pagination
    renderPagination(sortedUsers.length);
}

// Render pagination
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

// Search users
function searchUsers() {
    const query = document.getElementById('search-users').value.toLowerCase();
    const filteredUsers = mockUsers.filter(user =>
        user.username.toLowerCase().includes(query) || user.name.toLowerCase().includes(query)
    );
    currentPage = 1; // Reset to first page on search
    renderUsers(filteredUsers);
}

// Clear search
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-users').value = '';
    currentPage = 1;
    renderUsers(mockUsers);
});

// Search input
document.getElementById('search-users').addEventListener('input', searchUsers);

// Pagination clicks
document.getElementById('pagination').addEventListener('click', (e) => {
    e.preventDefault();
    const pageLink = e.target.closest('.page-link');
    if (!pageLink) return;
    if (pageLink.parentElement.classList.contains('disabled')) return;
    if (pageLink.dataset.page) {
        currentPage = parseInt(pageLink.dataset.page);
    } else if (pageLink.parentElement.id === 'prev-page') {
        currentPage--;
    } else if (pageLink.parentElement.id === 'next-page') {
        currentPage++;
    }
    searchUsers(); // Re-render with current search
});

// Sorting clicks
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
        searchUsers(); // Re-render with current search and sort
    });
});

// Add user
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
            const newUser = await res.json();
            mockUsers.push(newUser);
            toastMsg.textContent = 'User added successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            e.target.reset();
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            searchUsers();
        } else {
            const error = await res.json();
            toastMsg.textContent = `Failed: ${error.error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error adding user';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

// Edit user population
document.getElementById('users-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
        const username = e.target.closest('.edit-btn').dataset.username;
        const user = mockUsers.find(u => u.username === username);
        document.getElementById('edit-username-original').value = user.username;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-password').value = '';
    }
});

// Edit user
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
            const index = mockUsers.findIndex(u => u.username === originalUsername);
            mockUsers[index] = updatedUser;
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

// Delete user
let userToDelete = null;
document.getElementById('users-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
        userToDelete = e.target.closest('.delete-btn').dataset.username;
    }
});

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
            mockUsers.splice(mockUsers.findIndex(u => u.username === userToDelete), 1);
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

// Fetch users
async function fetchUsers() {
    try {
        const res = await fetch('/admin/users', { credentials: 'include' });
        if (res.ok) {
            const users = await res.json();
            mockUsers.length = 0;
            mockUsers.push(...users);
            searchUsers();
        } else {
            const toast = document.getElementById('live-toast');
            const toastMsg = document.getElementById('toast-message');
            toastMsg.textContent = 'Failed to load users';
            toast.className = 'toast align-items-center text-bg-danger border-0';
            new bootstrap.Toast(toast).show();
        }
    } catch (err) {
        const toast = document.getElementById('live-toast');
        const toastMsg = document.getElementById('toast-message');
        toastMsg.textContent = 'Error loading users';
        toast.className = 'toast align-items-center text-bg-danger border-0';
        new bootstrap.Toast(toast).show();
    }
}
// Comment out until API is ready
// fetchUsers();

// Initial render
renderUsers(mockUsers);