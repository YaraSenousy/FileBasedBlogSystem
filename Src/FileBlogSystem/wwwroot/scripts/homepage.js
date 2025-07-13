import { fetchData } from "./utils.js";

function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

async function loadFeaturedPosts() {
  const response = await fetchData(`/published?page=1&limit=5`, true);
  const posts = response.data;
  const conveyor = document.getElementById("featured-posts");

  // Duplicate posts for seamless looping
  const allPosts = [...posts, ...posts];

  allPosts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "post-card";
    const thumbnail = (post.mediaUrls || []).filter((url) =>
      /\.(png|jpe?g|webp|gif)$/i.test(url)
    )[0];
    card.innerHTML = `
<img src="${
      `${thumbnail}?width=300&height=200&mode=pad` || "/images/default.jpg"
    }" alt="${post.title}">
<h5>${post.title}</h5>
<p>${post.description.substring(0, 100)}...</p>
<a href="/post?slug=${post.slug}" class="btn btn-primary">Read More</a>
`;
    conveyor.appendChild(card);
  });

  // Adjust animation duration based on number of posts
  const totalWidth = allPosts.length * 320; // 300px width + 20px margin
  conveyor.style.animationDuration = `${totalWidth / 20}s`; // Speed: pixels per second
}

/**
 * Initializes the homepage by loading categories, tags, and published posts,
 * and sets up event listeners for search and navigation.
 */
window.onload = () => {
  loadFeaturedPosts();
  document.getElementById("nav-home").classList.add("active");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
  });

  const savedTheme = localStorage.getItem("theme");
  const theme =
    savedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  document.documentElement.setAttribute("data-theme", theme);
  if (savedTheme) {
    updateThemeToggleIcon(savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    updateThemeToggleIcon("dark");
  }
};
