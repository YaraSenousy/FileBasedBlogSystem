import { showToast, theme } from "./utils.js";

/**
 * Updates the active navigation state for the join page.
 * Highlights the "Join Us" link as active.
 */
function updateActiveNav() {
  const navItems = document.querySelectorAll(".nav-link");
  navItems.forEach(item => item.classList.remove("active"));
  const joinNav = document.querySelector("a[href='/join']");
  if (joinNav) joinNav.classList.add("active");
}

/**
 * Handles the newsletter subscription form.
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
            `/subscribe?email=${encodeURIComponent(email)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );
          if (response.ok) {
            showToast("Successfully subscribed! Check your email for confirmation.", "success");
            newsletterForm.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById("subscribeModal"));
            modal.hide();
          } else if (response.status === 400) {
            showToast("Subscription failed. Invalid email", "danger");
          } else if (response.status === 409) {
            showToast("You have already subscribed to the newsletter", "danger");
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
        document.getElementById("_csrf").value = data.token;
    } catch (error) {
        const toast = document.getElementById("live-toast");
        const toastMsg = document.getElementById("toast-message");
        toastMsg.textContent = "Error fetching CSRF token: " + error.message;
        toast.className = "toast align-items-center text-bg-danger border-0";
        new bootstrap.Toast(toast).show();
    }
}

/**
 * Initializes the join page by setting up the form submission handler and other event listeners.
 */
document.addEventListener("DOMContentLoaded", () => {
  updateActiveNav();
  newsletter();

  const joinForm = document.getElementById("join-form");
  if (joinForm) {
    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const spinner = document.getElementById("join-spinner");
      spinner.style.display = "inline-block";

      const formData = new FormData();
      formData.append("name", document.getElementById("name").value);
      formData.append("email", document.getElementById("email").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("password", document.getElementById("password").value);
      formData.append("whyJoin", document.getElementById("why-join").value);
      const picture = document.getElementById("picture").files[0];
      if (picture) formData.append("picture", picture);
      const cv = document.getElementById("cv").files[0];
      if (cv) formData.append("cv", cv);
      const csrfToken = document.querySelector("input[name='_csrf']").value;

      try {
        const response = await fetch("/join", {
          headers: {
            "X-CSRF-TOKEN": csrfToken
          },
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          showToast("Application submitted! Check your email for confirmation.", "success");
          joinForm.reset();
        } else if (response.status === 400) {
          response.text().then((message) => {
            showToast(message, "danger");
            spinner.style.display = "none";
          });
        } else if (response.status === 409) {
          showToast("Email already used.", "danger");
          spinner.style.display = "none";
        } else {
          showToast("Failed to submit application.", "danger");
          spinner.style.display = "none";
        }
      } catch (error) {
        console.error("Error submitting application:", error);
        showToast("An error occurred. Please try again later.", "danger");
      } finally {
        spinner.style.display = "none";
      }
    });
  }

  const navBlogs = document.getElementById("nav-blogs");
  if (navBlogs) {
    navBlogs.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/blogs";
    });
  }
  theme();
  fetchCsrfToken();
});