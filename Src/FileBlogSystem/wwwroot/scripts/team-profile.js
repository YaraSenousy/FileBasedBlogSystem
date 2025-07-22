// Import utility functions from utils.js
import { fetchData, renderPosts, showToast, renderPagination, theme } from "./utils.js";

// Placeholder profile picture (base64-encoded SVG, same as profile.js)
const placeholderProfilePic = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1MCA3NUM3NSAxNTAgMCA3NSA3NSAwIDE1MCA3NSBaIiBmaWxsPSIjN0M4N0E4Ii8+PHBhdGggZD0iTTExMi41IDc1QzExMi41IDEwMC4zMjMgOTguODIzIDExOS41IDc1IDExOUM1MS4xNzcgMTE5LjUgMzcuNSA5OS45NjggMzcuNSA3NUMzNy41IDUwLjAzMiA1MS4xNzcgMzAuNSA3NSA0NS41QzEwMC4zMjMgMzAuNSA4OC41IDUwLjAzMiAxMTIuNSA3NVoiIGZpbGw9IiM1OTY0ODAiLz48L3N2Zz4=";

// State for pagination and search
let currentPage = 1;
const limit = 3; // Same as blogs.js
let totalPages = 1;
let searchTerm = "";

/**
 * Gets the username from the URL path
 * @returns {string|null} The username from /profile/{username}
 */
function getUsernameFromURL() {
  const match = window.location.pathname.match(/^\/profiles\/([^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Fetches and displays the user's profile data
 */
async function loadProfile() {
  const username = getUsernameFromURL();
  if (!username) {
    showToast("Invalid user profile", "danger");
    return;
  }

  try {
    const user = await fetchData(`/users/profile/${username}`);
    if (!user) {
      showToast("User not found", "danger");
      return;
    }

    const elements = {
      profileName: document.getElementById("profile-name"),
      profileUsername: document.getElementById("profile-username"),
      profileEmail: document.getElementById("profile-email"),
      profileDescription: document.getElementById("profile-description"),
      profileRole: document.getElementById("profile-role"),
      profilePic: document.getElementById("profile-pic")
    };

    const missingElements = Object.entries(elements)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    if (missingElements.length > 0) {
      console.error(`Missing DOM elements: ${missingElements.join(", ")}`);
      showToast(`Profile elements missing: ${missingElements.join(", ")}`, "danger");
      return;
    }

    elements.profileName.textContent = user.name;
    elements.profileUsername.textContent = `@${user.username}`;
    elements.profileEmail.textContent = user.email || "No email provided";
    elements.profileDescription.textContent = user.description || "No description provided";
    elements.profileRole.textContent = user.role;
    elements.profilePic.src = user.profilePicture || placeholderProfilePic;
  } catch (err) {
    console.error("Failed to load profile:", err.message, err);
    showToast("Failed to load profile", "danger");
  }
}

/**
 * Loads and renders the user's published posts
 */
async function loadPosts() {
  const username = getUsernameFromURL();
  if (!username) return;

  try {
    const endpoint = searchTerm
      ? `/users/${username}/posts?q=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${limit}`
      : `/users/${username}/posts?page=${currentPage}&limit=${limit}`;
    const response = await fetchData(endpoint, true);
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderPosts(response.data, "posts-container");
    renderPagination(currentPage, totalPages, loadPosts, new Set(), "", setCurrentState);
  } catch (err) {
    console.error("Failed to load posts:", err.message);
    showToast("Failed to load posts", "danger");
    document.getElementById("posts-container").innerHTML = "<h4>Failed to load posts</h4>";
  }
}

/**
 * Sets the current page and updates the URL
 * @param {number} page - The page number to set
 */
function setCurrentState(page) {
  currentPage = page;
  const params = new URLSearchParams();
  if (page !== 1) params.set("page", page);
  if (searchTerm) params.set("q", searchTerm);
  const newURL = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.pushState({ page, searchTerm }, "", newURL);
}

/**
 * Handles search functionality
 */
async function onSearch() {
  searchTerm = document.getElementById("search-box").value.trim();
  setCurrentState(1);
  await loadPosts();
}

/**
 * Clears the search term and reloads posts
 */
function clearSearch() {
  searchTerm = "";
  document.getElementById("search-box").value = "";
  setCurrentState(1);
  loadPosts();
}

/**
 * Initializes the page
 */
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementsByTagName("title")[0].innerText = getUsernameFromURL() + " profile"|| "User Profile";

  // Load profile and posts
  await loadProfile();
  await loadPosts();

  // Event listeners
  const searchBox = document.getElementById("search-box");
  const searchBtn = document.getElementById("search-btn");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const prevPage = document.getElementById("prev-page");
  const nextPage = document.getElementById("next-page");

  if (searchBox) {
    searchBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSearch();
      }
    });
  } else {
    console.warn("search-box element not found");
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      onSearch();
    });
  } else {
    console.warn("search-btn element not found");
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearSearch();
    });
  } else {
    console.warn("clear-search-btn element not found");
  }

  if (prevPage) {
    prevPage.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentPage > 1) {
        setCurrentState(currentPage - 1);
        loadPosts();
      }
    });
  } else {
    console.warn("prev-page element not found");
  }

  if (nextPage) {
    nextPage.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentPage < totalPages) {
        setCurrentState(currentPage + 1);
        loadPosts();
      }
    });
  } else {
    console.warn("next-page element not found");
  }

  // Initialize theme
  theme();

  // Handle browser back/forward navigation
  window.addEventListener("popstate", async (event) => {
    if (event.state) {
      currentPage = event.state.page || 1;
      searchTerm = event.state.searchTerm || "";
      document.getElementById("search-box").value = searchTerm;
      await loadPosts();
    }
  });
});