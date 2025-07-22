import {updatePendingRequestsCount} from "./utils.js";

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
 */
const ITEMS_PER_PAGE = 10; // Number of tags per page
let tags = []; // Store tags as objects
let currentPage = 1; // Current pagination page
let sortField = 'name'; // Current sort field
let sortDirection = 'asc'; // Sort direction: 'asc' or 'desc'

/**
 * Renders tags in the table with sorting and pagination
 * @param {Object[]} tagsToRender - Array of tag objects to display
 */
function renderTags(tagsToRender) {
    // Sort tags by the current sort field and direction
    const sortedTags = [...tagsToRender].sort((a, b) => {
        const valA = a[sortField].toLowerCase();
        const valB = b[sortField].toLowerCase();
        return sortDirection === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    // Paginate tags
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedTags = sortedTags.slice(start, end);

    // Render table rows
    const tbody = document.getElementById('tags-table-body');
    tbody.innerHTML = '';
    paginatedTags.forEach(tag => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tag.name}</td>
            <td>${tag.slug}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm edit-btn my-1 mx-2" data-slug="${tag.slug}" data-bs-toggle="modal" data-bs-target="#editTagModal">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm my-1 mx-2 delete-btn" data-slug="${tag.slug}" data-bs-toggle="modal" data-bs-target="#deleteTagModal">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update pagination controls
    renderPagination(sortedTags.length);
}

/**
 * Renders pagination controls based on total tags
 * @param {number} totalTags - Total number of tags after filtering
 */
function renderPagination(totalTags) {
    const totalPages = Math.ceil(totalTags / ITEMS_PER_PAGE);
    if (totalPages === 1) {
        document.getElementById('pagination').style.display = 'none';
        return; 
    }else 
        document.getElementById('pagination').style.display = 'block';
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
 * Filters tags based on search query and re-renders the table
 */
function searchTags(reset = true) {
    const query = document.getElementById('search-tags').value.toLowerCase();
    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(query) || tag.slug.toLowerCase().includes(query)
    );
    if (reset) 
        currentPage = 1;
    renderTags(filteredTags);
}

/**
 * Clears the search input and re-renders all tags
 */
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-tags').value = '';
    currentPage = 1;
    renderTags(tags);
});

// Handle search input
document.getElementById('search-tags').addEventListener('input', searchTags);

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
    searchTags(false);
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
        searchTags();
    });
});

/**
 * Handles add tag form submission
 * @param {Event} e - Form submission event
 */
document.getElementById('addTagForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch('/admin/tags', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            const newTag = await res.json();
            tags.push(newTag);
            toastMsg.textContent = 'Tag added successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            e.target.reset();
            bootstrap.Modal.getInstance(document.getElementById('addTagModal')).hide();
            searchTags();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error adding tag';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

/**
 * Populates edit tag form with tag data
 */
document.getElementById('tags-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
        const slug = e.target.closest('.edit-btn').dataset.slug;
        const tag = tags.find(t => t.slug === slug);
        document.getElementById('edit-slug-original').value = tag.slug;
        document.getElementById('edit-name').value = tag.name;
    }
});

/**
 * Handles edit tag form submission
 * @param {Event} e - Form submission event
 */
document.getElementById('editTagForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const originalSlug = formData.get('slug_original');
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/tags/${originalSlug}`, {
            method: 'PATCH',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            const updatedTag = await res.json();
            const index = tags.findIndex(t => t.slug === originalSlug);
            tags[index] = updatedTag;
            toastMsg.textContent = 'Tag updated successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('editTagModal')).hide();
            searchTags();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error updating tag';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

/**
 * Stores slug for deletion
 */
let tagToDelete = null;
document.getElementById('tags-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
        tagToDelete = e.target.closest('.delete-btn').dataset.slug;
    }
});

/**
 * Handles delete tag confirmation
 */
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!tagToDelete) return;
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/tags/${tagToDelete}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (res.ok) {
            tags.splice(tags.findIndex(t => t.slug === tagToDelete), 1);
            toastMsg.textContent = 'Tag deleted successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('deleteTagModal')).hide();
            searchTags();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error deleting tag';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
    tagToDelete = null;
});

/**
 * Fetches tags from the API and updates the tags array
 */
async function fetchTags() {
    try {
        const res = await fetch('/tags');
        if (res.ok) {
            tags = await res.json();
            searchTags();
        } else {
            const error = await res.text();
            const toast = document.getElementById('live-toast');
            const toastMsg = document.getElementById('toast-message');
            toastMsg.textContent = `Failed to load tags: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
            new bootstrap.Toast(toast).show();
        }
    } catch (err) {
        const toast = document.getElementById('live-toast');
        const toastMsg = document.getElementById('toast-message');
        toastMsg.textContent = `Error loading tags: ${err.message}`;
        toast.className = 'toast align-items-center text-bg-danger border-0';
        new bootstrap.Toast(toast).show();
    }
}

// Initialize by fetching tags
fetchTags();
updatePendingRequestsCount();