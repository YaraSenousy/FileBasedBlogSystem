// Import utility functions for fetching data and displaying toasts
import { fetchData, showToast } from "./utils.js";

// Placeholder profile picture (base64-encoded SVG)
const placeholderProfilePic = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1MCA3NUM3NSAxNTAgMCA3NSA3NSAwIDE1MCA3NSBaIiBmaWxsPSIjN0M4N0E4Ii8+PHBhdGggZD0iTTExMi41IDc1QzExMi41IDEwMC4zMjMgOTguODIzIDExOS41IDc1IDExOUM1MS4xNzcgMTE5LjUgMzcuNSA5OS45NjggMzcuNSA3NUMzNy41IDUwLjAzMiA1MS4xNzcgMzAuNSA3NSA0NS41QzEwMC4zMjMgMzAuNSA4OC41IDUwLjAzMiAxMTIuNSA3NVoiIGZpbGw9IiM1OTY0ODAiLz48L3N2Zz4=";

/**
 * Fetches and displays the user's profile data
 */
async function loadProfile() {
  try {
    const user = await fetchData("/user-profile");
    if (!user) {
      showToast("Failed to load profile", "danger");
      return;
    }
    document.getElementById("profile-name").textContent = user.name;
    document.getElementById("profile-username").textContent = `@${user.username}`;
    document.getElementById("profile-email").textContent = user.email || "No email provided";
    document.getElementById("profile-description").textContent = user.description || "No description provided";
    document.getElementById("profile-role").textContent = user.role;
    document.getElementById("profile-pic").src = user.profilePicture || placeholderProfilePic;
    document.getElementById("profile-name-input").value = user.name;
    document.getElementById("profile-email-input").value = user.email || "";
    document.getElementById("profile-description-input").value = user.description || "";
  } catch (err) {
    console.error("Failed to load profile:", err.message, err);
    showToast("Failed to load profile", "danger");
  }
}

/**
 * Shows the edit profile form
 */
function showEditProfileForm() {
  const editForm = document.getElementById("edit-profile-form");
  const profileCard = document.getElementById("profile-card");
  if (!editForm || !profileCard) {
    console.error("Profile form or card element not found");
    showToast("Profile elements missing", "danger");
    return;
  }
  editForm.classList.remove("d-none");
  profileCard.classList.add("d-none");
}

/**
 * Hides the edit profile form and shows the profile card
 */
function hideEditProfileForm() {
  const editForm = document.getElementById("edit-profile-form");
  const profileCard = document.getElementById("profile-card");
  editForm.classList.add("d-none");
  profileCard.classList.remove("d-none");
}

/**
 * Handles profile form submission
 */
async function handleProfileSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById("profile-name-input");
  const emailInput = document.getElementById("profile-email-input");
  const descriptionInput = document.getElementById("profile-description-input");
  const profilePicInput = document.getElementById("profile-pic-input");

  if (!nameInput.value.trim()) {
    showToast("Name is required", "danger");
    return;
  }
  if (emailInput.value && !/[^@]+@[^@]+\.[^@]+/.test(emailInput.value)) {
    showToast("Invalid email format", "danger");
    return;
  }

  const formData = new FormData();
  formData.append("name", nameInput.value.trim());
  formData.append("email", emailInput.value);
  formData.append("description", descriptionInput.value.trim());
  if (profilePicInput.files.length > 0) {
    formData.append("profilePic", profilePicInput.files[0]);
  }

  try {
    const res = await fetch("/profile/edit", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (res.ok) {
      showToast("Profile updated successfully", "success");
      hideEditProfileForm();
      await loadProfile();
    } else {
      const error = await res.text();
      showToast(`Failed to update profile: ${error}`, "danger");
    }
  } catch (err) {
    showToast(`Failed to update profile: ${err.message}`, "danger");
  }
}

/**
 * Logs out the user and redirects to the login page.
 */
async function logout() {
  try {
    await fetch("/logout", { method: "POST" });
    showToast("Logged out", "success");
    localStorage.removeItem("userInfo");
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
 * Initializes the page, sets up event listeners, and loads profile.
 */
window.onload = async () => {
  // Load user info from localStorage
  const { name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}");
  if (!role) {
    window.open("/login", "_self");
    return;
  }

  // Set user greeting in offcanvas
  document.getElementById("accountOffcanvasLabel").textContent = `Hello, ${name.split(" ")[0]}`;

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

  // Load profile
  await loadProfile();

  // Event listeners
  const editButton = document.getElementById("edit-profile-btn");
  const cancelButton = document.getElementById("cancel-edit-btn");
  const profileForm = document.getElementById("profile-form");
  const logoutButton = document.getElementById("account-logout");
  if (editButton) editButton.addEventListener("click", showEditProfileForm);
  if (cancelButton) cancelButton.addEventListener("click", hideEditProfileForm);
  if (profileForm) profileForm.addEventListener("submit", handleProfileSubmit);
  if (logoutButton) logoutButton.addEventListener("click", logout);

  // Theme toggle
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

  // Initialize theme
  const savedTheme = localStorage.getItem("theme");
  const theme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (savedTheme) {
    updateThemeToggleIcon(savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    updateThemeToggleIcon("dark");
  }
};