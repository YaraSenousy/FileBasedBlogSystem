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
    const preview = (post.htmlContent || "").slice(0, 20) + "...";
    postEl.innerHTML = `
      <div class="row">
        <div class="col-md-7">
          <h2>${post.title}</h2>
          <div class="post-meta">
            Published: ${new Date(post.published).toLocaleDateString()}
            ${post.modified != "0001-01-01T00:00:00Z"? "Modified:" + new Date(post.modified).toLocaleDateString() : ""}
          </div>
          <div class="post-description"><span>Description: </span>${
            post.description
          }</div>
          <div class="post-preview">${preview}</div>
          <div class="post-details">
            <a href="/post?slug=${post.slug}">Continue Reading</a>
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
