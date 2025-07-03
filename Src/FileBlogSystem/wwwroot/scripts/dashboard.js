import { fetchData, getTagFilterParam, renderPosts, showToast } from "./utils.js";

let currentPage = 1;
const limit = 3;
let activeTags = new Set();
let currentView = "published";
let role = null;
let selectedCategoryName = "All Categories";

async function loadTags() {
  const tags = await fetchData("/tags");
  const container = document.getElementById("tag-checkboxes");

  tags.forEach((tag) => {
    const label = document.createElement("label");
    label.className = "form-check-label";
    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.value = tag.slug;
    input.id = `tag-${tag.slug}`;

    input.onchange = () => {
      if (input.checked) activeTags.add(tag.slug);
      else activeTags.delete(tag.slug);
      currentPage = 1;
      document.getElementById("prev-page").style.visibility = "hidden";
      loadPosts();
    };

    label.appendChild(input);
    label.append(` ${tag.name}`);
    container.appendChild(label);
  });
}

async function loadPublishedPosts() {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  currentView = "published";
  updateActiveNav();

  const posts = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`
  );
  renderPosts(posts, "posts-container", role);
}

async function loadDrafts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  currentView = "drafts";
  updateActiveNav();

  const posts = await fetchData(`/drafts?page=${currentPage}&limit=${limit}`);
  renderPosts(posts, "posts-container", role);
}

async function loadScheduledPosts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  currentView = "scheduled";
  updateActiveNav();

  const posts = await fetchData(`/scheduled?page=${currentPage}&limit=${limit}`);
  renderPosts(posts, "posts-container", role);
}

async function loadPostsByCategory(slug, name) {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "none";
  currentView = "published";
  updateActiveNav();
  document.getElementById("nav-categories").textContent = name;
  selectedCategoryName = name;

  try {
    const posts = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(
        activeTags
      )}`
    );
    renderPosts(posts, "posts-container", role);
  } catch (err) {
    console.log("Failed to load the posts:", err.message);
  }
}

function nextPage() {
  currentPage++;
  document.getElementById("prev-page").style.visibility = "visible";
  loadPosts();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadPosts();
  }
  if (currentPage === 1) {
    document.getElementById("prev-page").style.visibility = "hidden";
  }
}

async function loadCategories() {
  const dropdown = document.getElementById("category-dropdown");
  const categories = await fetchData("/categories");

  categories.forEach((cat) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "dropdown-item";
    a.href = "#";
    a.textContent = cat.name;
    a.dataset.value = cat.slug;
    a.onclick = () => {
      dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
        item.classList.remove("active")
      );
      a.classList.add("active");
      currentPage = 1;
      document.getElementById("prev-page").style.visibility = "hidden";
      loadPostsByCategory(cat.slug, cat.name);
    };
    li.appendChild(a);
    dropdown.appendChild(li);
  });
}

function updateActiveNav() {
  const navItems = document.querySelectorAll(".navbar-nav .nav-link");
  navItems.forEach((item) => item.classList.remove("active"));
  document.getElementById("nav-home").classList.remove("active");

  if (currentView === "drafts") document.getElementById("nav-drafts").classList.add("active");
  else if (currentView === "scheduled")
    document.getElementById("nav-scheduled").classList.add("active");
  else if (currentView === "create") document.getElementById("nav-create").classList.add("active");
  else document.getElementById("nav-home").classList.add("active");
}

function loadPosts() {
  if (currentView === "drafts") loadDrafts();
  else if (currentView === "scheduled") loadScheduledPosts();
  else {
    const selected = document.getElementById("category-dropdown").querySelector(
      ".dropdown-item.active"
    )?.dataset.value;
    const selectedName =
      document.getElementById("category-dropdown").querySelector(".dropdown-item.active")
        ?.textContent || "All Categories";
    document.getElementById("nav-categories").textContent = selectedName;
    selectedCategoryName = selectedName;
    if (selected) loadPostsByCategory(selected, selectedName);
    else loadPublishedPosts();
  }
}

async function deletePost(slug, title) {
  if (confirm(`Are you sure you want to delete: ${title}`)) {
    await fetch(`/posts/${slug}/delete`, { method: "POST", credentials: "include" });
    showToast("🗑️ Deleted Post Successfully", "success");
    loadPosts();
  }
}

async function publishNow(slug) {
  await fetch(`/posts/${slug}/publish`, { method: "POST", credentials: "include" });
  showToast("✅ Published", "success");
  loadPosts();
}

async function schedulePost(slug, time) {
  await fetch(`/posts/${slug}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: time }),
    credentials: "include",
  });
  showToast("📅 Scheduled", "success");
  loadPosts();
}

async function saveAsDraft(slug) {
  await fetch(`/posts/${slug}/draft`, { method: "POST", credentials: "include" });
  showToast("💾 Saved as Draft", "success");
  loadPosts();
}

function refresh() {
  window.location.reload();
}

async function onSearch() {
  const term = document.getElementById("search-box").value.trim();
  if (term) {
    currentPage = 1;
    document.getElementById("search-box").value = "";
    document.getElementById("tag-filter").style.display = "none";
    const dropdown = document.getElementById("category-dropdown");
    dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
      item.classList.remove("active")
    );
    dropdown.querySelector("[data-value='']").classList.add("active");
    document.getElementById("nav-categories").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    currentView = "published";
    updateActiveNav();
    try {
      const posts = await fetchData(
        `/search?q=${encodeURIComponent(term)}&page=${currentPage}&limit=${limit}`
      );
      renderPosts(posts, "posts-container", role);
    } catch (err) {
      console.error("Search failed:", err.message);
      showToast("Search failed. Please try again.", "danger");
      document.getElementById("posts-container").innerHTML =
        "<h4>Search failed. Please try again.</h4>";
    }
  } else {
    loadPosts();
  }
}

async function logout() {
  await fetch("/logout", { method: "POST" });
  showToast("Logged out", "success");
  location.href = "/login";
}

function getUserRoleFromCookie() {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith("user-role="));
  return value ? decodeURIComponent(value.split("=")[1]) : null;
}

window.onload = () => {
  role = getUserRoleFromCookie();
  if (!role) window.open("/login", "_self");
  if (role === "editor") {
    document.getElementById("nav-create").style.display = "none";
    document.getElementById("nav-add-dropdown").style.display = "none";
  } else if (role !== "admin") {
    document.getElementById("nav-add-dropdown").style.display = "none";
  }

  loadCategories();
  loadTags();
  loadPublishedPosts();

  const searchBox = document.getElementById("search-box");
  searchBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch();
    }
  });

  document.getElementById("nav-drafts").onclick = () => {
    currentPage = 1;
    document.getElementById("prev-page").style.visibility = "hidden";
    loadDrafts();
  };
  document.getElementById("nav-scheduled").onclick = () => {
    currentPage = 1;
    document.getElementById("prev-page").style.visibility = "hidden";
    loadScheduledPosts();
  };
  document.getElementById("nav-home").onclick = () => {
    currentPage = 1;
    document.getElementById("prev-page").style.visibility = "hidden";
    loadPublishedPosts();
  };
};