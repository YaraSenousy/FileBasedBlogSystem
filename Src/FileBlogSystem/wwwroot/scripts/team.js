// Import utility functions for fetching data and displaying toasts
import { fetchData, showToast } from "./utils.js";

// Placeholder profile picture (base64-encoded SVG)
const placeholderProfilePic = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1MCA3NUM3NSAxNTAgMCA3NSA3NSAwIDE1MCA3NSBaIiBmaWxsPSIjN0M4N0E4Ii8+PHBhdGggZD0iTTExMi41IDc1QzExMi41IDEwMC4zMjMgOTguODIzIDExOS41IDc1IDExOUM1MS4xNzcgMTE5LjUgMzcuNSA5OS45NjggMzcuNSA3NUMzNy41IDUwLjAzMiA1MS4xNzcgMzAuNSA3NSA0NS41QzEwMC4zMjMgMzAuNSA4OC41IDUwLjAzMiAxMTIuNSA3NVoiIGZpbGw9IiM1OTY0ODAiLz48L3N2Zz4=";

/**
 * Renders team members to the gallery
 * @param {Array} users - Array of user objects
 */
function renderTeam(users) {
  const gallery = document.getElementById("team-gallery");

  gallery.innerHTML = "";
  if (users.length === 0) {
    gallery.innerHTML = '<p class="text-center text-muted">No team members found</p>';
    return;
  }

  users.forEach(user => {
    const card = document.createElement("div");
    card.className = "col";
    card.innerHTML = `
      <div class="team-card">
        <img class="team-pic" src="${user.profilePicture || placeholderProfilePic}" alt="${user.name}'s profile picture">
        <h3 class="team-name">${user.name}</h3>
        <p class="team-username">@${user.username}</p>
        <p class="team-description">${user.description || "No description provided"}</p>
        <a class="team-link" href="/profile/${user.username}">View Profile</a>
      </div>
    `;
    gallery.appendChild(card);
  });
}

/**
 * Fetches and displays team members
 */
async function loadTeam(attempt = 1, maxAttempts = 3) {
  const gallery = document.getElementById("team-gallery");

  try {
    const users = await fetchData("/admin/users");
    if (!users || !Array.isArray(users)) {
      showToast("Failed to load team members", "danger");
      return;
    }

    // Sort users alphabetically by name
    const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));
    renderTeam(sortedUsers);
  } catch (err) {
    console.error("Failed to load team members:", err.message, err);
    showToast("Failed to load team members", "danger");
  }
}

/**
 * Filters team members based on search input
 */
function setupSearch() {
  const searchInput = document.getElementById("team-search");

  let usersCache = [];
  fetchData("/admin/users")
    .then(users => {
      if (users && Array.isArray(users)) {
        usersCache = users.sort((a, b) => a.name.localeCompare(b.name));
        renderTeam(usersCache);
      }
    })
    .catch(err => {
      console.error("Failed to load team members for search:", err.message, err);
      showToast("Failed to load team members", "danger");
    });

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      renderTeam(usersCache);
      return;
    }

    const filteredUsers = usersCache.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
    renderTeam(filteredUsers);
  });
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
 * Initializes the page and loads team members.
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded, initializing team page");

  // Load team members and setup search
  await loadTeam();
  setupSearch();

  // Theme toggle
  const themeToggle = document.getElementById("theme-toggle");
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      updateThemeToggleIcon(newTheme);
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
});