import { fetchData, getTagFilterParam, renderPosts, showToast } from "./utils.js";

let currentPage = 1;
const limit = 5;
let activeTags = new Set();
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
  const dropdown = document.getElementById("category-dropdown");
  dropdown.querySelectorAll(".dropdown-item").forEach((item) =>
    item.classList.remove("active")
  );
  dropdown.querySelector("[data-value='']").classList.add("active");
  document.getElementById("nav-categories").textContent = "All Categories";
  selectedCategoryName = "All Categories";
  updateActiveNav();

  const posts = await fetchData(
    `/published?page=${currentPage}&limit=${limit}${getTagFilterParam(activeTags)}`
  );
  renderPosts(posts, "posts-container");
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
      document.getElementById("nav-categories").textContent = cat.name;
      selectedCategoryName = cat.name;
      loadPostsByCategory(cat.slug);
    };
    li.appendChild(a);
    dropdown.appendChild(li);
  });
}

function updateActiveNav() {
  document.getElementById("nav-home").classList.add("active");
}

function loadPosts() {
  document.getElementById("tag-filter").style.display = "block";
  const dropdown = document.getElementById("category-dropdown");
  const selected = dropdown.querySelector(".dropdown-item.active")?.dataset.value;
  const selectedName =
    dropdown.querySelector(".dropdown-item.active")?.textContent || "All Categories";
  document.getElementById("nav-categories").textContent = selectedName;
  selectedCategoryName = selectedName;

  if (selected) loadPostsByCategory(selected);
  else loadPublishedPosts();
}

async function loadPostsByCategory(slug) {
  try {
    const posts = await fetchData(
      `/categories/${slug}?page=${currentPage}&limit=${limit}${getTagFilterParam(
        activeTags
      )}`
    );
    renderPosts(posts, "posts-container");
  } catch (err) {
    console.error("Failed to load posts:", err.message);
    document.getElementById("posts-container").innerHTML = "<h4>Failed to load posts</h4>";
  }
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
    updateActiveNav();
    try {
      const posts = await fetchData(
        `/search?q=${encodeURIComponent(term)}&page=${currentPage}&limit=${limit}`
      );
      renderPosts(posts, "posts-container");
    } catch (err) {
      console.error("Search failed:", err.message);
      document.getElementById("posts-container").innerHTML =
        "<h4>Search failed. Please try again.</h4>";
      document.getElementById("next-page").style.visibility = "hidden";
    }
  } else {
    loadPosts();
  }
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