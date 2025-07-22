import { fetchData, showToast, renderPagination, updatePendingRequestsCount  } from "./utils.js";

let currentPage = 1;
const limit = 3;
let totalPages = 1;
let selectedStatus = "Pending";
let searchTerm = "";
let role = null;

/**
 * Fetches the current user's role.
 * @returns {Promise<Object>} The user data.
 */
async function fetchUserData() {
  try {
    const user = await fetchData("/auth/me");
    return user;
  } catch (err) {
    console.error("Failed to fetch user data:", err.message);
    return { role: null };
  }
}

/**
 * Updates the active navigation state for the requests page.
 */
function updateActiveNav() {
  document
    .querySelectorAll(".nav-link")
    .forEach((item) => item.classList.remove("active"));
  document.querySelector("a[href='/requests']").classList.add("active");
}

/**
 * Updates the theme toggle icon based on the current theme.
 * @param {string} theme - The current theme ("dark" or "light").
 */
function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle")?.querySelector("i");
  if (icon) {
    icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
}

/**
 * Renders join requests for the specified container and status.
 * @param {Object[]} requests - Array of request objects.
 * @param {string} containerId - ID of the container to render requests into.
 */
function renderRequests(requests, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!requests || requests.length === 0) {
    container.innerHTML = "<h4>No requests available</h4>";
    return;
  }

  requests.forEach((request) => {
    const requestEl = document.createElement("div");
    requestEl.className = "request-card mb-3 p-3 border rounded";
    requestEl.innerHTML = `
      <div class="row">
        <div class="col-md-8">
          <h5>${request.name}</h5>
          <p><strong>Email:</strong> ${request.email}</p>
          <p><strong>Submitted:</strong> ${new Date(
            request.creationDate
          ).toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZoneName: "short",
          })}</p>
        </div>
        <div class="col-md-4 text-end">
          <a href="/requests/${
            request.id
          }" id="view-request-btn" class="btn btn-outline-primary btn-sm">View Request</a>
        </div>
      </div>
    `;
    container.appendChild(requestEl);
  });
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

/**
 * Loads requests based on the selected status and search term.
 */
async function loadRequests() {
  try {
    const endpoint = searchTerm
      ? `/all-requests?status=${selectedStatus}&q=${encodeURIComponent(
          searchTerm
        )}&page=${currentPage}&limit=${limit}`
      : `/all-requests?status=${selectedStatus}&page=${currentPage}&limit=${limit}`;
    const response = await fetchData(endpoint, true);
    totalPages = Math.ceil(response.totalItems / limit) || 1;
    renderRequests(response.data, `${selectedStatus.toLowerCase()}-requests`);
    renderPagination(
      currentPage,
      totalPages,
      loadRequests,
      new Set(),
      "",
      () => {
        currentPage = 1;
        loadRequests();
      },
      `${selectedStatus.toLowerCase()}-pagination`
    );
  } catch (err) {
    console.error("Failed to load requests:", err.message);
    document.getElementById(
      `${selectedStatus.toLowerCase()}-requests`
    ).innerHTML = "<h4>Failed to load requests</h4>";
    showToast("Failed to load requests", "danger");
  }
}

/**
 * Handles search functionality.
 */
async function onSearch() {
  searchTerm = document.getElementById("search-box").value.trim();
  currentPage = 1;
  await loadRequests();
}

/**
 * Clears the search term and reloads requests.
 */
function clearSearch() {
  document.getElementById("search-box").value = "";
  searchTerm = "";
  currentPage = 1;
  loadRequests();
}

/**
 * Initializes the requests page.
 */
document.addEventListener("DOMContentLoaded", async () => {
  var name;
  ({ name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}"));
  if (!role) {
    window.open("/login", "_self");
    return;
  }

  // Redirect non-admins to home
  if (role !== "admin") {
    window.location.href = "/";
    return;
  }

  updateActiveNav();
  await updatePendingRequestsCount();
  await loadRequests();
  
  // Set Pending tab as active
  document.getElementById("pending-tab").click();

  document.getElementById("search-box").addEventListener("keydown", (event) => {
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

  document.getElementById("pending-tab").addEventListener("click", () => {
    selectedStatus = "Pending";
    currentPage = 1;
    loadRequests();
  });

  document.getElementById("approved-tab").addEventListener("click", () => {
    selectedStatus = "Approved";
    currentPage = 1;
    loadRequests();
  });

  document.getElementById("denied-tab").addEventListener("click", () => {
    selectedStatus = "Denied";
    currentPage = 1;
    loadRequests();
  });

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      updateThemeToggleIcon(newTheme);
    });
  }

  const savedTheme = localStorage.getItem("theme");
  const theme =
    savedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (savedTheme) {
    updateThemeToggleIcon(savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    updateThemeToggleIcon("dark");
  }
});
