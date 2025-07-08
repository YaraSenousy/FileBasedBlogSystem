import { fetchData, getTagFilterParam, renderPosts, showToast } from "./utils.js";

/**
 * Manages the current page number, limit per page, active tags, current view, user role,
 * and selected category for the dashboard.
 * @type {number} currentPage - The current page number.
 * @type {number} limit - The number of posts per page.
 * @type {Set} activeTags - A Set of currently selected tag slugs.
 * @type {string} currentView - The current view (e.g., "published", "drafts", "scheduled").
 * @type {string|null} role - The user role (e.g., "admin", "editor", or null if unauthenticated).
 * @type {string} selectedCategoryName - The name of the currently selected category.
 */
let currentPage = 1;
const limit = 3;
let activeTags = new Set();
let currentView = "published";
let role = null;
let selectedCategoryName = "All Categories";
let selectedCategorySlug = ""; // Added to track the selected category slug

/**
 * Loads and renders tag checkboxes for filtering posts.
 * Fetches tags from the /tags endpoint and sets up event listeners for checkbox changes.
 */
async function loadTags() {
  const tags = await fetchData("/tags");
  const container = document.getElementById("tag-checkboxes");

  tags.forEach((tag) => {
    const label = document.createElement("label");
    label.className = "form-check-label";
    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.value = tag.slug;
    input.id = `tag-${tag.slug}`;

    input.onchange = () => {
      if (input.checked) activeTags.add(tag.slug);
      else activeTags.delete(tag.slug);
      currentPage = 1;
      document.getElementById("prev-page").style.visibility = "hidden";
      loadPosts();
    };

    label.appendChild(input);
    label.append(` ${tag.name}`);
    container.appendChild(label);
  });
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
  selectedCategorySlug = "";
  currentView = "published";
  updateActiveNav();

  const posts = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`
  );
  renderPosts(posts, "posts-container", role);
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
  selectedCategorySlug = "";
  currentView = "drafts";
  updateActiveNav();

  const posts = await fetchData(`/drafts?page=${currentPage}&limit=${limit}`);
  renderPosts(posts, "posts-container", role);
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
  selectedCategorySlug = "";
  currentView = "scheduled";
  updateActiveNav();

  const posts = await fetchData(`/scheduled?page=${currentPage}&limit=${limit}`);
  renderPosts(posts, "posts-container", role);
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
  selectedCategorySlug = slug;

  try {
    const posts = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(
        activeTags
      )}`
    );
    renderPosts(posts, "posts-container", role);
  } catch (err) {
    console.log("Failed to load the posts:", err.message);
  }
}

/**
 * Advances to the next page of posts.
 * Updates the current page number and reloads posts.
 */
function nextPage() {
  currentPage++;
  document.getElementById("page-number").textContent = `Page ${currentPage}`;
  document.getElementById("prev-page").style.visibility = "visible";
  loadPosts();
}

/**
 * Returns to the previous page of posts.
 * Updates the current page number and reloads posts, hiding the previous button on page 1.
 */
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    document.getElementById("next-page").style.visibility = "visible";
    loadPosts();
  }
  if (currentPage === 1) {
    document.getElementById("prev-page").style.visibility = "hidden";
  }
  document.getElementById("page-number").textContent = `Page ${currentPage}`;
}

/**
 * Loads and populates the category dropdown menu.
 * Fetches categories from the /categories endpoint and sets up event listeners for selection.
 */
async function loadCategories() {
  const dropdown = document.getElementById("category-dropdown");
  const categories = await fetchData("/categories");

  categories.forEach((cat) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "dropdown-item";
    a.href = "#";
    a.textContent = cat.name;
    a.dataset.value = cat.slug;
    a.onclick = () => {
      dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
        item.classList.remove("active")
      );
      a.classList.add("active");
      document.getElementById("category-dropdown-button").textContent = cat.name;
      currentPage = 1;
      document.getElementById("prev-page").style.visibility = "hidden";
      loadPostsByCategory(cat.slug, cat.name);
    };
    li.appendChild(a);
    dropdown.appendChild(li);
  });
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
 * Loads the appropriate posts based on the current view or category.
 */
function loadPosts() {
  if (currentView === "drafts") loadDrafts();
  else if (currentView === "scheduled") loadScheduledPosts();
  else {
    const selected = document.getElementById("category-dropdown").querySelector(
      ".dropdown-item.active"
    )?.dataset.value;
    const selectedName =
      document.getElementById("category-dropdown").querySelector(".dropdown-item.active")
        ?.textContent || "All Categories";
    document.getElementById("category-dropdown-button").textContent = selectedName;
    selectedCategoryName = selectedName;
    selectedCategorySlug = selected || "";
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
 * Performs a search if a term is provided, otherwise reloads posts.
 */
async function onSearch() {
  const term = document.getElementById("search-box").value.trim();
  if (term) {
    currentPage = 1;
    document.getElementById("search-box").value = "";
    document.getElementById("tag-filter").style.display = "none";
    document.getElementById("category-filter").style.display = "none";
    const dropdown = document.getElementById("category-dropdown");
    dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
      item.classList.remove("active")
    );
    dropdown.querySelector("[data-value='']").classList.add("active");
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    selectedCategorySlug = "";
    currentView = "published";
    updateActiveNav();
    try {
      const posts = await fetchData(
        `/search?q=${encodeURIComponent(term)}&page=${currentPage}&limit=${limit}`
      );
      renderPosts(posts, "posts-container", role);
    } catch (err) {
      console.error("Search failed:", err.message);
      showToast("Search failed. Please try again.", "danger");
      document.getElementById("posts-container").innerHTML =
        "<h4>Search failed. Please try again.</h4>";
    }
  } else {
    loadPosts();
  }
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

  loadCategories();
  loadTags();
  loadPublishedPosts();

  const searchBox = document.getElementById("search-box");
  searchBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch();
    }
  });

  document.getElementById("all-categories").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    selectedCategorySlug = "";
    currentPage = 1;
    document.getElementById("prev-page").style.visibility = "hidden";
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
    document.getElementById("prev-page").style.visibility = "hidden";
    document.getElementById("category-dropdown-button").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    selectedCategorySlug = "";
    loadPublishedPosts();
  });
  document.getElementById("nav-drafts").addEventListener("click", (e) => {
    e.preventDefault();
    currentPage = 1;
    document.getElementById("prev-page").style.visibility = "hidden";
    loadDrafts();
  });
  document.getElementById("nav-scheduled").addEventListener("click", (e) => {
    e.preventDefault();
    currentPage = 1;
    document.getElementById("prev-page").style.visibility = "hidden";
    loadScheduledPosts();
  });
  document.getElementById("nav-create").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("/create", "_self");
  });
  document.getElementById("nav-logout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

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

// Export functions if needed by other modules
export { publishNow, schedulePost, saveAsDraft, deletePost };