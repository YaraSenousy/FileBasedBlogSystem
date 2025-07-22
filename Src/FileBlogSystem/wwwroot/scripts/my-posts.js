// Import utility functions for fetching data and displaying toasts
import { fetchData, showToast, updatePendingRequestsCount } from "./utils.js";

// Global state for managing posts, user role, search term, and current tab
let allUserPosts = []; // Stores all user posts fetched from /user-posts
let role = null; // User's role (admin, author, editor)
let name = null; // User's name for ownership checks
let searchTerm = ""; // Current search term for filtering posts
let currentTab = "all"; // Current tab (all, published, drafts, scheduled)

/**
 * Updates the search bar title based on the current tab.
 */
function updateSearchTitle() {
  const searchLabel = document.querySelector("#search-part strong");
  switch (currentTab) {
    case "published":
      searchLabel.textContent = "Search My Published Posts:";
      break;
    case "drafts":
      searchLabel.textContent = "Search My Drafts:";
      break;
    case "scheduled":
      searchLabel.textContent = "Search My Scheduled Posts:";
      break;
    default:
      searchLabel.textContent = "Search My Posts:";
  }
}

/**
 * Renders a list of posts in the specified container with permission-based actions.
 * @param {Array} posts - Array of post objects to render.
 * @param {string} containerId - ID of the container element to render posts into.
 * @param {string|null} role - User's role (admin, author, editor).
 * @param {string|null} name - User's name for ownership checks.
 */
function renderPosts(posts, containerId, role, name) {
  const container = document.getElementById(containerId);
  // Display message if no posts are available
  container.innerHTML = posts.length === 0
    ? "<h4>No posts found.</h4>"
    : posts.map(post => {
      // Filter images from mediaUrls
      const images = (post.mediaUrls || []).filter(url => /\.(png|jpe?g|webp|gif)$/i.test(url));
      // Create thumbnail carousel if images exist
      const thumbnail = images.length > 0
        ? `
          <div id="carousel-${post.slug}" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-inner">
              ${images.map((url, i) => `
                <div class="carousel-item ${i === 0 ? "active" : ""}">
                  <img src="${url}?width=200&height=150&mode=pad" class="d-block w-100 carousel-img img-fluid" alt="${post.title}" loading="lazy">
                </div>
              `).join("")}
            </div>
            ${images.length > 1 ? `
              <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${post.slug}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#carousel-${post.slug}" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
              </button>
            ` : ""}
          </div>
        `
        : "";
      // Log warning if scheduled post lacks scheduled date
      if (post.status === "scheduled" && !post.scheduled) {
        console.warn(`Scheduled post "${post.title}" missing scheduled date`);
      }
      return `
        <article class="post card mb-3">
          <div class="card-body d-flex">
            ${images.length > 0 ? `<div class="post-thumbnail me-3">${thumbnail}</div>` : ""}
            <div class="post-content flex-grow-1">
              <h2>${post.title}</h2>
              <p class="post-status text-${post.status === "published" ? "success" : post.status === "scheduled" ? "primary" : "secondary"}">
                ${post.status === "published" && post.published
                  ? `Published: ${new Date(post.published).toLocaleString()}`
                  : post.status === "scheduled"
                    ? `Scheduled: ${post.published ? new Date(post.published).toLocaleString() : "No Date"}`
                    : "Draft"
                }
              </p>
              <p>${post.description || "No description available."}</p>
              <div class="dropdown">
                <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Actions
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item go-to-post" href="/post/${post.slug}${post.status !== "published"? "?preview=true": ""}"><i class="bi bi-box-arrow-up-right me-1"></i>Go to Post</a></li>
                  ${role === "editor" || (role === "admin" && post.createdBy === name) || (role === "author" && post.createdBy === name)
                    ? post.status !== "published"
                      ? `<li><a class="dropdown-item" href="/create?slug=${post.slug}">Edit</a></li>`
                      : ""
                    : ""
                  }
                  ${role === "admin" || (role === "author" && post.createdBy === name)
                    ? `<li><a class="dropdown-item" href="#" data-action="delete" data-slug="${post.slug}" data-title="${post.title}">Delete</a></li>`
                    : ""
                  }
                  ${(role === "admin" || role === "author") && post.createdBy === name && post.status !== "published"
                    ? `<li><a class="dropdown-item" href="#" data-action="publish" data-slug="${post.slug}">Publish Now</a></li>`
                    : ""
                  }
                  ${(role === "admin" || role === "author") && post.createdBy === name && post.status !== "published"
                    ? `
                      <li>
                        <a class="dropdown-item" href="#" data-action="schedule" data-slug="${post.slug}">Schedule</a>
                        <div class="px-2 schedule-input" data-slug="${post.slug}" style="display: none;">
                          <input type="datetime-local" class="form-control schedule-time" data-slug="${post.slug}">
                        </div>
                      </li>`
                    : ""
                  }
                  ${(role === "admin" || role === "author") && post.createdBy === name && post.status !== "draft"
                    ? `<li><a class="dropdown-item" href="#" data-action="draft" data-slug="${post.slug}">Save as Draft</a></li>`
                    : ""
                  }
                </ul>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
}

/**
 * Fetches all user posts from the /user-posts endpoint and renders them.
 */
async function loadMyPosts() {
  try {
    const response = await fetchData("/user-posts");
    // Ensure response is an array (non-paginated endpoint)
    allUserPosts = Array.isArray(response) ? response : (response.data || []);
    if (!Array.isArray(allUserPosts)) {
      console.error("Invalid response format from /user-posts:", response);
      throw new Error("Response is not an array");
    }
    filterAndRenderPosts();
  } catch (err) {
    console.error("Failed to load my posts:", err.message, err);
    showToast("Failed to load my posts", "danger");
    document.getElementById("all-posts-container").innerHTML =
      "<h4>Failed to load my posts. Please try again.</h4>";
  }
}

/**
 * Filters posts based on search term and current tab, then renders them in appropriate containers.
 */
function filterAndRenderPosts() {
  // Apply search filter if searchTerm exists
  let filteredPosts = searchTerm
    ? allUserPosts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.description && post.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allUserPosts;

  // Render posts in each tab's container based on status and permissions
  const containers = {
    all: document.getElementById("all-posts-container"),
    published: document.getElementById("published-posts-container"),
    drafts: document.getElementById("drafts-posts-container"),
    scheduled: document.getElementById("scheduled-posts-container")
  };
  containers.all.innerHTML = "";
  containers.published.innerHTML = "";
  containers.drafts.innerHTML = "";
  containers.scheduled.innerHTML = "";
  renderPosts(filteredPosts, "all-posts-container", role, name);
  renderPosts(filteredPosts.filter(post => post.status === "published"), "published-posts-container", role, name);
  renderPosts(
    role === "editor" || role === "admin"
      ? filteredPosts.filter(post => post.status === "draft")
      : filteredPosts.filter(post => post.status === "draft" && post.createdBy === name),
    "drafts-posts-container",
    role,
    name
  );
  renderPosts(
    role === "editor" || role === "admin"
      ? filteredPosts.filter(post => post.status === "scheduled")
      : filteredPosts.filter(post => post.status === "scheduled" && post.createdBy === name),
    "scheduled-posts-container",
    role,
    name
  );
}

/**
 * Handles real-time search input and filters posts.
 */
function onSearch() {
  searchTerm = document.getElementById("search-box").value.trim();
  filterAndRenderPosts();
}

/**
 * Clears the search term and re-renders all posts.
 */
function clearSearch() {
  document.getElementById("search-box").value = "";
  searchTerm = "";
  filterAndRenderPosts();
}

/**
 * Shows a confirmation modal for deleting a post.
 * @param {string} slug - The post's slug.
 * @param {string} title - The post's title for confirmation.
 */
let pendingDelete = { slug: "", title: "" };
async function deletePost(slug, title) {
  pendingDelete.slug = slug;
  pendingDelete.title = title;
  document.querySelector("#deletePostModal .modal-body").textContent = `Are you sure you want to delete "${title}"?`;
  const modal = new bootstrap.Modal(document.getElementById("deletePostModal"));
  modal.show();
}

/**
 * Initializes the delete confirmation button's event listener.
 */
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
        const modal = bootstrap.Modal.getInstance(document.getElementById("deletePostModal"));
        modal.hide();
        allUserPosts = allUserPosts.filter(post => post.slug !== slug);
        filterAndRenderPosts();
      } else {
        const error = await res.text();
        showToast(`❌ Failed to delete post: ${error}`, "danger");
        modal.hide();
      }
    } catch (err) {
      showToast(`❌ Failed to delete post: ${err.message}`, "danger");
      modal.hide();
    }
  });
}

/**
 * Publishes a post immediately.
 * @param {string} slug - The post's slug.
 */
async function publishNow(slug) {
  try {
    const res = await fetch(`/posts/${slug}/publish`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      showToast("✅ Published", "success");
      await loadMyPosts();
    } else {
      const error = await res.text();
      showToast(`Failed to publish post: ${error}`, "danger");
    }
  } catch (err) {
    showToast(`Failed to publish post: ${err.message}`, "danger");
  }
}

/**
 * Schedules a post for a specific time.
 * @param {string} slug - The post's slug.
 * @param {string} time - The scheduled publication time in ISO format.
 */
async function schedulePost(slug, time) {
  // Ensure the scheduled time is in the future
  const scheduledTime = new Date(time);
  const now = new Date();
  if (scheduledTime <= now) {
    showToast("Scheduled time must be in the future", "danger");
    return;
  }
  try {
    const res = await fetch(`/posts/${slug}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: scheduledTime.toISOString() }),
      credentials: "include",
    });
    if (res.ok) {
      showToast("📅 Scheduled", "success");
      await loadMyPosts();
    } else {
      const error = await res.text();
      showToast(`Failed to schedule post: ${error}`, "danger");
    }
  } catch (err) {
    showToast(`Failed to schedule post: ${err.message}`, "danger");
  }
}

/**
 * Saves a post as a draft.
 * @param {string} slug - The post's slug.
 */
async function saveAsDraft(slug) {
  try {
    const res = await fetch(`/posts/${slug}/draft`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      showToast("💾 Saved as Draft", "success");
      await loadMyPosts();
    } else {
      const error = await res.text();
      showToast(`Failed to save post as draft: ${error}`, "danger");
    }
  } catch (err) {
    showToast(`Failed to save post as draft: ${err.message}`, "danger");
  }
}

/**
 * Logs out the user and redirects to the login page.
 */
async function logout() {
  try {
    await fetch("/logout", { method: "POST" });
    showToast("Logged out", "success");
    location.href = "/login";
  } catch (err) {
    showToast("Failed to log out", "danger");
  }
}

/**
 * Updates the theme toggle icon based on the current theme.
 * @param {string} theme - The current theme ("dark" or "light").
 */
function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

/**
 * Initializes the page, sets up event listeners, and loads posts.
 */
window.onload = async () => {
  // Load user info from localStorage
  ({ name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}"));
  if (!role) {
    window.open("/login", "_self");
    return;
  }

  await updatePendingRequestsCount();

  // Hide create post button for editors
  if (role === "editor") {
    document.getElementById("create-post").style.display = "none";
  }

  // Hide admin functions for non-admins
  if (role !== "admin") {
    const adminFunctions = document.getElementsByClassName("admin-functions");
    for (const element of adminFunctions) {
      element.style.display = "none";
    }
  }

  // Update navigation text for authors
  if (role === "author") {
    document.getElementById("nav-scheduled").innerText = "My Scheduled Posts";
    document.getElementById("nav-drafts").innerText = "My Drafts";
  }

  // Load initial posts
  await loadMyPosts();
  updateSearchTitle();

  // Real-time search input
  document.getElementById("search-box").addEventListener("input", onSearch);
  document.getElementById("clear-search-btn").addEventListener("click", (e) => {
    e.preventDefault();
    clearSearch();
  });

  // Create post navigation
  document.getElementById("create-post").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("/create", "_self");
  });

  // Logout button
  document.getElementById("account-logout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  // Theme toggle
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
  });

  // Tab switching
  document.getElementById("post-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".nav-link");
    if (tab) {
      currentTab = tab.id.replace("-tab", "");
      updateSearchTitle();
      filterAndRenderPosts();
    }
  });

  // Post action handlers
  document.querySelectorAll(".tab-content").forEach(container => {
    container.addEventListener("click", (e) => {
      const actionItem = e.target.closest(".dropdown-item[data-action]");
      if (!actionItem) return;
      e.preventDefault();
      e.stopPropagation(); // Prevent dropdown from closing
      const slug = actionItem.dataset.slug;
      const action = actionItem.dataset.action;
      const postEl = actionItem.closest("article");
      if (action === "delete") {
        deletePost(slug, actionItem.dataset.title);
      } else if (action === "publish") {
        publishNow(slug);
      } else if (action === "schedule") {
        const scheduleInput = postEl.querySelector(`.schedule-input[data-slug="${slug}"]`);
        scheduleInput.style.display = scheduleInput.style.display === "none" ? "block" : "none";
        if (scheduleInput.style.display === "block") {
          const timeInput = scheduleInput.querySelector(`input.schedule-time[data-slug="${slug}"]`);
          timeInput.focus();
          timeInput.addEventListener("change", () => {
            if (timeInput.value) {
              schedulePost(slug, timeInput.value);
              scheduleInput.style.display = "none";
            }
          }, { once: true });
        }
      } else if (action === "draft") {
        saveAsDraft(slug);
      }
    });
  });

  // Initialize theme
  const savedTheme = localStorage.getItem("theme");
  const theme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (savedTheme) {
    updateThemeToggleIcon(savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    updateThemeToggleIcon("dark");
  }

  // Initialize delete button
  deleteButtonInitialise();
};