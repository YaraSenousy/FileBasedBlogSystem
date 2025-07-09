/**
 * Handles the login form submission.
 * Prevents default form submission, sends credentials to /login, and redirects on success.
 */
document.getElementById("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const res = await fetch("/login", { method: "POST", body: form });
    window.location.href = "/dashboard";
  } catch (error) {
    document.getElementById("login-error").textContent = "Invalid credentials";
  }
};