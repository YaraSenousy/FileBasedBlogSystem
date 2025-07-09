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
        totalItems: result.totalItems || result.length || 0
      };
    else
      return result;
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
 * Renders posts to the specified container.
 * @param {Array} posts - Array of post objects.
 * @param {string} containerId - ID of the container to render posts into.
 * @param {string|null} role - User role for conditional rendering.
 */
function renderPosts(posts, containerId, role = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (posts.length <= 0) {
    container.innerHTML = "<h4>No results</h4>";
    return;
  }

  posts.forEach((post) => {
    const postEl = document.createElement("article");
    const tags = (post.tags || []).map((t) => `<span>${t}</span>`).join("");
    const cats = (post.categories || []).map((c) => `<span>${c}</span>`).join("");
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
    const dateOptions = {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    const publishedDate = new Date(post.published).toLocaleString("en-GB", dateOptions);
    const modifiedDate =
      post.modified !== "0001-01-01T00:00:00"
        ? new Date(post.modified).toLocaleString("en-GB", dateOptions)
        : "";

    postEl.innerHTML = `
      <div class="row">
        <div class="col-md-7">
          <h2>${post.title}</h2>
          <div class="post-meta">
            ${role ? (status === "draft" ? "" : `${status}: ${publishedDate} <br>`) : `Published: ${publishedDate} <br>`}
            ${modifiedDate ? `Modified: ${modifiedDate}` : ""}
          </div>
          <div class="post-description"><span>Description: </span><p>${post.description}</p></div>
          <div class="post-preview"><p>${preview}</p></div>
          <div class="post-details">
            <a href="/post?slug=${post.slug}${
              role && status !== "published" ? "&preview=true" : ""
            }">View The Full Post</a>
          </div>
          <div class="post-categories"><strong>Categories:</strong> ${cats}</div>
          <div class="post-tags"><strong>Tags:</strong> ${tags}</div>
        </div>
        ${images.length > 0 ? `<div class="col-md-5">${thumbnail}</div>` : ""}
      </div>
    `;

    if (role) {
      if (role === "admin") {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger btn-sm m-1";
        deleteBtn.textContent = "Delete Post";
        deleteBtn.onclick = () => deletePost(post.slug, post.title);
        postEl.appendChild(deleteBtn);
      }

      const actions = document.createElement("div");
      actions.className = "post-actions";
      if (status === "draft" || status === "scheduled") {
        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-primary btn-sm m-1";
        editBtn.textContent = "Edit Post";
        editBtn.onclick = () => window.open(`/create?slug=${post.slug}`, "_self");
        postEl.appendChild(editBtn);
        
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
          if (!time) showToast("Please choose a time", "danger");
          else schedulePost(post.slug, time);
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
    }

    container.appendChild(postEl);
  });
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
 * @param {Function} setCurrentPage - The function to set the current page number in the calling page
 * @param {Set} activeTags - The set of active tags
 * @param {Function} loadPosts - The function to call when tags change.
 */
async function loadTags(setCurrentPage, activeTags, loadPosts) {
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

    input.onchange = () => {
      if (input.checked) activeTags.add(tag.slug);
      else activeTags.delete(tag.slug);
      setCurrentPage(1);
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
 * @param {Function} setCurrentPage - The function to set the current page number in the calling page
 * @param {Function} loadPostsByCategory - The function to call when a category is selected.
 */
async function loadCategories(setCurrentPage, loadPostsByCategory) {
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
      document.getElementById("category-dropdown-button").textContent = cat.name;
      setCurrentPage(1);
      loadPostsByCategory(cat.slug, cat.name);
    };
    li.appendChild(a);
    dropdown.appendChild(li);
  });
}

/**
 * Renders pagination links dynamically based on totalPages and currentPage.
 * @param {number} currentPage - The current page number.
 * @param {Function} setCurrentPage - The function to set the current page number in the calling page
 * @param {number} totalPages - The total number of pages.
 * @param {Function} loadPosts - The function to call when a page is clicked.
 */
function renderPagination(currentPage, setCurrentPage, totalPages, loadPosts) {
  const pageNumbersContainer = document.getElementById("page-numbers");
  pageNumbersContainer.innerHTML = "";

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage === totalPages) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const prevPageItem = document.getElementById("prev-page");
  prevPageItem.classList.toggle("disabled", currentPage === 1);

  if (startPage > 1) {
    const ellipsis = document.createElement("li");
    ellipsis.className = "page-item disabled";
    ellipsis.innerHTML = '<span class="page-link">...</span>';
    const firstPage = document.createElement("li");
    firstPage.className = "page-item";
    const pageLink = document.createElement("a");
    pageLink.className = "page-link";
    pageLink.href = "#";
    pageLink.textContent = "1";
    pageLink.onclick = (e) => {
      e.preventDefault();
      setCurrentPage(1);
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
    pageLink.href = "#";
    pageLink.textContent = i;
    pageLink.onclick = (e) => {
      e.preventDefault();
      setCurrentPage(i);
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
    pageLink.href = "#";
    pageLink.textContent = totalPages;
    pageLink.onclick = (e) => {
      e.preventDefault();
      setCurrentPage(totalPages);
      loadPosts();
    };
    lastPage.appendChild(pageLink);
    pageNumbersContainer.appendChild(ellipsis);
    pageNumbersContainer.appendChild(lastPage);
  }

  const nextPageItem = document.getElementById("next-page");
  nextPageItem.classList.toggle("disabled", currentPage === totalPages);
}

export { fetchData, getTagFilterParam, renderPosts, showToast, loadTags, loadCategories, renderPagination, clearTags};