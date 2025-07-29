import { fetchData, renderPosts, showToast, getBookmarks, theme } from "./utils.js";

/**
 * Manages the current search term for the saved blogs page.
 * @type {string} searchTerm - The current search term for frontend filtering.
 */
let searchTerm = "";
let allPosts = []; // Store all fetched posts for frontend search

/**
 * Loads and renders bookmarked posts, filtered by search term if provided.
 */
async function loadBookmarkedPosts() {
  try {
    const bookmarks = getBookmarks();
    if (bookmarks.length === 0) {
      document.getElementById("posts-container").innerHTML = "<h4>No bookmarked posts</h4><p><i>Start bookmarking posts to see them here!</i></p>";
      allPosts = [];
      return;
    }

    allPosts = [];
    for (const slug of bookmarks) {
      try {
        const post = await fetchData(`/posts/${slug}`);
        allPosts.push(post);
      } catch (err) {
        console.warn(`Failed to fetch post with slug ${slug}:`, err.message);
      }
    }

    let filteredPosts = allPosts;
    if (searchTerm) {
      filteredPosts = allPosts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Render filtered posts
    if (filteredPosts.length === 0 && searchTerm) {
      document.getElementById("posts-container").innerHTML = "<h4>No matching bookmarked posts</h4>";
    } else {
      renderPosts(filteredPosts, "posts-container", null, null);
    }
  } catch (err) {
    console.error("Failed to load bookmarked posts:", err.message);
    document.getElementById("posts-container").innerHTML = "<h4>Failed to load bookmarked posts</h4>";
    showToast("Failed to load bookmarked posts", "danger");
  }
}

/**
 * Updates the active navigation state for the saved blogs page.
 * Highlights the "Saved Blogs" link as active.
 */
function updateActiveNav() {
  const navItems = document.querySelectorAll(".nav-link");
  navItems.forEach(item => item.classList.remove("active"));
  const savedNav = document.querySelector("a[href='/saved']");
  if (savedNav) savedNav.classList.add("active");
}

/**
 * Handles the frontend search functionality for bookmarked posts.
 */
function onSearch() {
  const term = document.getElementById("search-box").value.trim();
  searchTerm = term;
  loadBookmarkedPosts();
}

/**
 * Clears the search term and resets to the default bookmarked posts view.
 */
function clearSearch() {
  document.getElementById("search-box").value = "";
  searchTerm = "";
  loadBookmarkedPosts();
}

/**
 * Opens and handles the subscribing form.
 */
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
            `/subscribe?email=${encodeURIComponent(email)}`,
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('subscribeModal'));
            modal.hide();
          } else if (response.status === 400) {
            showToast("Subscription failed. Invalid email", "danger");
          } else if (response.status === 409) {
            showToast("Subscription failed. Email already used", "danger");
          } else {
            showToast("Subscription failed.", "danger");
          }
        } catch (error) {
          console.error("Error subscribing:", error);
          showToast("An error occurred. Please try again later.", "danger");
        } finally {
          spinner.style.display = "none";
        }
      }
    });
  }
}

/**
 * Initializes the saved blogs page by loading bookmarked posts and setting up event listeners.
 */
document.addEventListener("DOMContentLoaded", async () => {
  updateActiveNav();
  await loadBookmarkedPosts();
  newsletter();

  const searchBox = document.getElementById("search-box");
  if (searchBox) {
    searchBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSearch();
      }
    });
  }

  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      onSearch();
    });
  }

  const clearSearchBtn = document.getElementById("clear-search-btn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearSearch();
    });
  }

  const navBlogs = document.getElementById("nav-blogs");
  if (navBlogs) {
    navBlogs.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/blogs";
    });
  }

  //initialize theme
  theme();
});

export { loadBookmarkedPosts};