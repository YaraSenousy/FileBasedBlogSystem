import { fetchData, getTagFilterParam, renderPosts, showToast, loadTags, loadCategories, renderPagination, clearTags } from "./utils.js";

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
 * Gets the page number from the URL query parameter.
 * @returns {number} The page number from the URL, or 1 if not specified.
 */
function getPageFromURL() {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get("page"), 10);
  return isNaN(page) || page < 1 ? 1 : page;
}

/**
 * Updates the URL with the current page number.
 * @param {number} page - The page number to set in the URL.
 */
function updateURL(page) {
  const params = new URLSearchParams(window.location.search);
  if (page === 1) {
    params.delete("page");
  } else {
    params.set("page", page);
  }
  const newURL = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.pushState({ page }, "", newURL);
}

/**
 * Sets the current page and updates the URL.
 * @param {number} current - The page number to set.
 */
function setCurrentPage(current) {
  currentPage = current;
  updateURL(current);
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
    setCurrentPage(page);
    loadPosts();
  }
}

/**
 * Advances to the next page of posts.
 */
function nextPage() {
  if (currentPage < totalPages) {
    setCurrentPage(currentPage + 1);
    loadPosts();
  }
}

/**
 * Returns to the previous page of posts.
 */
function prevPage() {
  if (currentPage > 1) {
    setCurrentPage(currentPage - 1);
    loadPosts();
  }
}

/**
 * Updates the active navigation state for the homepage.
 * Highlights the "Home" link as active.
 */
function updateActiveNav() {
  document.getElementById("nav-blogs").classList.add("active");
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
    setCurrentPage(1);
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
  setCurrentPage(1);
  updateActiveNav();
  loadPublishedPosts();
}

function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

/**
 * Opens and handles the subscribing form.
 */
async function newsletter() {
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("newsletter-email").value;
      if (email) {
        const spinner = document.getElementById("newsletter-spinner");
        spinner.style.display = "inline-block"; 
        try {
          const response = await fetch(
            `http://localhost:5188/subscribe?email=${encodeURIComponent(email)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (response.ok) {
            showToast("Successfully subscribed! Check your email for confirmation.", "success");
            newsletterForm.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('subscribeModal'));
            modal.hide();
          } else if (response.status === 400) {
            showToast("Subscription failed. Invalid email", "danger");
          } else if (response.status === 409) {
            showToast("Subscription failed. Email already used", "danger");
          } else {
            showToast("Subscription failed.", "danger");
          }
        } catch (error) {
          console.error("Error subscribing:", error);
          showToast("An error occurred. Please try again later.", "danger");
        } finally {
          spinner.style.display = "none";
        }
      }
    });
  }
}

/**
 * Initializes the homepage by loading categories, tags, and published posts,
 * and sets up event listeners for search, navigation, and popstate.
 */
window.onload = () => {
  currentPage = getPageFromURL();

  loadCategories(setCurrentPage, loadPostsByCategory);
  loadTags(setCurrentPage, activeTags, loadPosts);
  loadPublishedPosts();
  newsletter();

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
  document.getElementById("nav-blogs").addEventListener("click", (e) => {
    e.preventDefault();
    setCurrentPage(1);
    clearSearch();
  });
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
  });

  window.addEventListener("popstate", (event) => {
    if (event.state && event.state.page) {
      currentPage = event.state.page;
      loadPosts();
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
};