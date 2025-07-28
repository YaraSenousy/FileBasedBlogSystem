import { fetchData, getTagFilterParam, renderPosts, showToast, loadTags, loadCategories, renderPagination, clearTags, theme } from "./utils.js";

/**
 * Manages the current page number, limit per page, total pages, active tags, and selected category for the homepage.
 * @type {number} currentPage - The current page number.
 * @type {number} limit - The number of posts per page.
 * @type {number} totalPages - The total number of pages available.
 * @type {Set} activeTags - A Set of currently selected tag slugs.
 * @type {string} selectedCategoryName - The name of the currently selected category.
 * @type {string} selectedCategory - The slug of the currently selected category.
 * @type {string} searchTerm - The current search term, if any.
 */
let currentPage = 1;
const limit = 3;
let totalPages = 1;
let activeTags = new Set();
let selectedCategoryName = "All Categories";
let selectedCategory = "";
let searchTerm = "";

/**
 * Gets the page number, tags, and category from the URL query parameters.
 * @returns {Object} An object containing page, tags, and category.
 */
function getStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get("page"), 10);
  const tags = params.get("tags") ? params.get("tags").split(",").filter(tag => tag) : [];
  const category = params.get("category") || "";
  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    tags: new Set(tags),
    category
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
  if (tags.size > 0) params.set("tags", [...tags].join(","));
  if (category) params.set("category", category);
  const newURL = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.pushState({ page, tags: [...tags], category }, "", newURL);
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
  await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory); // Re-render tags
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
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  searchTerm = "";
  document.getElementById("search-box").value = "";
  updateActiveNav();

  const response = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
    true
  );
  totalPages = Math.ceil(response.totalItems / limit) || 1;
  renderPosts(response.data, "posts-container");
  renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
  await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory); // Re-render tags to sync with activeTags
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
  selectedCategory = slug;
  searchTerm = "";
  document.getElementById("search-box").value = "";

  try {
    const response = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`,
      true
    );
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderPosts(response.data, "posts-container");
    renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
    await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory); // Re-render tags to sync with activeTags
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
    const selected = dropdown.querySelector(".dropdown-item.active")?.dataset.value || "";
    const selectedName =
      dropdown.querySelector(".dropdown-item.active")?.textContent || "All Categories";
    document.getElementById("category-dropdown-button").textContent = selectedName;
    selectedCategoryName = selectedName;
    selectedCategory = selected;
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
    activeTags = new Set();
    setCurrentState(1, activeTags, "");
    document.getElementById("tag-filter").style.display = "none";
    document.getElementById("category-filter").style.display = "none";
    const dropdown = document.getElementById("category-dropdown");
    dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
      item.classList.remove("active")
    );
    dropdown.querySelector("[data-value='']").classList.add("active");
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    selectedCategory = "";
    updateActiveNav();
    try {
      const response = await fetchData(
        `/search?q=${encodeURIComponent(term)}&page=${currentPage}&limit=${limit}`,
        true
      );
      totalPages = Math.ceil(response.totalItems / limit) || 1;
      renderPosts(response.data, "posts-container");
      renderPagination(currentPage, totalPages, loadPosts, activeTags, selectedCategory, setCurrentState);
      await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory); // Re-render tags to sync with activeTags
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
  activeTags = new Set();
  setCurrentState(1, activeTags, "");
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("category-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("category-dropdown-button").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  selectedCategory = "";
  updateActiveNav();
  loadPublishedPosts();
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
            `https://51.103.244.171/subscribe?email=${encodeURIComponent(email)}`,
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
window.onload = async () => {
  // Set initial state from URL
  const { page, tags, category } = getStateFromURL();
  currentPage = page;
  activeTags = new Set(tags);
  selectedCategory = category;

  await loadCategories(setCurrentState, loadPostsByCategory, activeTags, loadPublishedPosts);
  await loadTags(setCurrentState, activeTags, loadPosts, selectedCategory);

  // Set category dropdown based on URL
  const dropdown = document.getElementById("category-dropdown");
  if (category) {
    const categoryItem = dropdown.querySelector(`.dropdown-item[data-value='${category}']`);
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
  }

  await loadPosts();
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
    setCurrentState(1, activeTags, ""); // Preserve activeTags when navigating to home
    clearSearch();
  });

  // Handle browser back/forward navigation
  window.addEventListener("popstate", async (event) => {
    if (event.state) {
      currentPage = event.state.page || 1;
      activeTags = new Set(event.state.tags || []);
      selectedCategory = event.state.category || "";
      const dropdown = document.getElementById("category-dropdown");
      if (selectedCategory) {
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

  theme();
};