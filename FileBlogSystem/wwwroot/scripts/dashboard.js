let currentPage = 1;
const limit = 3;
let activeTags = new Set();
let currentView = "pubished";
let role = null;

async function loadTags() {
  const res = await fetch("/tags");
  const tags = await res.json();
  const container = document.getElementById("tag-checkboxes");
  currentPage = 1;

  tags.forEach((tag) => {
    const label = document.createElement("label");
    label.className = "form-check-label";
    const input = document.createElement("input");

    input.className = "form-check-input";
    input.type = "checkbox";
    input.value = tag.slug;
    input.onchange = () => {
      input.checked ? activeTags.add(tag.slug) : activeTags.delete(tag.slug);
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
  const res = await fetch(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam()}`
  );
  const posts = await res.json();
  renderPosts(posts);
}

async function loadDrafts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("category-dropdown").selectedIndex = 0;

  currentView = "drafts";

  const res = await fetch(`/drafts?page=${currentPage}&limit=${limit}`, {
    credentials: "include",
  });
  const posts = await res.json();
  renderPosts(posts);
}

async function loadScheduledPosts() {
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("search-part").style.display = "none";
  document.getElementById("tag-filter").style.display = "none";
  document.getElementById("category-dropdown").selectedIndex = 0;

  currentView = "scheduled";

  const res = await fetch(`/scheduled?page=${currentPage}&limit=${limit}`, {
    credentials: "include",
  });
  const posts = await res.json();
  renderPosts(posts);
}

async function loadPostsByCategory() {
  document.getElementById("tag-filter").style.display = "block";
  document.getElementById("search-part").style.display = "none";

  currentView = "published";

  const slug = document.getElementById("category-dropdown").value;
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
      const option = document.createElement("option");
      option.value = cat.slug;
      option.textContent = cat.name;
      dropdown.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load categories:", err.message);
  }
}

function loadPosts() {
  if (currentView === "drafts") {
    loadDrafts();
  } else if (currentView === "scheduled") {
    loadScheduledPosts();
  } else {
    const selected = document.getElementById("category-dropdown").value;
    if (selected) {
      loadPostsByCategory();
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

    const preview = (post.htmlContent || "").slice(0, 20) + "...";
    postEl.innerHTML = `
            <h2>${post.title}</h2>
            <div class="post-meta">
            Published: ${new Date(post.published).toLocaleDateString()}
            ${
              post.modified != "0001-01-01T00:00:00"
                ? "Modified:" + new Date(post.modified).toLocaleDateString()
                : ""
            }
            </div>
            <div class="post-description"><span>Description: </span>${
              post.description
            }</div>
            <div class="post-preview">${preview}</div>
            <div class="post-details">
            <a href="/post?slug=${post.slug}&preview=${
      post.status != "published"
    }">Continue Reading</a>
            </div>
            <div class="post-categories"><strong>Categories:</strong> ${cats}</div>
            <div class="post-tags"><strong>Tags:</strong> ${tags}</div>
        `;
    if (role != null) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-primary btn-sm m-1";
      editBtn.textContent = "Edit Post";
      editBtn.onclick = () => {
        open(`/create?slug=${post.slug}`, "_self");
      };
      postEl.appendChild(editBtn);

      if (role == "admin") {
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

      const scheduleBtn = document.createElement("button");
      scheduleBtn.className = "btn btn-outline-secondary btn-sm mx-2";
      scheduleBtn.textContent = "Schedule";
      scheduleBtn.onclick = () => {
        const time = document.getElementById(`schedule-${post.slug}`).value;
        if (!time) return showToast("Please choose a time","danger");
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
    showToast("🗑️ Deleted Post Successfully","success");
    loadPosts();
  }
}

async function publishNow(slug) {
  await fetch(`/posts/${slug}/publish`, {
    method: "POST",
    credentials: "include",
  });
  showToast("✅ Published","success");
  loadPosts();
}

async function schedulePost(slug, time) {
  await fetch(`/posts/${slug}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: time }),
    credentials: "include",
  });
  showToast("📅 Scheduled","success");
  loadPosts();
}

async function saveAsDraft(slug) {
  await fetch(`/posts/${slug}/draft`, {
    method: "POST",
    credentials: "include",
  });
  showToast("💾 Saved as Draft","success");
  loadPosts();
}

function refresh() {
  window.location.reload();
}

function onSearch() {
  const term = document.getElementById("search-box").value.trim();
  if (term) {
    currentPage = 1;
    document.getElementById("search-box").value = "";
    document.getElementById("tag-filter").style.display = "none";
    loadSearchResults(term);
  } else {
    loadPosts();
  }
}

async function loadSearchResults(query) {
  const res = await fetch(
    `/search?q=${encodeURIComponent(query)}&page=${currentPage}&limit=${limit}`
  );
  const posts = await res.json();
  renderPosts(posts);
}

async function logout() {
  await fetch("/logout", { method: "POST" });
  showToast("Logged out","success");
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
    document.getElementById("create").style.display = "none";
  }

  loadCategories();
  loadTags();
  loadPosts();
};
