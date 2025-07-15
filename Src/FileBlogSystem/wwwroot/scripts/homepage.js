import { fetchData, showToast } from "./utils.js";

function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

async function loadFeaturedPosts() {
  const response = await fetchData(`/published?page=1&limit=5`, true);
  const posts = response.data;
  const conveyor = document.getElementById("featured-posts");

  const allPosts = [...posts, ...posts];

  allPosts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "post-card";
    const images = (post.mediaUrls || []).filter((url) =>
      /\.(png|jpe?g|webp|gif)$/i.test(url)
    );
    const thumbnail =
      images.length > 0
        ? `
        <div id="carousel-${
          post.slug
        }" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000">
          <div class="carousel-inner">
            ${images
              .map(
                (url, i) => `
              <div class="carousel-item ${i === 0 ? "active" : ""}">
                <img src="${url}?width=350&height=200&mode=pad" class="d-block w-100 carousel-img img-fluid" alt="Post image" loading="lazy">
              </div>
            `
              )
              .join("")}
          </div>
          ${
            images.length > 1
              ? `
            <button id="carousel-control-prev" class="carousel-control-prev" type="button" data-bs-target="#carousel-${post.slug}" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Previous</span>
            </button>
            <button id="carousel-control-next" class="carousel-control-next" type="button" data-bs-target="#carousel-${post.slug}" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Next</span>
            </button>
          `
              : ""
          }
        </div>
      `
        : "";
    card.innerHTML = `
      ${thumbnail}
      <h5>${post.title}</h5>
      <p>${post.description.substring(0, 150)}...</p>
      <a href="/post/${
        post.slug
      }" class="btn btn-primary">Read More <i class="fas fa-arrow-right"></i></a>
    `;
    if (images.length === 0) {
      card.classList.add("no-image");
    }    

    conveyor.appendChild(card);
  });

  const carousels = document.querySelectorAll(".carousel");
  carousels.forEach((carousel) => {
    new bootstrap.Carousel(carousel, {
      interval: 4000,
      ride: "carousel",
    });
  });
}

async function newsletter() {
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("newsletter-email").value;
      if (email) {
        const spinner = document.getElementById("newsletter-spinner");
        spinner.style.display = "inline-block"; 
        try {
          const response = await fetch(
            `http://localhost:5188/subscribe?email=${encodeURIComponent(
              email
            )}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (response.ok) {
            showToast("Successfully subscribed! Check your email for confirmation.", "success");
            newsletterForm.reset();
          } else if (response.status == "400"){
            showToast("Subscription failed. Invalid email", "danger");
          } else if (response.status == "409"){
            showToast("Subscription failed. Email already used", "danger");
          }
          else {
            showToast("Subscription failed.", "danger");
          }
        } catch (error) {
          console.error("Error subscribing:", error);
          alert("An error occurred. Please try again later.");
        } finally {
          spinner.style.display = "none";
        }
      }
    });
  }
}

/**
 * Initializes the homepage by loading categories, tags, and published posts,
 * and sets up event listeners for search and navigation.
 */
window.onload = () => {
  loadFeaturedPosts();
  newsletter();
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
