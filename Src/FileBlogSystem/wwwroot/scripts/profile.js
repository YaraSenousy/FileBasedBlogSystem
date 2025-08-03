// Import utility functions for fetching data and displaying toasts
import { fetchData, showToast, updatePendingRequestsCount, theme, handleLogout } from "./utils.js";

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
 * Fetches CSRF token from /api/csrf-token and sets it in the form
 */
async function fetchCsrfToken() {
    try {
        const response = await fetch("/api/csrf-token", {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) {
            throw new Error("Failed to fetch CSRF token");
        }
        const data = await response.json();
        document.querySelector("#profile-form input[name='_csrf']").value = data.token;
        document.querySelector("#passphrase-form input[name='_csrf']").value = data.token;
    } catch (error) {
        const toast = document.getElementById("live-toast");
        const toastMsg = document.getElementById("toast-message");
        toastMsg.textContent = "Error fetching CSRF token: " + error.message;
        toast.className = "toast align-items-center text-bg-danger border-0";
        new bootstrap.Toast(toast).show();
    }
}

/**
 * Handles profile form submission
 */
async function handleProfileSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById("profile-name-input");
  const emailInput = document.getElementById("profile-email-input");
  const passwordInput = document.getElementById("profile-password-input");
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
  if (passwordInput.value) {
    const response = await fetch("/check-password", {
      method: "POST",
      headers: { 
          "Content-Type": "application/json", 
          "X-CSRF-TOKEN": document.querySelector("#profile-form input[name='_csrf']").value 
      },
      body: JSON.stringify({ password: passwordInput.value }),
      credentials: "include"
    });
    if (response.status === 409) {
      showToast("New passphrase must be different from the current one", "danger");
      return;
    }
    if (!response.ok) {
      const error = await response.text();
      showToast(`Invalid passphrase: ${error}`, "danger");
      return;
    }
  }

  const formData = new FormData();
  formData.append("name", nameInput.value.trim());
  formData.append("email", emailInput.value);
  formData.append("password", passwordInput.value);
  formData.append("description", descriptionInput.value.trim());
  if (profilePicInput.files.length > 0) {
    formData.append("profilePic", profilePicInput.files[0]);
  }

  try {
    const res = await fetch("/profile/edit", {
      method: "POST",
      headers: { 
        "X-CSRF-TOKEN": document.querySelector("#profile-form input[name='_csrf']").value
      },
      body: formData,
      credentials: "include"
    });
    if (res.ok) {
      showToast("Profile updated successfully", "success");
      hideEditProfileForm();
      await loadProfile();
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (passwordInput.value) {
        userInfo.daysUntilExpiration = 30;
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
      }
    } else {
      const error = await res.text();
      showToast(`Failed to update profile: ${error}`, "danger");
    }
  } catch (err) {
    showToast(`Failed to update profile: ${err.message}`, "danger");
  }
}

async function handlePassphraseSubmit(e) {
  e.preventDefault();
  const passwordInput = document.getElementById("new-passphrase");
  const response = await fetch("/check-password", {
      method: "POST",
      headers: { 
          "Content-Type": "application/json", 
          "X-CSRF-TOKEN": document.querySelector("#passphrase-form input[name='_csrf']").value 
      },
      body: JSON.stringify({ password: passwordInput.value }),
      credentials: "include"
  });
  if (response.status === 409) {
      showToast("New passphrase must be different from the current one", "danger");
      return;
  }
  if (!response.ok) {
      const error = await response.text();
      showToast(`Invalid passphrase: ${error}`, "danger");
      return;
  }

  const formData = new FormData();
  formData.append("password", passwordInput.value);
  formData.append("_csrf", document.querySelector("#passphrase-form input[name='_csrf']").value);

  try {
      const res = await fetch("/profile/edit", {
          method: "POST",
          body: formData,
          credentials: "include"
      });
      if (res.ok) {
          showToast("Passphrase updated successfully", "success");
          bootstrap.Modal.getInstance(document.getElementById("passphraseModal")).hide();
          const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
          userInfo.daysUntilExpiration = 30;
          localStorage.setItem("userInfo", JSON.stringify(userInfo));
          await loadProfile();
      } else {
          const error = await res.text();
          showToast(`Failed to update passphrase: ${error}`, "danger");
      }
  } catch (err) {
      showToast(`Failed to update passphrase: ${err.message}`, "danger");
  }
}

/**
 * Initializes the page, sets up event listeners, and loads profile.
 */
window.onload = async () => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  if (!userInfo.role) {
    window.open("/login", "_self");
    return;
  }

  await updatePendingRequestsCount();

  if (userInfo.role !== "admin") {
    const adminFunctions = document.getElementsByClassName("admin-functions");
    for (const element of adminFunctions) {
      element.style.display = "none";
    }
  }

  if (userInfo.role === "author") {
    document.getElementById("nav-scheduled").innerText = "My Scheduled Posts";
    document.getElementById("nav-drafts").innerText = "My Drafts";
  }

  // Load profile
  await loadProfile();

  if (userInfo.daysUntilExpiration <= 7) {
    const modal = new bootstrap.Modal(document.getElementById("passphraseModal"));
    document.getElementById("passphrase-message").innerHTML = 
        `Your passphrase ${userInfo.daysUntilExpiration <= 0 ? 'has expired' : 'will expire soon'}. Please enter a new passphrase.`;
    modal.show();
  }

  const editButton = document.getElementById("edit-profile-btn");
  const cancelButton = document.getElementById("cancel-edit-btn");
  const profileForm = document.getElementById("profile-form");
  const passphraseForm = document.getElementById("passphrase-form");
  if (editButton) editButton.addEventListener("click", showEditProfileForm);
  if (cancelButton) cancelButton.addEventListener("click", hideEditProfileForm);
  if (profileForm) profileForm.addEventListener("submit", handleProfileSubmit);
  if (passphraseForm) passphraseForm.addEventListener("submit", handlePassphraseSubmit);

  // Initialize theme
  theme();
  fetchCsrfToken();
  handleLogout();
};