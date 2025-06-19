document.getElementById("loginForm").onsubmit = async (e) => {
  e.preventDefault();
    const form = new FormData(e.target);
    const res = await fetch("/login", {
      method: "POST",
      body: form
    });
  
    if (!res.ok) {
      document.getElementById("login-error").textContent = "Invalid credentials";
      return;
    }
  
    const data = await res.json();
    alert("Logged in!");
    window.location.href = "/dashboard";
  };
  