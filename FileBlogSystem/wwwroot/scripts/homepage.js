let currentPage = 1;
const limit = 5;
let activeTags = new Set();

async function loadTags() {
  const res = await fetch("/tags");
  const tags = await res.json();
  const container = document.getElementById("tag-checkboxes");
  currentPage = 1;

  tags.forEach((tag) => {
    const label = document.createElement("label");
    const input = document.createElement("input");

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
  const res = await fetch(
    `/?page=${currentPage}&limit=${limit}${getTagFilterParam()}`
  );
  const posts = await res.json();
  renderPosts(posts);
}

async function loadDrafts() {
  document.getElementById("tag-filter").style.display = "none";
  const res = await fetch(`/drafts?page=${currentPage}&limit=${limit}`,{credentials: "include"});
  const posts = await res.json();
  renderPosts(posts);
}

async function loadScheduledPosts() {
  document.getElementById("tag-filter").style.display = "none";
  const res = await fetch(`/scheduled?page=${currentPage}&limit=${limit}`,{credentials: "include"});
  const posts = await res.json();
  renderPosts(posts);
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
  document.getElementById("tag-filter").style.display = "block";
  const selected = document.getElementById("category-dropdown").value;
  if (selected) {
    loadPostsByCategory(selected);
  } else {
    loadPublishedPosts();
  }
}

async function loadPostsByCategory(slug) {
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

    postEl.innerHTML = `
        <h2>${post.title}</h2>
        <div class="post-meta">
          Published: ${new Date(post.published).toLocaleDateString()}
          ${post.modified != "0001-01-01T00:00:00"? "Modified:" + new Date(post.modified).toLocaleDateString() : ""}
        </div>
        <div class="post-description"><span>Description: </span>${
          post.description
        }</div>
        <div class="post-categories"><strong>Categories:</strong> ${cats}</div>
        <div class="post-tags"><strong>Tags:</strong> ${tags}</div>
        <div class="post-details">
          <a href="/post.html?slug=${post.slug}">Continue Reading</a>
        </div>
      `;
    
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit Post";
    editBtn.onclick = () => {open(`/create.html?slug=${post.slug}`,"_self")};
    postEl.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete Post";
    deleteBtn.onclick = () => deletePost(post.slug, post.title);
    postEl.appendChild(deleteBtn);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    if (status === "draft" || status === "scheduled") {
      const publishBtn = document.createElement("button");
      publishBtn.textContent = "Publish Now";
      publishBtn.onclick = () => publishNow(post.slug);
      actions.appendChild(publishBtn);

      const scheduleInput = document.createElement("input");
      scheduleInput.type = "datetime-local";
      scheduleInput.id = `schedule-${post.slug}`;

      const scheduleBtn = document.createElement("button");
      scheduleBtn.textContent = "Schedule";
      scheduleBtn.onclick = () => {
        const time = document.getElementById(`schedule-${post.slug}`).value;
        if (!time) return alert("Please choose a time");
        schedulePost(post.slug, time);
      };

      actions.appendChild(scheduleInput);
      actions.appendChild(scheduleBtn);
    }

    if (status === "scheduled" || status === "published") {
      const draftBtn = document.createElement("button");
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
    await fetch(`/posts/${slug}/delete`, { method: "POST", credentials: "include"});
    alert("🗑️ Deleted Post Successfully");
    loadPosts();
  }
}

async function publishNow(slug) {
  await fetch(`/posts/${slug}/publish`, { method: "POST", credentials: "include"});
  alert("✅ Published");
  loadPosts();
}

async function schedulePost(slug, time) {
  await fetch(`/posts/${slug}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: time }),
    credentials: "include"
  });
  alert("📅 Scheduled");
  loadPosts();
}

async function saveAsDraft(slug) {
  await fetch(`/posts/${slug}/draft`, { method: "POST", credentials: "include"});
  alert("💾 Saved as Draft");
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

window.onload = () => {
  loadCategories();
  loadTags();
  loadPosts();
};
