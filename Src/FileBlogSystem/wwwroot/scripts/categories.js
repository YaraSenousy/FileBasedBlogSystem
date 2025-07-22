
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
const ITEMS_PER_PAGE = 10; // Number of categories per page
let categories = []; // Store categories as objects
let currentPage = 1; // Current pagination page
let sortField = 'name'; // Current sort field
let sortDirection = 'asc'; // Sort direction: 'asc' or 'desc'

/**
 * Renders categories in the table with sorting and pagination
 * @param {Object[]} categoriesToRender - Array of category objects to display
 */
function renderCategories(categoriesToRender) {
    // Sort categories by the current sort field and direction
    const sortedCategories = [...categoriesToRender].sort((a, b) => {
        const valA = a[sortField].toLowerCase();
        const valB = b[sortField].toLowerCase();
        return sortDirection === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    // Paginate categories
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedCategories = sortedCategories.slice(start, end);

    // Render table rows
    const tbody = document.getElementById('categories-table-body');
    tbody.innerHTML = '';
    paginatedCategories.forEach(category => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${category.name}</td>
            <td>${category.slug}</td>
            <td>${category.description || ''}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm edit-btn my-1 mx-2" data-slug="${category.slug}" data-bs-toggle="modal" data-bs-target="#editCategoryModal">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm my-1 mx-2 delete-btn" data-slug="${category.slug}" data-bs-toggle="modal" data-bs-target="#deleteCategoryModal">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update pagination controls
    renderPagination(sortedCategories.length);
}

/**
 * Renders pagination controls based on total categories
 * @param {number} totalCategories - Total number of categories after filtering
 */
function renderPagination(totalCategories) {
    const totalPages = Math.ceil(totalCategories / ITEMS_PER_PAGE);
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
 * Filters categories based on search query and re-renders the table
 */
function searchCategories(reset = true) {
    const query = document.getElementById('search-categories').value.toLowerCase();
    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(query) || category.slug.toLowerCase().includes(query)
    );
    if (reset)
        currentPage = 1;
    renderCategories(filteredCategories);
}

/**
 * Clears the search input and re-renders all categories
 */
document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('search-categories').value = '';
    currentPage = 1;
    renderCategories(categories);
});

// Handle search input
document.getElementById('search-categories').addEventListener('input', searchCategories);

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
    searchCategories(false);
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
        searchCategories();
    });
});

/**
 * Handles add category form submission
 * @param {Event} e - Form submission event
 */
document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch('/admin/categories', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            const newCategory = await res.json();
            categories.push(newCategory);
            toastMsg.textContent = 'Category added successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            e.target.reset();
            bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
            searchCategories();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error adding category';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

/**
 * Populates edit category form with category data
 */
document.getElementById('categories-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
        const slug = e.target.closest('.edit-btn').dataset.slug;
        const category = categories.find(c => c.slug === slug);
        document.getElementById('edit-slug-original').value = category.slug;
        document.getElementById('edit-name').value = category.name;
        document.getElementById('edit-description').value = category.description || '';
    }
});

/**
 * Handles edit category form submission
 * @param {Event} e - Form submission event
 */
document.getElementById('editCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const originalSlug = formData.get('slug_original');
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/categories/${originalSlug}`, {
            method: 'PATCH',
            body: formData,
            credentials: 'include',
        });
        if (res.ok) {
            const updatedCategory = await res.json();
            const index = categories.findIndex(c => c.slug === originalSlug);
            categories[index] = updatedCategory;
            toastMsg.textContent = 'Category updated successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('editCategoryModal')).hide();
            searchCategories();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error updating category';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
});

/**
 * Stores slug for deletion
 */
let categoryToDelete = null;
document.getElementById('categories-table-body').addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
        categoryToDelete = e.target.closest('.delete-btn').dataset.slug;
    }
});

/**
 * Handles delete category confirmation
 */
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!categoryToDelete) return;
    const toast = document.getElementById('live-toast');
    const toastMsg = document.getElementById('toast-message');
    try {
        const res = await fetch(`/admin/categories/${categoryToDelete}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (res.ok) {
            categories.splice(categories.findIndex(c => c.slug === categoryToDelete), 1);
            toastMsg.textContent = 'Category deleted successfully';
            toast.className = 'toast align-items-center text-bg-success border-0';
            bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal')).hide();
            searchCategories();
        } else {
            const error = await res.text();
            toastMsg.textContent = `Failed: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
        }
    } catch (err) {
        toastMsg.textContent = 'Error deleting category';
        toast.className = 'toast align-items-center text-bg-danger border-0';
    }
    new bootstrap.Toast(toast).show();
    categoryToDelete = null;
});

/**
 * Fetches categories from the API and updates the categories array
 */
async function fetchCategories() {
    try {
        const res = await fetch('/categories');
        if (res.ok) {
            categories = await res.json();
            searchCategories();
        } else {
            const error = await res.text();
            const toast = document.getElementById('live-toast');
            const toastMsg = document.getElementById('toast-message');
            toastMsg.textContent = `Failed to load categories: ${error}`;
            toast.className = 'toast align-items-center text-bg-danger border-0';
            new bootstrap.Toast(toast).show();
        }
    } catch (err) {
        const toast = document.getElementById('live-toast');
        const toastMsg = document.getElementById('toast-message');
        toastMsg.textContent = `Error loading categories: ${err.message}`;
        toast.className = 'toast align-items-center text-bg-danger border-0';
        new bootstrap.Toast(toast).show();
    }
}

// Initialize by fetching categories
fetchCategories();
await updatePendingRequestsCount();