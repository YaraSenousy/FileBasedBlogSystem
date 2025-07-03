// Fetch data with error handling
async function fetchData(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.ok}`);
  return res.json();
}

// Get tag filter parameter
function getTagFilterParam(activeTags) {
  return activeTags.size > 0 ? `&tags=${[...activeTags].join(",")}` : "";
}

// Render posts with dynamic content
function renderPosts(posts, containerId, role = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (posts.length <= 0) {
    container.innerHTML = "<h4>No results</h4>";
    document.getElementById("next-page").style.visibility = "hidden";
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
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-primary btn-sm m-1";
      editBtn.textContent = "Edit Post";
      editBtn.onclick = () => window.open(`/create?slug=${post.slug}`, "_self");
      postEl.appendChild(editBtn);

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

  //document.getElementById("page-number").textContent = `Page ${currentPage}`;
  //document.getElementById("next-page").style.visibility = posts.length < limit ? "hidden" : "visible";
}

// Show toast notification
function showToast(message, variant = "primary") {
  const toastEl = document.getElementById("live-toast");
  const toastMsg = document.getElementById("toast-message");
  toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
  toastMsg.textContent = message;
  new bootstrap.Toast(toastEl).show();
}

// Export utilities
export { fetchData, getTagFilterParam, renderPosts, showToast };