/**
 * Fetches data from the specified endpoint.
 * @param {string} endpoint - The API endpoint to fetch data from.
 * @param {boolean} paginated - Whether the response is paginated.
 * @returns {Promise<{data: any, totalItems: number}|any>} The response data, with totalItems if paginated.
 */
async function fetchData(endpoint, paginated = false) {
  try {
    const response = await fetch(endpoint, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    if (paginated)
      return {
        data: result.data || result,
        totalItems: result.totalItems || result.length || 0,
      };
    else return result;
  } catch (err) {
    console.error(`Failed to fetch from ${endpoint}:`, err.message);
    throw err;
  }
}

/**
 * Generates tag filter parameters for API requests.
 * @param {Set} activeTags - Set of active tag slugs.
 * @returns {string} URL parameter string for tags.
 */
function getTagFilterParam(activeTags) {
  return activeTags.size > 0 ? `&tags=${[...activeTags].join(",")}` : "";
}

/**
 * Toggles a post slug in localStorage for bookmarking (unlogged-in users only).
 * @param {string} slug - The post slug to toggle.
 */
function toggleBookmark(slug) {
  const bookmarks = getBookmarks();
  if (bookmarks.includes(slug)) {
    const updatedBookmarks = bookmarks.filter((s) => s !== slug);
    localStorage.setItem("bookmarkedPosts", JSON.stringify(updatedBookmarks));
    showToast("Post removed from bookmarks", "info");
  } else {
    bookmarks.push(slug);
    localStorage.setItem("bookmarkedPosts", JSON.stringify(bookmarks));
    showToast("Post added to bookmarks", "success");
  }
}

/**
 * Retrieves bookmarked post slugs from localStorage.
 * @returns {string[]} Array of bookmarked post slugs.
 */
function getBookmarks() {
  const bookmarks = localStorage.getItem("bookmarkedPosts");
  return bookmarks ? JSON.parse(bookmarks) : [];
}

/**
 * Checks if a post is bookmarked.
 * @param {string} slug - The post slug to check.
 * @returns {boolean} True if the post is bookmarked, false otherwise.
 */
function isBookmarked(slug) {
  return getBookmarks().includes(slug);
}

/**
 * Renders posts to the specified container.
 * @param {Array} posts - Array of post objects.
 * @param {string} containerId - ID of the container to render posts into.
 * @param {string|null} role - User role for conditional rendering.
 * @param {string|null} name - Username for conditional rendering.
 */
function renderPosts(posts, containerId, role = null, name = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (posts.length <= 0) {
    container.innerHTML = "<h3>No results</h3>";
    return;
  }

  posts.forEach((post) => {
    const postEl = document.createElement("article");
    const tags = (post.tags || [])
      .map((t) => `<span><a href="?tags=${t}">${t}</a></span>`)
      .join("");
    const cats = (post.categories || [])
      .map((c) => `<span><a href="?category=${c}">${c}</a></span>`)
      .join("");
    const status = post.status?.toLowerCase() || "published";
    const images = (post.mediaUrls || []).filter((url) =>
      /\.(png|jpe?g|webp|gif)$/i.test(url)
    );
    const thumbnail =
      images.length > 0
        ? `
        <div id="carousel-${
          post.slug
        }" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner">
            ${images
              .map(
                (url, i) => `
              <div class="carousel-item ${i === 0 ? "active" : ""}">
                <img src="${url}?width=300&height=300&mode=pad" class="d-block w-100 carousel-img img-fluid" alt="Thumbnail image for ${
                  post.title
                }" loading="lazy">
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

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = post.htmlContent || "";

    const imgTags = tempDiv.querySelectorAll("img");
    imgTags.forEach((img) => img.remove());

    const links = tempDiv.querySelectorAll("a");
    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href.match(/\.(jpg|jpeg|png|gif|mp4|mp3|wav|pdf|docx|xlsx|pptx)$/i)) {
        link.remove();
      }
    });

    const preview = tempDiv.textContent.slice(0, 200);

    const dateOptions = {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    };
    const publishedDate = new Date(post.published).toLocaleString(
      "en-GB",
      dateOptions
    );
    const modifiedDate =
      post.modified !== "0001-01-01T00:00:00"
        ? new Date(post.modified).toLocaleString("en-GB", dateOptions)
        : "";

    const shareAndBookmarkHtml =
      role === null && name === null
        ? `
    <div class="gap-2 bookmark-share-container">
      <button class="btn btn-outline-secondary btn-sm bookmark-btn" data-slug="${
        post.slug
      }" title="Bookmark post">
        <i class="bi ${
          isBookmarked(post.slug) ? "bi-bookmark-fill" : "bi-bookmark"
        }"></i>
      </button>
      <button class="btn btn-outline-secondary btn-sm share-btn" data-slug="${
        post.slug
      }" data-title="${post.title}" title="Share post">
        <i class="bi bi-share"></i>
      </button>
    </div>
  `
        : "";

    postEl.innerHTML = `
      <div class="row position-relative">
        ${shareAndBookmarkHtml}
        <div class="col-md-7">
          <h2>${post.title}</h2>
          <div class="post-meta">
            ${
              post.createdBy
                ? `<a href="/profiles/${post.createdBy}"> By: ${post.createdBy} </a>`
                : ""
            }
            ${
              post.modifiedBy
                ? `<a href="/profiles/${post.modifiedBy}"><br>Edit by: ${post.modifiedBy}</a>`
                : ""
            }
          </div>
          <div class="post-description"><span>Description: </span><p>${
            post.description
          }</p></div>
          <div class="post-preview"><p>${preview}</p></div>
          <div class="post-details">
            <a href="/post/${post.slug}${
      role && status !== "published" ? "?preview=true" : ""
    }" class="btn view-post-btn">
              View Full Post <i class="bi bi-arrow-right"></i>
            </a>
          </div>
          <div class="post-meta">
            ${status === "draft" ? "" : `${status}: ${publishedDate}<br>`}
          </div>
          <div class="post-categories"><strong>Categories:</strong> ${cats}</div>
          <br>
          <div class="post-tags"><strong>Tags:</strong> ${tags}</div>
        </div>
        <div class="col-md-5">
          ${thumbnail}
        </div>
      </div>
    `;

    if (role) {
      const actions = document.createElement("div");
      actions.className = "post-actions";
      if (status === "draft" || status === "scheduled") {
        if (role === "admin" || post.createdBy === name) {
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-danger btn-sm m-1";
          deleteBtn.textContent = "Delete Post";
          deleteBtn.onclick = () => deletePost(post.slug, post.title);
          postEl.appendChild(deleteBtn);
        }
        if (post.createdBy === name || role === "editor") {
          const editBtn = document.createElement("button");
          editBtn.className = "btn btn-primary btn-sm m-1";
          editBtn.id = "edit-btn";
          editBtn.textContent = "Edit Post";
          postEl.appendChild(editBtn);
        }
        if (post.createdBy === name) {
          const publishBtn = document.createElement("button");
          publishBtn.textContent = "Publish Now";
          publishBtn.className = "btn btn-outline-secondary btn-sm ms-1";
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
          actions.appendChild(scheduleInput);
          actions.appendChild(scheduleBtn);
        }
      }
      if (
        status === "scheduled" &&
        (post.createdBy === name || role === "admin")
      ) {
        const draftBtn = document.createElement("button");
        draftBtn.className = "btn btn-outline-secondary btn-sm ms-1";
        draftBtn.textContent = "Save as Draft";
        actions.appendChild(draftBtn);
      }
      if (
        status === "published" &&
        (role === "admin" || post.createdBy === name)
      ) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger btn-sm m-1";
        deleteBtn.textContent = "Delete Post";
        deleteBtn.onclick = () => deletePost(post.slug, post.title);
        postEl.appendChild(deleteBtn);

        const draftBtn = document.createElement("button");
        draftBtn.className = "btn btn-outline-secondary btn-sm ms-1";
        draftBtn.textContent = "Save as Draft";
        actions.appendChild(draftBtn);
      }
      postEl.appendChild(actions);
    }
    const bookmarkBtn = postEl.querySelector(".bookmark-btn");
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener("click", () => {
        toggleBookmark(post.slug);
        const icon = bookmarkBtn.querySelector("i");
        icon.className = `bi ${
          isBookmarked(post.slug) ? "bi-bookmark-fill" : "bi-bookmark"
        }`;
        if (window.location.pathname === "/saved") {
          import("./saved.js").then((module) => module.loadBookmarkedPosts());
        }
      });
    }

    const shareBtn = postEl.querySelector(".share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const slug = shareBtn.dataset.slug;
        const postUrl = `${window.location.origin}/post/${slug}`;
        const shareLinkInput = document.getElementById("shareLink");
        shareLinkInput.value = postUrl;
        const title = post.title || "Check out this post!";
        shareLinkInput.setAttribute("data-title", title);

        const modal = new bootstrap.Modal(
          document.getElementById("shareModal")
        );
        modal.show();
      });
    }
    container.appendChild(postEl);
  });
}

function shareActions() {
  // Only inject modal once
  if (!document.getElementById("shareModal")) {
    const modalHtml = `
      <div class="modal fade" id="shareModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title">Share this post</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="input-group">
                <input type="text" aria-label="Post link" id="shareLink" class="form-control" readonly>
                <button class="btn btn-outline-secondary" type="button" id="copyLinkBtn" title="Copy">
                  <i class="bi bi-copy"></i>
                </button>
              </div>
            </div>
            <div class="modal-footer d-flex flex-wrap gap-2">
              <button id="whatsappShareBtn" class="btn btn-success" title="WhatsApp">
                <i class="bi bi-whatsapp"></i>
              </button>
              <button id="linkedinShareBtn" class="btn" title="LinkedIn">
                <i class="bi bi-linkedin"></i>
              </button>
              <button id="facebookShareBtn" class="btn" title="Facebook">
                <i class="bi bi-facebook"></i>
              </button>
              <button id="twitterShareBtn" class="btn" style="background-color: #1da1f2; color: white;" title="Twitter/X">
                <i class="bi bi-twitter-x"></i>
              </button>
              <button id="redditShareBtn" class="btn" style="background-color: #ff4500; color: white;" title="Reddit">
                <i class="bi bi-reddit"></i>
              </button>
              <button id="telegramShareBtn" class="btn" style="background-color: #0088cc; color: white;" title="Telegram">
                <i class="bi bi-telegram"></i>
              </button>
              <button id="emailShareBtn" class="btn btn-dark" title="Email">
                <i class="bi bi-envelope-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  const getUrl = () => encodeURIComponent(document.getElementById("shareLink").value);
  const getRawUrl = () => document.getElementById("shareLink").value;
  const getTitle = () => encodeURIComponent(document.getElementById("shareLink").getAttribute("data-title") || "Check out this post!");

  // Copy
  document.getElementById("copyLinkBtn")?.addEventListener("click", () => {
    const linkInput = document.getElementById("shareLink");
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(() => {
      showToast("Link copied to clipboard!", "success");
    });
  });

  // WhatsApp
  document.getElementById("whatsappShareBtn")?.addEventListener("click", () => {
    window.open(`https://wa.me/?text=${getUrl()}`, "_blank");
  });

  // LinkedIn - Fixed with title parameter
  document.getElementById("linkedinShareBtn")?.addEventListener("click", () => {
    const url = getRawUrl();
    const title = getTitle();
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${title}%20${getUrl()}`, "_blank");
  });

  // Facebook
  document.getElementById("facebookShareBtn")?.addEventListener("click", () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${getUrl()}`, "_blank");
  });

  // Twitter/X
  document.getElementById("twitterShareBtn")?.addEventListener("click", () => {
    const text = getTitle();
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${getUrl()}`, "_blank");
  });

  // Reddit
  document.getElementById("redditShareBtn")?.addEventListener("click", () => {
    const title = getTitle();
    window.open(`https://reddit.com/submit?url=${getUrl()}&title=${title}`, "_blank");
  });

  // Telegram
  document.getElementById("telegramShareBtn")?.addEventListener("click", () => {
    const text = getTitle();
    window.open(`https://t.me/share/url?url=${getUrl()}&text=${text}`, "_blank");
  });

  // Email
  document.getElementById("emailShareBtn")?.addEventListener("click", () => {
    const subject = getTitle();
    const body = encodeURIComponent(`I thought you might like this:\n\n${getRawUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  // Native Web Share API (if available) - bonus feature
  if (navigator.share) {
    const nativeShareBtn = document.createElement("button");
    nativeShareBtn.className = "btn btn-primary";
    nativeShareBtn.title = "Share";
    nativeShareBtn.innerHTML = '<i class="bi bi-share"></i>';
    nativeShareBtn.addEventListener("click", () => {
      navigator.share({
        title: document.title,
        url: getRawUrl()
      }).catch(console.error);
    });
    
    // Add native share button to modal footer
    const modalFooter = document.querySelector("#shareModal .modal-footer");
    if (modalFooter) {
      modalFooter.appendChild(nativeShareBtn);
    }
  }
}

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} variant - The type of toast (e.g., "success", "danger").
 */
function showToast(message, variant = "primary") {
  const toastEl = document.getElementById("live-toast");
  const toastMsg = document.getElementById("toast-message");
  toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
  toastMsg.textContent = message;
  new bootstrap.Toast(toastEl).show();
}

/**
 * Loads and renders tag checkboxes for filtering posts.
 * Fetches tags from the /tags endpoint and sets up event listeners for checkbox changes.
 * @param {Function} setCurrentState - The function to set the current state in the calling page.
 * @param {Set} activeTags - The set of active tags.
 * @param {Function} loadPosts - The function to call when tags change.
 * @param {string} selectedCategory - The slug of the selected category.
 */
async function loadTags(
  setCurrentState,
  activeTags,
  loadPosts,
  selectedCategory
) {
  const tags = await fetchData("/tags");
  const container = document.getElementById("tag-checkboxes");
  container.innerHTML = "";
  tags.forEach((tag) => {
    const label = document.createElement("label");
    label.className = "form-check-label";
    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.value = tag.slug;
    input.id = `tag-${tag.slug}`;
    input.checked = activeTags.has(tag.slug);

    input.onchange = () => {
      const newTags = new Set(activeTags);
      if (input.checked) {
        newTags.add(tag.slug);
      } else {
        newTags.delete(tag.slug);
      }
      setCurrentState(1, newTags, selectedCategory);
      loadPosts();
    };

    label.appendChild(input);
    label.append(` ${tag.name}`);
    container.appendChild(label);
  });
}

/**
 * Clears all tag checkboxes in the tag filter section.
 */
function clearTags() {
  const container = document.getElementById("tag-checkboxes");
  const checkboxes = container.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

/**
 * Loads and populates the category dropdown menu.
 * Fetches categories from the /categories endpoint and sets up event listeners for selection.
 * @param {Function} setCurrentState - The function to set the current state in the calling page.
 * @param {Function} loadPostsByCategory - The function to call when a category is selected.
 * @param {Set} activeTags - The set of active tags.
 */
async function loadCategories(
  setCurrentState,
  loadPostsByCategory,
  activeTags,
  loadPublishedPosts
) {
  const dropdown = document.getElementById("category-dropdown");
  dropdown.innerHTML = "";

  const allCategoriesLi = document.createElement("li");
  const allCategoriesA = document.createElement("a");
  allCategoriesA.className = "dropdown-item";
  allCategoriesA.href = "#";
  allCategoriesA.textContent = "All Categories";
  allCategoriesA.dataset.value = "";
  allCategoriesA.onclick = () => {
    dropdown
      .querySelectorAll(".dropdown-item")
      .forEach((item) => item.classList.remove("active"));
    allCategoriesA.classList.add("active");
    document.getElementById("category-dropdown-button").textContent =
      "All Categories";
    setCurrentState(1, activeTags, "");
    loadPublishedPosts();
  };
  allCategoriesLi.appendChild(allCategoriesA);
  dropdown.appendChild(allCategoriesLi);

  const categories = await fetchData("/categories");
  categories.forEach((cat) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "dropdown-item";
    a.href = "#";
    a.textContent = cat.name;
    a.dataset.value = cat.slug;
    a.onclick = () => {
      dropdown
        .querySelectorAll(".dropdown-item")
        .forEach((item) => item.classList.remove("active"));
      a.classList.add("active");
      document.getElementById("category-dropdown-button").textContent =
        cat.name;
      setCurrentState(1, activeTags, cat.slug);
      loadPostsByCategory(cat.slug, cat.name);
    };
    li.appendChild(a);
    dropdown.appendChild(li);
  });
}

/**
 * Renders pagination links dynamically based on totalPages, currentPage, tags, and category.
 * @param {number} currentPage - The current page number.
 * @param {number} totalPages - The total number of pages.
 * @param {Function} loadPosts - The function to call when a page is clicked.
 * @param {Set} activeTags - The set of active tag slugs.
 * @param {string} selectedCategory - The slug of the selected category.
 */
function renderPagination(
  currentPage,
  totalPages,
  loadPosts,
  activeTags,
  selectedCategory,
  setCurrentState
) {
  const pageNumbersContainer = document.getElementById("page-numbers");
  pageNumbersContainer.innerHTML = "";

  if (totalPages === 1) {
    document.getElementById("pagination").style.display = "none";
    return;
  } else document.getElementById("pagination").style.display = "block";

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage === totalPages) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const prevPageItem = document.getElementById("prev-page");
  prevPageItem.classList.toggle("disabled", currentPage === 1);

  const buildQueryString = (page) => {
    const params = new URLSearchParams();
    if (page !== 1) params.set("page", page);
    if (activeTags.size > 0) params.set("tags", [...activeTags].join(","));
    if (selectedCategory) params.set("category", selectedCategory);
    return params.toString() ? `?${params.toString()}` : "";
  };

  if (startPage > 1) {
    const ellipsis = document.createElement("li");
    ellipsis.className = "page-item disabled";
    ellipsis.innerHTML = '<span class="page-link">...</span>';
    const firstPage = document.createElement("li");
    firstPage.className = "page-item";
    const pageLink = document.createElement("a");
    pageLink.className = "page-link";
    pageLink.href = buildQueryString(1);
    pageLink.textContent = "1";
    pageLink.onclick = (e) => {
      e.preventDefault();
      setCurrentState(1, activeTags, selectedCategory);
      loadPosts();
    };
    firstPage.appendChild(pageLink);
    pageNumbersContainer.appendChild(firstPage);
    pageNumbersContainer.appendChild(ellipsis);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageItem = document.createElement("li");
    pageItem.className = `page-item ${i === currentPage ? "active" : ""}`;
    const pageLink = document.createElement("a");
    pageLink.className = "page-link";
    pageLink.href = buildQueryString(i);
    pageLink.textContent = i;
    pageLink.onclick = (e) => {
      e.preventDefault();
      setCurrentState(i, activeTags, selectedCategory);
      loadPosts();
    };
    pageItem.appendChild(pageLink);
    pageNumbersContainer.appendChild(pageItem);
  }

  if (endPage < totalPages) {
    const ellipsis = document.createElement("li");
    ellipsis.className = "page-item disabled";
    ellipsis.innerHTML = '<span class="page-link">...</span>';
    const lastPage = document.createElement("li");
    lastPage.className = "page-item";
    const pageLink = document.createElement("a");
    pageLink.className = "page-link";
    pageLink.href = buildQueryString(totalPages);
    pageLink.textContent = totalPages;
    pageLink.onclick = (e) => {
      e.preventDefault();
      setCurrentState(totalPages, activeTags, selectedCategory);
      loadPosts();
    };
    lastPage.appendChild(pageLink);
    pageNumbersContainer.appendChild(ellipsis);
    pageNumbersContainer.appendChild(lastPage);
  }

  const nextPageItem = document.getElementById("next-page");
  nextPageItem.classList.toggle("disabled", currentPage === totalPages);
}

/**
 * Toggles the color theme and saves it in local storage.
 */
function updateThemeToggleIcon(theme) {
  const icon = document.getElementById("theme-toggle").querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

function theme() {
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
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
  });

  var { name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}");
  if (role) {
    const joinLink = Array.from(document.querySelectorAll(".nav-link")).find(
      (link) => link.textContent.trim() === "Join Us"
    );

    if (joinLink) {
      const dashboardLink = document.createElement("a");
      dashboardLink.className = "nav-link";
      dashboardLink.href = "/dashboard";
      dashboardLink.textContent = "Dashboard";

      const dashboardItem = document.createElement("li");
      dashboardItem.className = "nav-item";
      dashboardItem.appendChild(dashboardLink);

      joinLink.parentElement.insertAdjacentElement("afterend", dashboardItem);
      joinLink.style.display = "none";
    }
  }
}

/**
 * Fetches and displays the number of pending requests for admins.
 */
async function updatePendingRequestsCount() {
  var { name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}");
  if (role !== "admin") {
    const adminFunctions = document.getElementsByClassName("admin-functions");
    for (const element of adminFunctions) {
      element.style.display = "none";
    }
  }
  if (role === "editor") {
    document.getElementById("nav-drafts").innerText = "Drafts";
    document.getElementById("nav-my-posts").style.display = "none";
  }
  if (role === "author") {
    document.getElementById("nav-scheduled").innerText = "My Scheduled Posts";
  }
  document.getElementById("accountOffcanvasLabel").textContent = `Hello, ${
    name.split(" ")[0]
  }`;
  const countElement = document.getElementById("pending-requests-count");
  if (countElement && role === "admin") {
    try {
      const count = await fetchData("/all-requests/pending/count");
      countElement.textContent = count.count || 0;
    } catch (err) {
      console.error("Failed to fetch pending requests count:", err.message);
      countElement.textContent = "0";
    }
  }
}

/**
 * handles logout
 */
async function handleLogout() {
  const logoutButton = document.getElementById("account-logout");
  if (logoutButton)
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch("/logout", { method: "POST" });
        showToast("Logged out", "success");
        localStorage.removeItem("userInfo");
        location.href = "/login";
      } catch (err) {
        showToast("Failed to log out", "danger");
      }
    });
}

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  if (response.status === 401) {
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?returnUrl=${returnUrl}`;
    return Promise.reject("Token expired. Redirecting to login.");
  }

  return response;
};

export {
  fetchData,
  getTagFilterParam,
  renderPosts,
  showToast,
  loadTags,
  loadCategories,
  renderPagination,
  clearTags,
  theme,
  toggleBookmark,
  getBookmarks,
  isBookmarked,
  updatePendingRequestsCount,
  handleLogout,
  shareActions,
};
