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
* Handles the login form submission.
* Prevents default form submission, sends credentials to /login, and redirects on success.
*/
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.querySelector("input[name='username']").value;
  const password = document.querySelector("input[name='password']").value;
  const csrfToken = document.querySelector("input[name='_csrf']").value;
  const toast = document.getElementById("live-toast");
  const toastMsg = document.getElementById("toast-message");
  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken
      },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
          localStorage.setItem('userInfo', JSON.stringify({
              name: data.name,
              role: data.role,
              daysUntilExpiration: data.daysUntilExpiration
          }));
          if (data.daysUntilExpiration <= 7) {
              const toast = document.getElementById("live-toast");
              const toastMsg = document.getElementById("toast-message");
              toastMsg.innerHTML = `Your passphrase ${data.daysUntilExpiration <= 0 ? 'has expired' : 'will expire soon'}. Please <a href="/profile" class="text-white"><u>update it now</u></a>.`;
              toast.className = "toast align-items-center text-bg-warning border-0";
              new bootstrap.Toast(toast).show();
              window.location.href = "/profile";
          } else 
            window.location.href = "/dashboard";
      } else {
          toastMsg.textContent = data.message || "Invalid credentials";
          toast.className = "toast align-items-center text-bg-danger border-0";
          new bootstrap.Toast(toast).show();
      }
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
fetchCsrfToken();