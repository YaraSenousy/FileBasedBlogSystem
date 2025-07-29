import { fetchData, showToast, updatePendingRequestsCount, theme } from "./utils.js";

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
 * Updates the active navigation state for the request page.
 */
function updateActiveNav() {
  document
    .querySelectorAll(".nav-link")
    .forEach((item) => item.classList.remove("active"));
  document.querySelector("a[href='/requests']").classList.add("active");
}

/**
 * Loads and renders a single request's details.
 */
async function loadRequest() {
  const requestId = window.location.pathname.split("/").pop();
  try {
    const request = await fetchData(`/all-requests/${requestId}`);
    const container = document.getElementById("request-details");
    if (!container) return;

    container.innerHTML = `
      <h5>${request.name}</h5>
      <p><strong>Email:</strong> ${request.email}</p>
      <p><strong>Description:</strong> ${request.description}</p>
      <p><strong>Why Join:</strong> ${request.whyJoin}</p>
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
      <p><strong>Status:</strong> ${request.status}</p>
      ${
        request.reviewedBy
          ? `<p><strong>Reviewed By:</strong> ${request.reviewedBy}</p>`
          : ""
      }
      ${
        request.picturePath
          ? `<p><strong>Picture:</strong> <img src="/content/${request.picturePath}" alt="Profile Picture" class="img-fluid" style="max-width: 200px;"></p>`
          : ""
      }
      ${
        request.cvPath
          ? `<p><strong>CV:</strong> <a href="/content/${request.cvPath}" target="_blank">Download CV</a></p>`
          : ""
      }
    `;

    const actionsContainer = document.getElementById("request-actions");
    if (request.status === "Pending") {
      actionsContainer.innerHTML = `
        <button class="btn btn-success btn-sm me-2" id="approve-btn">Approve</button>
        <button class="btn btn-danger btn-sm" id="deny-btn">Deny</button>
        <div id="request-spinner" class="spinner-border text-primary ms-2" role="status" style="display: none; width: 1.5rem; height: 1.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div> 
      `;
    }
  } catch (err) {
    console.error("Failed to load request:", err.message);
    document.getElementById("request-details").innerHTML =
      "<h4>Failed to load request</h4>";
    showToast("Failed to load request", "danger");
  }
}

/**
 * Approves a request and redirects to /requests.
 */
async function approveRequest() {
  const requestId = window.location.pathname.split("/").pop();
  const spinner = document.getElementById("request-spinner");
  try {
    spinner.style.display = "inline-block";
    const response = await fetch(
      `https://letsblog.switzerlandnorth.cloudapp.azure.com/all-requests/${requestId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (response.ok) {
      showToast("Request approved and user created.", "success");
      window.location.href = "/requests";
    } else {
       response.text().then(message => {
        showToast(message, "danger");
        spinner.style.display = "none";
      });
    }
  } catch (err) {
    spinner.style.display = "none";
    console.error("Failed to approve request:", err.message);
    showToast("Failed to approve request.", "danger");
  } finally {
    spinner.style.display = "none";
  }
}

/**
 * Denies a request and redirects to /requests.
 */
async function denyRequest() {
  const requestId = window.location.pathname.split("/").pop();
  try {
    const spinner = document.getElementById("request-spinner");
    spinner.style.display = "inline-block";
    const response = await fetch(
      `https://letsblog.switzerlandnorth.cloudapp.azure.com/all-requests/${requestId}/deny`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (response.ok) {
      showToast("Request denied.", "success");
      window.location.href = "/requests";
    } else {
      showToast("Failed to deny request.", "danger");
    }
  } catch (err) {
    console.error("Failed to deny request:", err.message);
    showToast("Failed to deny request.", "danger");
  } finally {
    spinner.style.display = "none";
  }
}

/**
 * Initializes the request page.
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
  await loadRequest();

  const approveBtn = document.getElementById("approve-btn");
  if (approveBtn) {
    approveBtn.addEventListener("click", approveRequest);
  }

  const denyBtn = document.getElementById("deny-btn");
  if (denyBtn) {
    denyBtn.addEventListener("click", denyRequest);
  }
  //initialize theme
  theme();
});
