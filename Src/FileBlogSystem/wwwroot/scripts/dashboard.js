let currentPage = 1;
const limit = 3;
let activeTags = new Set();
let currentView = "published";
let role = null;
let selectedCategoryName = "All Categories";

async function loadTags() {
  const res = await fetch("/tags");
  const tags = await res.json();
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
      input.checked ? activeTags.add(tag.slug) : activeTags.delete(tag.slug);
      currentPage = 1;
      document.getElementById("prev-page").style.visibility = "hidden";
      loadPosts();
    };

    label.appendChild(input);
    label.append(` ${tag.name}`);
    container.appendChild(label);
  });
}

function getTagFilterParam() {
  return activeTags.size > 0 ? `&tags=${[...activeTags].join(",")}` : "";
}

async function loadPublishedPosts() {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";

  currentView = "published";
  updateActiveNav();

  const res = await fetch(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam()}`
  );
  const posts = await res.json();
  renderPosts(posts);
}

async function loadDrafts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";

  currentView = "drafts";
  updateActiveNav();

  const res = await fetch(`/drafts?page=${currentPage}&limit=${limit}`, {
    credentials: "include",
  });
  const posts = await res.json();
  renderPosts(posts);
}

async function loadScheduledPosts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";

  currentView = "scheduled";
  updateActiveNav();

  const res = await fetch(`/scheduled?page=${currentPage}&limit=${limit}`, {
    credentials: "include",
  });
  const posts = await res.json();
  renderPosts(posts);
}

async function loadPostsByCategory(slug, name) {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "none";

  currentView = "published";
  updateActiveNav();

  document.getElementById("nav-categories").textContent = name;
  selectedCategoryName = name;

  try {
    const res = await fetch(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam()}`
    );
    const posts = await res.json();
    renderPosts(posts);
  } catch (err) {
    console.log("Failed to load the posts: " + err.message);
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
  if (currentPage == 1) {
    document.getElementById("prev-page").style.visibility = "hidden";
  }
}

async function loadCategories() {
  const dropdown = document.getElementById("category-dropdown");

  try {
    const res = await fetch("/categories");
    const categories = await res.json();

    categories.forEach((cat) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "dropdown-item";
      a.href = "#";
      a.textContent = cat.name;
      a.dataset.value = cat.slug;
      a.onclick = () => {
        dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
        a.classList.add("active");
        currentPage = 1;
        document.getElementById("prev-page").style.visibility = "hidden";
        loadPostsByCategory(cat.slug, cat.name);
      };
      li.appendChild(a);
      dropdown.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load categories:", err.message);
  }
}

function updateActiveNav() {
  const navItems = document.querySelectorAll(".navbar-nav .nav-link");
  navItems.forEach(item => item.classList.remove("active"));
  document.getElementById("nav-home").classList.remove("active");

  if (currentView === "drafts") {
    document.getElementById("nav-drafts").classList.add("active");
  } else if (currentView === "scheduled") {
    document.getElementById("nav-scheduled").classList.add("active");
  } else if (currentView === "create") {
    document.getElementById("nav-create").classList.add("active");
  } else {
    document.getElementById("nav-home").classList.add("active");
  }
}

function loadPosts() {
  if (currentView === "drafts") {
    loadDrafts();
  } else if (currentView === "scheduled") {
    loadScheduledPosts();
  } else {
    const selected = document.getElementById("category-dropdown").querySelector(".dropdown-item.active")?.dataset.value;
    const selectedName = document.getElementById("category-dropdown").querySelector(".dropdown-item.active")?.textContent || "All Categories";
    document.getElementById("nav-categories").textContent = selectedName;
    selectedCategoryName = selectedName;
    if (selected) {
      loadPostsByCategory(selected, selectedName);
    } else {
      loadPublishedPosts();
    }
  }
}

function renderPosts(posts) {
  document.getElementById("next-page").style.visibility = "visible";
  const container = document.getElementById("posts-container");
  container.innerHTML = "";

  if (posts.length <= 0) {
    container.innerHTML = "<h4>No results</h4>";
    document.getElementById("next-page").style.visibility = "hidden";
  }

  posts.forEach((post) => {
    const postEl = document.createElement("article");

    const tags = (post.tags || []).map((t) => `<span>${t}</span>`).join("");
    const cats = (post.categories || [])
      .map((c) => `<span>${c}</span>`)
      .join("");

    const status = post.status?.toLowerCase() || "published";

    const images = (post.mediaUrls || []).filter((url) =>
      /\.(png|jpe?g|webp|gif)$/i.test(url)
    );
    const thumbnail = images.length > 0
      ? `
        <div id="carousel-${post.slug}" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner">
            ${images
              .map(
                (url, i) => `
              <div class="carousel-item ${i === 0 ? "active" : ""}">
                <img src="${url}?width=300&height=300&mode=pad" class="d-block w-100 carousel-img img-fluid" alt="Post image" loading="lazy">
              </div>
            `
              )
              .join("")}
          </div>
          ${
            images.length > 1
              ? `
            <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${post.slug}" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carousel-${post.slug}" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Next</span>
            </button>
          `
              : ""
          }
        </div>
      `
      : "";

    const preview = (post.htmlContent || "").slice(0, 20);
    postEl.innerHTML = `
      <div class="row">
        <div class="col-md-7">
          <h2>${post.title}</h2>
          <div class="post-meta">
            ${currentView === "drafts" ? "" : currentView + ": " + new Date(post.published).toLocaleString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })} <br>
            ${
              post.modified !== "0001-01-01T00:00:00"
                ? `modified: ${new Date(post.modified).toLocaleString('en-GB', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                  `
                : ""
            }
          </div>
          <div class="post-description"><span>Description: </span><p>${post.description}</p></div>
          <div class="post-preview"><p>${preview}</p></div>
          <div class="post-details">
            <a href="/post?slug=${post.slug}&preview=${post.status !== "published"}">View The Full Post</a>
          </div>
          <div class="post-categories"><strong>Categories:</strong> ${cats}</div>
          <div class="post-tags"><strong>Tags:</strong> ${tags}</div>
        </div>
        ${
          images.length > 0
            ? `<div class="col-md-5">${thumbnail}</div>`
            : ""
        }
      </div>
    `;

    if (role != null) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-primary btn-sm m-1";
      editBtn.textContent = "Edit Post";
      editBtn.onclick = () => {
        open(`/create?slug=${post.slug}`, "_self");
      };
      postEl.appendChild(editBtn);

      if (role === "admin") {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger btn-sm m-1";
        deleteBtn.textContent = "Delete Post";
        deleteBtn.onclick = () => deletePost(post.slug, post.title);
        postEl.appendChild(deleteBtn);
      }
    }

    const actions = document.createElement("div");
    actions.className = "post-actions";

    if (status === "draft" || status === "scheduled") {
      const publishBtn = document.createElement("button");
      publishBtn.textContent = "Publish Now";
      publishBtn.className = "btn btn-outline-secondary btn-sm ms-1";
      publishBtn.onclick = () => publishNow(post.slug);
      actions.appendChild(publishBtn);

      const scheduleInput = document.createElement("input");
      scheduleInput.type = "datetime-local";
      scheduleInput.id = `schedule-${post.slug}`;
      scheduleInput.className = "ms-2";

      const scheduleLabel = document.createElement("label");
      scheduleLabel.htmlFor = `schedule-${post.slug}`;
      scheduleLabel.textContent = "Schedule for: ";
      actions.appendChild(scheduleLabel);
      actions.appendChild(scheduleInput);

      const scheduleBtn = document.createElement("button");
      scheduleBtn.className = "btn btn-outline-secondary btn-sm mx-2";
      scheduleBtn.textContent = "Schedule";
      scheduleBtn.onclick = () => {
        const time = document.getElementById(`schedule-${post.slug}`).value;
        if (!time) return showToast("Please choose a time", "danger");
        schedulePost(post.slug, time);
      };

      actions.appendChild(scheduleInput);
      actions.appendChild(scheduleBtn);
    }

    if (status === "scheduled" || status === "published") {
      const draftBtn = document.createElement("button");
      draftBtn.className = "btn btn-outline-secondary btn-sm ms-1";
      draftBtn.textContent = "Save as Draft";
      draftBtn.onclick = () => saveAsDraft(post.slug);
      actions.appendChild(draftBtn);
    }

    postEl.appendChild(actions);
    container.appendChild(postEl);
  });

  document.getElementById("page-number").textContent = `Page ${currentPage}`;
}

async function deletePost(slug, title) {
  if (confirm(`Are you sure you want to delete: ${title}`)) {
    await fetch(`/posts/${slug}/delete`, {
      method: "POST",
      credentials: "include",
    });
    showToast("🗑️ Deleted Post Successfully", "success");
    loadPosts();
  }
}

async function publishNow(slug) {
  await fetch(`/posts/${slug}/publish`, {
    method: "POST",
    credentials: "include",
  });
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
  await fetch(`/posts/${slug}/draft`, {
    method: "POST",
    credentials: "include",
  });
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
    dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
    dropdown.querySelector("[data-value='']").classList.add("active");
    document.getElementById("nav-categories").textContent = "All Categories";
    selectedCategoryName = "All Categories";
    currentView = "published";
    updateActiveNav();
    try {
      await loadSearchResults(term);
    } catch (err) {
      console.error("Search failed:", err.message);
      showToast("Search failed. Please try again.", "danger");
      document.getElementById("posts-container").innerHTML = "<h4>Search failed. Please try again.</h4>";
    }
  } else {
    loadPosts();
  }
}

async function loadSearchResults(query) {
  const res = await fetch(
    `/search?q=${encodeURIComponent(query)}&page=${currentPage}&limit=${limit}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const posts = await res.json();
  renderPosts(posts);
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

function showToast(message, variant = "primary") {
  const toastEl = document.getElementById("live-toast");
  const toastMsg = document.getElementById("toast-message");

  toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
  toastMsg.textContent = message;

  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

window.onload = () => {
  role = getUserRoleFromCookie();
  if (role == null) {
    open("/login", "_self");
  }
  if (role == "editor") {
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