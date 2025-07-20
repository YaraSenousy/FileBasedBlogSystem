import {
  fetchData,
  getTagFilterParam,
  renderPosts,
  showToast,
  loadTags,
  loadCategories,
  renderPagination,
  clearTags,
} from "./utils.js";

/**
 * Manages the current page number, limit per page, total pages, active tags, current view, user role,
 * and selected category for the dashboard.
 * @type {number} currentPage - The current page number.
 * @type {number} limit - The number of posts per page.
 * @type {number} totalPages - The total number of pages available.
 * @type {Set} activeTags - A Set of currently selected tag slugs.
 * @type {string} currentView - The current view (e.g., "published", "drafts", "scheduled", "my-posts").
 * @type {string|null} role - The user role (e.g., "admin", "editor", or null if unauthenticated).
 * @type {string|null} name - The user's name.
 * @type {string} selectedCategoryName - The name of the currently selected category.
 * @type {string} selectedCategory - The slug of the currently selected category.
 * @type {string} searchTerm - The current search term, if any.
 */
let currentPage = 1;
const limit = 3;
let totalPages = 1;
let activeTags = new Set();
let currentView = "published";
let role = null;
let name = null;
let selectedCategoryName = "All Categories";
let selectedCategory = "";
let searchTerm = "";

/**
 * Gets the page number, tags, category, and view from the URL query parameters.
 * @returns {Object} An object containing page, tags, and category.
 */
function getStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get("page"), 10);
  const tags = params.get("tags") ? params.get("tags").split(",").filter(tag => tag) : [];
  const category = params.get("category") || "";
  const pathParts = window.location.pathname.split("/").filter(part => part);
  const view = pathParts[pathParts.length - 1] === "dashboard" ? "published" : pathParts[pathParts.length - 1] || "published";
  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    tags: new Set(tags),
    category,
    view: ["published", "drafts", "scheduled"].includes(view) ? view : "published"
  };
}

/**
 * Updates the URL with the current page, tags, and category.
 * @param {number} page - The page number to set in the URL.
 * @param {Set} tags - The set of active tag slugs.
 * @param {string} category - The slug of the selected category.
 */
function updateURL(page, tags, category) {
  const params = new URLSearchParams();
  if (page !== 1) params.set("page", page);
  if (currentView === "published" && tags.size > 0) params.set("tags", [...tags].join(","));
  if (currentView === "published" && category) params.set("category", category);
  const basePath = "/dashboard";
  const path = currentView === "published" ? basePath : `${basePath}/${currentView}`;
  const newURL = `${path}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.pushState({ currentView, page, tags: [...tags], category }, "", newURL);
}

/**
 * Sets the current page, tags, and category, and updates the URL.
 * @param {number} page - The page number to set.
 * @param {Set} tags - The set of active tag slugs.
 * @param {string} category - The slug of the selected category.
 */
function setCurrentState(page, tags, category) {
  currentPage = page;
  activeTags = new Set(tags);
  selectedCategory = category;
  updateURL(page, activeTags, selectedCategory);
}

/**
 * Clears all tag filters and reloads posts.
 */
async function clearTagsHandler() {
  activeTags = new Set();
  setCurrentState(1, activeTags, selectedCategory);
  clearTags();
  await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory);
  await loadPosts();
}

/**
 * Loads and renders published posts for the current page and tag filters.
 */
async function loadPublishedPosts() {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  currentView = "published";
  updateActiveNav();

  const response = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
    true
  );
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container", role, name);
  renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
  await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory);
}

/**
 * Loads and renders draft posts for the current page.
 */
async function loadDrafts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("category-filter").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  activeTags = new Set();
  currentView = "drafts";
  updateActiveNav();
  setCurrentState(currentPage, activeTags, selectedCategory);

  const response = await fetchData(
    `/drafts?page=${currentPage}&limit=${limit}`,
    true
  );
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container", role, name);
  renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
}

/**
 * Loads and renders scheduled posts for the current page.
 */
async function loadScheduledPosts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("category-filter").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  activeTags = new Set();
  currentView = "scheduled";
  setCurrentState(currentPage, activeTags, selectedCategory);
  updateActiveNav();

  const response = await fetchData(
    `/scheduled?page=${currentPage}&limit=${limit}`,
    true
  );
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container", role, name);
  renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
}

/**
 * Loads and renders posts for a specific category.
 * @param {string} slug - The slug of the category to load.
 * @param {string} categoryName - The name of the category to display.
 */
async function loadPostsByCategory(slug, categoryName) {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  currentView = "published";
  updateActiveNav();
  document.getElementById("category-dropdown-button").textContent = categoryName;
  selectedCategoryName = categoryName;
  selectedCategory = slug;
  searchTerm = "";
  document.getElementById("search-box").value = "";

  try {
    const response = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
      true
    );
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderPosts(response.data, "posts-container", role, name);
    renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
    await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory);
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
    setCurrentState(page, activeTags, selectedCategory);
    loadPosts();
  }
}

/**
 * Advances to the next page of posts.
 */
function nextPage() {
  if (currentPage < totalPages) {
    setCurrentState(currentPage + 1, activeTags, selectedCategory);
    loadPosts();
  }
}

/**
 * Returns to the previous page of posts.
 */
function prevPage() {
  if (currentPage > 1) {
    setCurrentState(currentPage - 1, activeTags, selectedCategory);
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

  if (currentView === "drafts")
    document.getElementById("nav-drafts").classList.add("active");
  else if (currentView === "scheduled")
    document.getElementById("nav-scheduled").classList.add("active");
  else
    document.getElementById("nav-home").classList.add("active");
}

/**
 * Loads the appropriate posts based on the current view, category, or search term.
 */
async function loadPosts() {
  if (currentView === "drafts") {
    await loadDrafts();
  } else if (currentView === "scheduled") {
    await loadScheduledPosts();
  } else if (searchTerm) {
    try {
      const response = await fetchData(
        `/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${limit}`,
        true
      );
      totalPages = Math.ceil(response.totalItems / limit) || 1;
      renderPosts(response.data, "posts-container", role, name);
      renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
    } catch (err) {
      console.error("Search failed:", err.message);
      showToast("Search failed. Please try again.", "danger");
      document.getElementById("posts-container").innerHTML =
        "<h4>Search failed. Please try again.</h4>";
    }
  } else {
    const dropdown = document.getElementById("category-dropdown");
    const selected = dropdown.querySelector(".dropdown-item.active")?.dataset.value || "";
    const selectedName = dropdown.querySelector(".dropdown-item.active")?.textContent || "All Categories";
    document.getElementById("category-dropdown-button").textContent = selectedName;
    selectedCategoryName = selectedName;
    selectedCategory = selected;
    if (selected) await loadPostsByCategory(selected, selectedName);
    else await loadPublishedPosts();
  }
}

/**
 * Deletes a post with user confirmation.
 * @param {string} slug - The slug of the post to delete.
 * @param {string} title - The title of the post for confirmation.
 */
let pendingDelete = { slug: "", title: "" };
async function deletePost(slug, title) {
  pendingDelete.slug = slug;
  pendingDelete.title = title;

  document.querySelector(".modal-body").textContent = `Are you sure you want to delete "${title}"?`;

  const modal = new bootstrap.Modal(document.getElementById("deleteCategoryModal"));
  modal.show();
}

function deleteButtonInitialise() {
  document.getElementById("confirm-delete-btn").addEventListener("click", async () => {
    const { slug, title } = pendingDelete;

    try {
      const res = await fetch(`/posts/${slug}/delete`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        showToast("🗑️ Deleted Post Successfully", "success");
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteCategoryModal"));
        modal.hide();
        loadPosts();
      } else {
        showToast("❌ Failed to delete post", "danger");
        modal.hide();
      }
    } catch (err) {
      showToast("❌ Failed to delete post", "danger");
      modal.hide();
    }
  });
}

/**
 * Publishes a post immediately.
 * @param {string} slug - The slug of the post to publish.
 */
async function publishNow(slug) {
  const res = await fetch(`/posts/${slug}/publish`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) {
    showToast("✅ Published", "success");
    loadPosts();
  } else {
    showToast("Failed to publish post", "danger");
  }
}

/**
 * Schedules a post for a specific time.
 * @param {string} slug - The slug of the post to schedule.
 * @param {string} time - The scheduled publication time in ISO format.
 */
async function schedulePost(slug, time) {
  const res = await fetch(`/posts/${slug}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: time }),
    credentials: "include",
  });
  if (res.ok) {
    showToast("📅 Scheduled", "success");
    loadPosts();
  } else {
    showToast("Failed to schedule post", "danger");
  }
}

/**
 * Saves a post as a draft.
 * @param {string} slug - The slug of the post to save as draft.
 */
async function saveAsDraft(slug) {
  const res = await fetch(`/posts/${slug}/draft`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) {
    showToast("💾 Saved as Draft", "success");
    loadPosts();
  } else {
    showToast("Failed to save post as a draft", "danger");
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
    activeTags = new Set();
    setCurrentState(1, activeTags, "");
    document.getElementById("tag-filter").style.display = "none";
    document.getElementById("category-filter").style.display = "none";
    const dropdown = document.getElementById("category-dropdown");
    dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
    dropdown.querySelector("[data-value='']").classList.add("active");
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    selectedCategory = "";
    currentView = "published";
    updateActiveNav();
    try {
      const response = await fetchData(
        `/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${limit}`,
        true
      );
      totalPages = Math.ceil(response.totalItems / limit) || 1;
      renderPosts(response.data, "posts-container", role, name);
      renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
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
async function clearSearch() {
  document.getElementById("search-box").value = "";
  searchTerm = "";
  activeTags = new Set();
  setCurrentState(1, activeTags, "");
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  currentView = "published";
  updateActiveNav();
  await loadPublishedPosts();
}

/**
 * Logs out the user and redirects to the login page.
 */
async function logout() {
  await fetch("/logout", { method: "POST" });
  showToast("Logged out", "success");
  localStorage.removeItem("userInfo");
  location.href = "/login";
}

function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

/**
 * Loads and renders the user's posts for the current page.
 */
async function loadMyPosts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("category-filter").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  activeTags = new Set();
  currentView = "my-posts";
  setCurrentState(currentPage, activeTags, selectedCategory);
  updateActiveNav();

  try {
    const response = await fetchData(
      `/my-posts?page=${currentPage}&limit=${limit}`,
      true
    );
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderPosts(response.data, "posts-container", role, name);
    renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
  } catch (err) {
    console.error("Failed to load my posts:", err.message);
    showToast("Failed to load my posts", "danger");
    document.getElementById("posts-container").innerHTML =
      "<h4>Failed to load my posts. Please try again.</h4>";
  }
}

/**
 * Initializes the dashboard by loading categories, tags, and published posts,
 * and sets up event listeners for buttons.
 */
window.onload = async () => {
  ({ name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}"));
  if (!role) {
    window.open("/login", "_self");
    return;
  }
  document.getElementById("accountOffcanvasLabel").textContent = `Hello, ${name.split(" ")[0]}`;
  if (role === "editor") {
    document.getElementById("create-post").style.display = "none";
    document.getElementById("nav-drafts").innerText = "Drafts";
    document.getElementById("nav-my-posts").style.display = "none";
  }
  if (role !== "admin") {
    const adminFunctions = document.getElementsByClassName("admin-functions");
    for (const element of adminFunctions) {
      element.style.display = "none";
    }
  }
  if (role === "author") {
    document.getElementById("nav-scheduled").innerText = "My Scheduled Posts";
  }

  const { page, tags, category, view } = getStateFromURL();
  currentPage = page;
  activeTags = new Set(tags);
  selectedCategory = view === "published" ? category : "";
  currentView = view;

  await loadCategories(setCurrentState, loadPostsByCategory, activeTags, loadPublishedPosts);
  await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory);

  const dropdown = document.getElementById("category-dropdown");
  if (selectedCategory && currentView === "published") {
    const categoryItem = dropdown.querySelector(`.dropdown-item[data-value='${selectedCategory}']`);
    if (categoryItem) {
      dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
      categoryItem.classList.add("active");
      selectedCategoryName = categoryItem.textContent;
      document.getElementById("category-dropdown-button").textContent = selectedCategoryName;
    } else {
      selectedCategory = "";
      selectedCategoryName = "All Categories";
      document.getElementById("category-dropdown-button").textContent = "All Categories";
      dropdown.querySelector("[data-value='']").classList.add("active");
    }
  } else {
    selectedCategoryName = "All Categories";
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    dropdown.querySelector("[data-value='']").classList.add("active");
  }

  await loadPosts();

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
    currentView = "published";
    setCurrentState(1, activeTags, "");
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    selectedCategory = "";
    searchTerm = "";
    document.getElementById("search-box").value = "";
    loadPublishedPosts();
  });
  document.getElementById("nav-drafts").addEventListener("click", (e) => {
    e.preventDefault();
    currentView = "drafts";
    setCurrentState(1, new Set(), "");
    loadDrafts();
  });
  document.getElementById("nav-scheduled").addEventListener("click", (e) => {
    e.preventDefault();
    currentView = "scheduled";
    setCurrentState(1, new Set(), "");
    loadScheduledPosts();
  });
  document.getElementById("nav-my-posts").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("/my-posts", "_self");
  });
  document.getElementById("create-post").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("/create", "_self");
  });
  document.getElementById("account-logout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
  });

  window.addEventListener("popstate", async (event) => {
    if (event.state) {
      currentView = event.state.view || "published";
      currentPage = event.state.page || 1;
      activeTags = new Set(event.state.tags || []);
      selectedCategory = event.state.category || "";
      const dropdown = document.getElementById("category-dropdown");
      if (selectedCategory && currentView === "published") {
        const categoryItem = dropdown.querySelector(`.dropdown-item[data-value='${selectedCategory}']`);
        if (categoryItem) {
          dropdown.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("active"));
          categoryItem.classList.add("active");
          selectedCategoryName = categoryItem.textContent;
          document.getElementById("category-dropdown-button").textContent = selectedCategoryName;
        } else {
          selectedCategory = "";
          selectedCategoryName = "All Categories";
          document.getElementById("category-dropdown-button").textContent = "All Categories";
          dropdown.querySelector("[data-value='']").classList.add("active");
        }
      } else {
        selectedCategoryName = "All Categories";
        document.getElementById("category-dropdown-button").textContent = "All Categories";
        dropdown.querySelector("[data-value='']").classList.add("active");
      }
      await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory);
      await loadPosts();
    }
  });

  const savedTheme = localStorage.getItem("theme");
  const theme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (savedTheme) {
    updateThemeToggleIcon(savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    updateThemeToggleIcon("dark");
  }
  deleteButtonInitialise();

  const postsContainer = document.getElementById("posts-container");
  postsContainer.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const postEl = button.closest("article");
    const slug = postEl.querySelector("a[href^='/post/']").pathname.split("/").pop();

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