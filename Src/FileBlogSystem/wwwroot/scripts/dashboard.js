import { fetchData, getTagFilterParam, renderPosts, showToast, loadTags, loadCategories, renderPagination, clearTags, toggleTheme } from "./utils.js";

/**
 * Manages the current page number, limit per page, total pages, active tags, current view, user role,
 * and selected category for the dashboard.
 * @type {number} currentPage - The current page number.
 * @type {number} limit - The number of posts per page.
 * @type {number} totalPages - The total number of pages available.
 * @type {Set} activeTags - A Set of currently selected tag slugs.
 * @type {string} currentView - The current view (e.g., "published", "drafts", "scheduled").
 * @type {string|null} role - The user role (e.g., "admin", "editor", or null if unauthenticated).
 * @type {string} selectedCategoryName - The name of the currently selected category.
 * @type {string} searchTerm - The current search term, if any.
 */
let currentPage = 1;
const limit = 1;
let totalPages = 1;
let activeTags = new Set();
let currentView = "published";
let role = null;
let selectedCategoryName = "All Categories";
let searchTerm = "";

/**
 * Sets the current page
 */
function setCurrentPage(current) {
  currentPage = current;
}

/**
 * Clears all tag filters and reloads posts.
 */
function clearTagsHandler() {
  activeTags.clear();
  currentPage = 1;
  clearTags();
  loadPosts();
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
  currentView = "published";
  updateActiveNav();

  const response = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
    true
  );
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container", role);
  renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
}

/**
 * Loads and renders draft posts for the current page.
 */
async function loadDrafts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("category-filter").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  currentView = "drafts";
  updateActiveNav();

  const response = await fetchData(`/drafts?page=${currentPage}&limit=${limit}`, true);
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container", role);
  renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
}

/**
 * Loads and renders scheduled posts for the current page.
 */
async function loadScheduledPosts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("category-filter").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  currentView = "scheduled";
  updateActiveNav();

  const response = await fetchData(`/scheduled?page=${currentPage}&limit=${limit}`, true);
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container", role);
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
  currentView = "published";
  updateActiveNav();
  document.getElementById("category-dropdown-button").textContent = name;
  selectedCategoryName = name;
  searchTerm = "";
  document.getElementById("search-box").value = "";

  try {
    const response = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(
        activeTags
      )}`,
      true
    );
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderPosts(response.data, "posts-container", role);
    renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
  } catch (err) {
    console.log("Failed to load the posts:", err.message);
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
 * Updates the active navigation state based on the current view.
 * Highlights the appropriate nav link as active.
 */
function updateActiveNav() {
  const navItems = document.querySelectorAll(".navbar-nav .nav-link");
  navItems.forEach((item) => item.classList.remove("active"));
  document.getElementById("nav-home").classList.remove("active");

  if (currentView === "drafts") document.getElementById("nav-drafts").classList.add("active");
  else if (currentView === "scheduled")
    document.getElementById("nav-scheduled").classList.add("active");
  else if (currentView === "create") document.getElementById("nav-create").classList.add("active");
  else document.getElementById("nav-home").classList.add("active");
}

/**
 * Loads the appropriate posts based on the current view, category, or search term.
 */
async function loadPosts() {
  if (currentView === "drafts") {
    loadDrafts();
  } else if (currentView === "scheduled") {
    loadScheduledPosts();
  } else if (searchTerm) {
    try {
      const response = await fetchData(
        `/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${limit}`,
        true
      );
      totalPages = Math.ceil(response.totalItems / limit) || 1;
      renderPosts(response.data, "posts-container", role);
      renderPagination(currentPage, setCurrentPage, totalPages, loadPosts);
    } catch (err) {
      console.error("Search failed:", err.message);
      showToast("Search failed. Please try again.", "danger");
      document.getElementById("posts-container").innerHTML =
        "<h4>Search failed. Please try again.</h4>";
    }
  } else {
    const selected = document.getElementById("category-dropdown").querySelector(
      ".dropdown-item.active"
    )?.dataset.value;
    const selectedName =
      document.getElementById("category-dropdown").querySelector(".dropdown-item.active")
        ?.textContent || "All Categories";
    document.getElementById("category-dropdown-button").textContent = selectedName;
    selectedCategoryName = selectedName;
    if (selected) loadPostsByCategory(selected, selectedName);
    else loadPublishedPosts();
  }
}

/**
 * Deletes a post after user confirmation.
 * @param {string} slug - The slug of the post to delete.
 * @param {string} title - The title of the post for confirmation.
 */
async function deletePost(slug, title) {
  if (confirm(`Are you sure you want to delete: ${title}`)) {
    await fetch(`/posts/${slug}/delete`, { method: "POST", credentials: "include" });
    showToast("🗑️ Deleted Post Successfully", "success");
    loadPosts();
  }
}

/**
 * Publishes a post immediately.
 * @param {string} slug - The slug of the post to publish.
 */
async function publishNow(slug) {
  await fetch(`/posts/${slug}/publish`, { method: "POST", credentials: "include" });
  showToast("✅ Published", "success");
  loadPosts();
}

/**
 * Schedules a post for a specific time.
 * @param {string} slug - The slug of the post to schedule.
 * @param {string} time - The scheduled publication time in ISO format.
 */
async function schedulePost(slug, time) {
  await fetch(`/posts/${slug}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: time }),
    credentials: "include",
  });
  showToast("📅 Scheduled", "success");
  loadPosts();
}

/**
 * Saves a post as a draft.
 * @param {string} slug - The slug of the post to save as draft.
 */
async function saveAsDraft(slug) {
  await fetch(`/posts/${slug}/draft`, { method: "POST", credentials: "include" });
  showToast("💾 Saved as Draft", "success");
  loadPosts();
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
    currentView = "published";
    updateActiveNav();
    try {
      const response = await fetchData(
        `/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${limit}`,
        true
      );
      totalPages = Math.ceil(response.totalItems / limit) || 1;
      renderPosts(response.data, "posts-container", role);
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
  currentView = "published";
  currentPage = 1;
  updateActiveNav();
  loadPublishedPosts();
}

/**
 * Logs out the user and redirects to the login page.
 */
async function logout() {
  await fetch("/logout", { method: "POST" });
  showToast("Logged out", "success");
  location.href = "/login";
}

/**
 * Retrieves the user role from the cookie.
 * @returns {string|null} The user role or null if not found.
 */
function getUserRoleFromCookie() {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith("user-role="));
  return value ? decodeURIComponent(value.split("=")[1]) : null;
}

/**
 * Initializes the dashboard by loading categories, tags, and published posts,
 * and sets up event listeners for buttons.
 */
window.onload = () => {
  role = getUserRoleFromCookie();
  if (!role) window.open("/login", "_self");
  if (role === "editor") {
    document.getElementById("nav-create").style.display = "none";
    document.getElementById("nav-add-dropdown").style.display = "none";
  } else if (role !== "admin") {
    document.getElementById("nav-add-dropdown").style.display = "none";
  }

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
  document.getElementById("clear-tags-btn").addEventListener("click", (e) => {
    e.preventDefault();
    clearTagsHandler();
  });
  document.getElementById("all-categories").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    searchTerm = "";
    document.getElementById("search-box").value = "";
    currentPage = 1;
    loadPublishedPosts();
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
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    searchTerm = "";
    document.getElementById("search-box").value = "";
    loadPublishedPosts();
  });
  document.getElementById("nav-drafts").addEventListener("click", (e) => {
    e.preventDefault();
    currentPage = 1;
    loadDrafts();
  });
  document.getElementById("nav-scheduled").addEventListener("click", (e) => {
    e.preventDefault();
    currentPage = 1;
    loadScheduledPosts();
  });
  document.getElementById("create-post").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("/create", "_self");
  });
  document.getElementById("account-logout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
  document.getElementById("theme-toggle").addEventListener("click", (e) => {
    toggleTheme();
  });

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.getElementById("theme-toggle").checked = savedTheme === "dark";
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById("theme-toggle").checked = true;
  }

  // Event listeners for dynamically created post action buttons
  const postsContainer = document.getElementById("posts-container");
  postsContainer.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const postEl = button.closest("article");
    const slug = postEl.querySelector("a[href^='/post?slug=']").href.split("slug=")[1].split("&")[0];

    if (button.textContent === "Edit Post") {
      window.open(`/create?slug=${slug}`, "_self");
    } else if (button.textContent === "Delete Post") {
      deletePost(slug, postEl.querySelector("h2").textContent);
    } else if (button.textContent === "Publish Now") {
      publishNow(slug);
    } else if (button.textContent === "Save as Draft") {
      saveAsDraft(slug);
    } else if (button.textContent === "Schedule") {
      const timeInput = postEl.querySelector("input[type='datetime-local']");
      if (timeInput && timeInput.value) {
        schedulePost(slug, timeInput.value);
      } else {
        showToast("Please choose a time", "danger");
      }
    }
  });
};