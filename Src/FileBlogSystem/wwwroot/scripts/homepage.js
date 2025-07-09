import { fetchData, getTagFilterParam, renderPosts, showToast, loadTags, loadCategories, renderPagination } from "./utils.js";

/**
 * Manages the current page number, limit per page, total pages, active tags, and selected category for the homepage.
 * @type {number} currentPage - The current page number.
 * @type {number} limit - The number of posts per page.
 * @type {number} totalPages - The total number of pages available.
 * @type {Set} activeTags - A Set of currently selected tag slugs.
 * @type {string} selectedCategoryName - The name of the currently selected category.
 * @type {string} searchTerm - The current search term, if any.
 */
let currentPage = 1;
const limit = 3;
let totalPages = 1;
let activeTags = new Set();
let selectedCategoryName = "All Categories";
let searchTerm = "";

/**
 * Sets the current page
 */
function setCurrentPage(current) {
  currentPage = current;
}

/**
 * Loads and renders published posts for the current page and tag filters.
 */
async function loadPublishedPosts() {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  updateActiveNav();

  const response = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
    true
  );
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container");
  renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
}

/**
 * Loads and renders posts for a specific category.
 * @param {string} slug - The slug of the category to load.
 * @param {string} name - The name of the category to display.
 */
async function loadPostsByCategory(slug, name) {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  document.getElementById("category-dropdown-button").textContent = name;
  selectedCategoryName = name;
  searchTerm = "";
  document.getElementById("search-box").value = "";

  try {
    const response = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
      true
    );
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderPosts(response.data, "posts-container");
    renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
  } catch (err) {
    console.error("Failed to load posts:", err.message);
    document.getElementById("posts-container").innerHTML = "<h4>Failed to load posts</h4>";
    showToast("Failed to load posts", "danger");
  }
}

/**
 * Navigates to a specific page.
 * @param {number} page - The page number to navigate to.
 */
function goToPage(page) {
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    loadPosts();
  }
}

/**
 * Advances to the next page of posts.
 */
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadPosts();
  }
}

/**
 * Returns to the previous page of posts.
 */
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadPosts();
  }
}

/**
 * Updates the active navigation state for the homepage.
 * Highlights the "Home" link as active.
 */
function updateActiveNav() {
  document.getElementById("nav-home").classList.add("active");
}

/**
 * Loads the appropriate posts based on the current category or search term.
 */
function loadPosts() {
  if (searchTerm) {
    onSearch();
  } else {
    const dropdown = document.getElementById("category-dropdown");
    const selected = dropdown.querySelector(".dropdown-item.active")?.dataset.value;
    const selectedName =
      dropdown.querySelector(".dropdown-item.active")?.textContent || "All Categories";
    document.getElementById("category-dropdown-button").textContent = selectedName;
    selectedCategoryName = selectedName;
    if (selected) loadPostsByCategory(selected, selectedName);
    else loadPublishedPosts();
  }
}

/**
 * Handles the search functionality.
 * Performs a search if a term is provided, otherwise clears the search.
 */
async function onSearch() {
  const term = document.getElementById("search-box").value.trim();
  if (term) {
    searchTerm = term;
    currentPage = 1;
    document.getElementById("tag-filter").style.display = "none";
    document.getElementById("category-filter").style.display = "none";
    const dropdown = document.getElementById("category-dropdown");
    dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
      item.classList.remove("active")
    );
    dropdown.querySelector("[data-value='']").classList.add("active");
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    updateActiveNav();
    try {
      const response = await fetchData(
        `/search?q=${encodeURIComponent(term)}&page=${currentPage}&limit=${limit}`,
        true
      );
      totalPages = Math.ceil(response.totalItems / limit) || 1;
      renderPosts(response.data, "posts-container");
      renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
    } catch (err) {
      console.error("Search failed:", err.message);
      showToast("Search failed. Please try again.", "danger");
      document.getElementById("posts-container").innerHTML =
        "<h4>Search failed. Please try again.</h4>";
    }
  } else {
    clearSearch();
  }
}

/**
 * Clears the search term and resets to the default published posts view.
 */
function clearSearch() {
  document.getElementById("search-box").value = "";
  searchTerm = "";
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  currentPage = 1;
  updateActiveNav();
  loadPublishedPosts();
}

/**
 * Initializes the homepage by loading categories, tags, and published posts,
 * and sets up event listeners for search and navigation.
 */
window.onload = () => {
  loadCategories(setCurrentPage, loadPostsByCategory);
  loadTags(setCurrentPage, activeTags, loadPosts);
  loadPublishedPosts();

  const searchBox = document.getElementById("search-box");
  searchBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch();
    }
  });
  document.getElementById("search-btn").addEventListener("click", (e) => {
    e.preventDefault();
    onSearch();
  });
  document.getElementById("clear-search-btn").addEventListener("click", (e) => {
    e.preventDefault();
    clearSearch();
  });
  document.getElementById("all-categories").addEventListener("click", (e) => {
    e.preventDefault();
    clearSearch();
  });
  document.getElementById("next-page").addEventListener("click", (e) => {
    e.preventDefault();
    nextPage();
  });
  document.getElementById("prev-page").addEventListener("click", (e) => {
    e.preventDefault();
    prevPage();
  });
  document.getElementById("nav-home").addEventListener("click", (e) => {
    e.preventDefault();
    currentPage = 1;
    clearSearch();
  });
};