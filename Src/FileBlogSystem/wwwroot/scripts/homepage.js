let currentPage = 1;
const limit = 5;
let activeTags = new Set();
let selectedCategoryName = "All Categories";

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
    input.value = tag.slug;
    input.id = `tag-${tag.slug}`;
    
    input.onchange = () => {
      input.checked ? activeTags.add(tag.slug) : activeTags.delete(tag.slug);
      currentPage = 1;
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
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  updateActiveNav();

  const res = await fetch(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam()}`
  );
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
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "dropdown-item";
      a.href = "#";
      a.textContent = cat.name;
      a.dataset.value = cat.slug;
      a.onclick = () => {
        dropdown.querySelectorAll(".dropdown-item").forEach(item => item.classList.remove("active"));
        a.classList.add("active");
        document.getElementById("nav-categories").textContent = cat.name;
        selectedCategoryName = cat.name;
        loadPostsByCategory(cat.slug);
      };
      li.appendChild(a);
      dropdown.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load categories:", err.message);
  }
}

function updateActiveNav() {
  document.getElementById("nav-home").classList.add("active");
}

function loadPosts() {
  document.getElementById("tag-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  const selected = dropdown.querySelector(".dropdown-item.active")?.dataset.value;
  const selectedName = dropdown.querySelector(".dropdown-item.active")?.textContent || "All Categories";
  document.getElementById("nav-categories").textContent = selectedName;
  selectedCategoryName = selectedName;

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
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const posts = await res.json();
    renderPosts(posts);
  } catch (err) {
    console.error("Failed to load posts:", err.message);
    document.getElementById("posts-container").innerHTML = "<h4>Failed to load posts</h4>";
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
    const cats = (post.categories || []).map((c) => `<span>${c}</span>`).join("");

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
            Published: ${new Date(post.published).toLocaleString('en-GB', {
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
                ? `Modified: ${new Date(post.modified).toLocaleString('en-GB', {
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
            <a href="/post?slug=${post.slug}">View The Full Post</a>
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

    container.appendChild(postEl);
  });

  document.getElementById("page-number").textContent = `Page ${currentPage}`;
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
    updateActiveNav();
    try {
      await loadSearchResults(term);
    } catch (err) {
      console.error("Search failed:", err.message);
      document.getElementById("posts-container").innerHTML = "<h4>Search failed. Please try again.</h4>";
      document.getElementById("next-page").style.visibility = "hidden";
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

window.onload = () => {
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
};