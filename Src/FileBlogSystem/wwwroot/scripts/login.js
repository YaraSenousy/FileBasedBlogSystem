/**
 * Initialize theme based on localStorage or system preference
 */
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");
  const theme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeToggleIcon(theme);
}

/**
* Updates the theme toggle button icon based on the current theme
* @param {string} theme - Current theme ('light' or 'dark')
*/
function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

/**
* Toggles between light and dark theme
*/
document.getElementById("theme-toggle").addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeToggleIcon(newTheme);
});

/**
* Handles the login form submission.
* Prevents default form submission, sends credentials to /login, and redirects on success.
*/
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const toast = document.getElementById("live-toast");
  const toastMsg = document.getElementById("toast-message");
  try {
      const res = await fetch("/login", {
          method: "POST",
          body: form,
          credentials: "include"
      });
      if (res.ok) {
          window.location.href = "/dashboard";
      } else {
          toastMsg.textContent = "Invalid credentials";
          toast.className = "toast align-items-center text-bg-danger border-0";
          new bootstrap.Toast(toast).show();
      }
  } catch (error) {
      toastMsg.textContent = "Error during login: " + error.message;
      toast.className = "toast align-items-center text-bg-danger border-0";
      new bootstrap.Toast(toast).show();
  }
});

// Initialize theme on page load
initializeTheme();