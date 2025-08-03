import { fetchData, showToast, updatePendingRequestsCount, theme, handleLogout } from "./utils.js";

/**
 * Stores the slug of the current post being edited or created.
 * @type {string|null}
 */
let postSlug = null;

/**
 * Tracks filenames of media queued for deletion.
 * @type {string[]}
 */
let queuedDeletions = [];

var easyMDE;

/**
 * Generates a preview of the post content and media.
 * Validates the form, renders markdown, and updates the preview UI.
 * @returns {Promise<void>}
 */
async function goToPreview() {
  const titleInput = document.querySelector("input[name='title']");
  const descriptionInput = document.querySelector("textarea[name='description']");
  const contentInputElement = document.querySelector("#markdown-textarea");
  const contentInput = easyMDE.value();

  // Remove invalid classes
  [titleInput, descriptionInput, contentInputElement].forEach(input => {
    input.classList.remove("is-invalid");
    const cmWrapper = input.nextElementSibling;
    if (cmWrapper && cmWrapper.classList.contains("CodeMirror")) {
      cmWrapper.classList.remove("is-invalid");
    }
  });

  // Validate required fields
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const content = contentInput.trim();
  let isValid = true;

  if (!title) {
    titleInput.classList.add("is-invalid");
    isValid = false;
  }
  if (!description) {
    descriptionInput.classList.add("is-invalid");
    isValid = false;
  }
  if (!content) {
    contentInputElement.classList.add("is-invalid");
    const cmWrapper = contentInputElement.nextElementSibling;
    if (cmWrapper && cmWrapper.classList.contains("CodeMirror")) {
      cmWrapper.classList.add("is-invalid");
    }
    isValid = false;
  }

  if (!isValid) {
    return;
  }

  const tags = [...document.querySelectorAll(".tag-checkbox:checked")].map((cb) => cb.value);
  const cats = [...document.querySelectorAll(".cat-checkbox:checked")].map((cb) => cb.value);

  const markedContent = window.marked ? marked.parse(content) : content;

  document.getElementById("preview-container").innerHTML = `
    <h3>${title}</h3>
    <p><em>${description}</em></p>
    <div>${markedContent}</div>
    <p><strong>Tags:</strong> ${tags.join(", ")}</p>
    <p><strong>Categories:</strong> ${cats.join(", ")}</p>
  `;

  const files = document.getElementById("media").files;
  const mediaPreview = document.getElementById("media-preview");
  mediaPreview.innerHTML = `<h4>Media:</h4>`;

  if (postSlug) {
    try {
      const post = await fetchData(`/posts/${postSlug}/preview`);
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        const existingMedia = post.mediaUrls.filter((url) => !queuedDeletions.includes(url.split("/").pop()));
        existingMedia.forEach((url) => {
          const fileName = url.split("/").pop();
          const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
          mediaPreview.innerHTML += isImage
            ? `<img src="${url}?width=100" style="width: 100px; margin: 5px;" />`
            : `<a href="${url}" target="_blank">${fileName}</a><br/>`;
        });
      }
    } catch (error) {
      showToast("Failed to load existing media.", "danger");
    }
  }

  [...files].forEach((f) => {
    const url = URL.createObjectURL(f);
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)) {
      mediaPreview.innerHTML += `<img src="${url}" style="width: 100px; margin: 5px;" />`;
    } else {
      mediaPreview.innerHTML += `<a href="${url}" target="_blank">${f.name}</a><br/>`;
    }
  });

  switchToPreview();
}

/**
 * Switches the UI to preview mode by hiding the form and showing the preview.
 */
function switchToPreview() {
  document.getElementById("step-form").style.display = "none";
  document.getElementById("step-preview").style.display = "block";
  var { name, role } = JSON.parse(localStorage.getItem("userInfo") || "{}");
  if (role === "editor")
    document.getElementById("publishing-center").style.display = "none";
}

/**
 * Switches the UI back to form mode by hiding the preview and showing the form.
 */
function goToForm() {
  document.getElementById("step-preview").style.display = "none";
  document.getElementById("step-form").style.display = "block";
}

/**
 * Prepares FormData with post details, including tags and categories.
 * @returns {FormData} The prepared form data for submission.
 */
async function prepareFormData() {
  const form = document.getElementById("postForm");
  const formData = new FormData(form);
  const tags = [...document.querySelectorAll(".tag-checkbox:checked")].map((cb) => cb.value);
  const cats = [...document.querySelectorAll(".cat-checkbox:checked")].map((cb) => cb.value);
  formData.append("tags", tags.join(","));
  formData.append("categories", cats.join(","));
  formData.append("content", easyMDE.value());
  return formData;
}

/**
 * Saves the post as a draft, handling media uploads and deletions.
 * @returns {Promise<void>}
 */
async function saveAsDraft() {
  try {
    const formData = await prepareFormData();
    const endpoint = postSlug ? `/posts/${postSlug}/edit` : `/posts`;
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      showToast("Save failed.", "danger");
      return;
    }

    const data = await res.json();
    postSlug = data.slug || postSlug;

    for (const filename of queuedDeletions) {
      const deleteRes = await fetch(`/posts/${postSlug}/media/${filename}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!deleteRes.ok) {
        showToast(`Failed to delete ${filename}.`, "danger");
      }
    }
    queuedDeletions = [];

    await uploadMedia(postSlug);
    showToast("Saved", "success");
    document.getElementById("save-draft").textContent = "Save Edits";
    document.querySelector(".back-btn").addEventListener("click", (e) => {
      e.preventDefault();
      window.open(`/create/${postSlug}`, "_self");
    });
  } catch (error) {
    showToast("Save failed due to an error.", "danger");
  }
}

/**
 * Publishes the post immediately after saving as a draft.
 * @returns {Promise<void>}
 */
async function publishNow() {
  try {
    await saveAsDraft();
    const res = await fetch(`/posts/${postSlug}/publish`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      showToast("Published", "success");
      location.href = "/dashboard";
    } else {
      showToast("Publish failed.", "danger");
    }
  } catch (error) {
    showToast("Publish failed due to an error.", "danger");
  }
}

/**
 * Schedules the post for a specific time after saving as a draft.
 * @returns {Promise<void>}
 */
async function schedulePost() {
  const time = document.getElementById("schedule-time").value;
  if (!time) return showToast("Select time", "danger");

  try {
    await saveAsDraft();
    const res = await fetch(`/posts/${postSlug}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: time }),
      credentials: "include",
    });

    if (res.ok) {
      showToast("Scheduled Post", "success");
      location.href = "/dashboard";
    } else {
      showToast("Scheduling failed.", "danger");
    }
  } catch (error) {
    showToast("Scheduling failed due to an error.", "danger");
  }
}

/**
 * Uploads media files for the given post slug.
 * @param {string} slug - The slug of the post to upload media for.
 * @returns {Promise<void>}
 */
async function uploadMedia(slug) {
  const mediaForm = new FormData();
  const files = document.getElementById("media").files;
  [...files].forEach((f) => mediaForm.append("file", f));
  if (files.length > 0) {
    try {
      const res = await fetch(`/posts/${slug}/media`, {
        method: "POST",
        body: mediaForm,
        credentials: "include",
      });
      if (!res.ok) {
        showToast("Upload failed.", "danger");
      }
    } catch (error) {
      showToast("Upload failed due to an error.", "danger");
    }
  }
}

/**
 * Queues a media file for deletion and removes it from the UI.
 * @param {string} slug - The slug of the post.
 * @param {string} filename - The filename of the media to delete.
 * @returns {Promise<void>}
 */
async function deleteMedia(slug, filename) {
  queuedDeletions.push(filename);
  const section = document.getElementById("uploaded-media");
  const divToRemove = Array.from(section.children).find((div) =>
    div.innerHTML.includes(filename)
  );
  if (divToRemove) divToRemove.remove();
}

/**
 * Loads available tags and categories into their respective lists.
 * @returns {Promise<void>}
 */
async function loadTagsAndCategories() {
  const tagBox = document.getElementById("tags-list");
  const catBox = document.getElementById("categories-list");

  try {
    const [tags, cats] = await Promise.all([fetch("/tags").then((r) => r.json()), fetch("/categories").then((r) => r.json())]);
    tagBox.innerHTML += tags
      .map(
        (tag) => `
          <label><input type="checkbox" class="tag-checkbox" value="${tag.slug}"> ${tag.name}</label><br/>
      `
      )
      .join("");

    catBox.innerHTML += cats
      .map(
        (cat) => `
          <label><input type="checkbox" class="cat-checkbox" value="${cat.slug}"> ${cat.name}</label><br/>
      `
      )
      .join("");
  } catch (error) {
    showToast("Failed to load tags or categories.", "danger");
  }
}

/**
 * Loads an existing post's data into the form for editing.
 * @param {string} slug - The slug of the post to load.
 * @returns {Promise<void>}
 */
async function loadExistingPost(slug) {
  try {
    const post = await fetch(`/posts/${slug}/preview`, {
      credentials: "include",
    }).then((res) => res.json());

    document.querySelector("input[name='title']").value = post.title;
    document.querySelector("textarea[name='description']").value = post.description;
    easyMDE.value(post.rawMarkdown);

    post.tags?.forEach((t) =>
      document.querySelector(`.tag-checkbox[value="${t}"]`)?.click()
    );
    post.categories?.forEach((c) =>
      document.querySelector(`.cat-checkbox[value="${c}"]`)?.click()
    );

    postSlug = slug;
    showMedia(post);
    updateStatusAndButtons(post.status);
  } catch (error) {
    showToast("Failed to load existing post.", "danger");
  }
}

/**
 * Updates the UI based on the post's status.
 * @param {string} status - The status of the post (e.g., "draft", "published", "scheduled").
 */
function updateStatusAndButtons(status) {
  const saveDraftBtn = document.getElementById("save-draft");
  const publishNowBtn = document.querySelector(".publish-btn");
  const scheduleBtn = document.querySelector(".schedule-btn");
  const statusDiv = document.getElementById("post-status");

  if (status === "draft") {
    saveDraftBtn.textContent = "Save Edits";
    publishNowBtn.style.display = "inline-block";
    scheduleBtn.style.display = "inline-block";
    statusDiv.textContent = "Status: Draft";
  } else if (status === "published") {
    saveDraftBtn.textContent = "Save Edits";
    publishNowBtn.style.display = "none";
    scheduleBtn.textContent = "Unpublish";
    scheduleBtn.onclick = () => unpublishPost();
    document.getElementById("schedule-time").style.display = "none";
    statusDiv.textContent = "Status: Published";
  } else if (status === "scheduled") {
    saveDraftBtn.textContent = "Save Edits";
    publishNowBtn.style.display = "inline-block";
    scheduleBtn.textContent = "Reschedule";
    scheduleBtn.onclick = () => schedulePost();
    const cancelScheduleBtn = document.createElement("button");
    cancelScheduleBtn.textContent = "Cancel Schedule";
    cancelScheduleBtn.className = "btn btn-outline-secondary btn-sm ms-2";
    cancelScheduleBtn.onclick = () => unpublishPost();
    document.getElementById("post-actions").appendChild(cancelScheduleBtn);
    statusDiv.textContent = "Status: Scheduled";
  }

  document.getElementById("step-preview").appendChild(statusDiv);
}

/**
 * Unpublishes the post by saving it as a draft.
 * @returns {Promise<void>}
 */
async function unpublishPost() {
  try {
    await saveAsDraft();
    const res = await fetch(`/posts/${postSlug}/draft`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      showToast("Unpublished", "success");
      location.href = "/dashboard";
    } else {
      showToast("Unpublish failed.", "danger");
    }
  } catch (error) {
    showToast("Unpublish failed due to an error.", "danger");
  }
}

/**
 * Displays uploaded media for the post in the UI.
 * @param {Object} post - The post object containing media URLs.
 */
function showMedia(post) {
  const section = document.getElementById("uploaded-media");
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    section.innerHTML = `<h3>Uploaded Media:</h3>`;
    post.mediaUrls.forEach((url) => {
      const fileName = url.split("/").pop();
      const div = document.createElement("div");
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

      div.innerHTML = `
        ${isImage ? `<img src="${url}?width=100" alt="${fileName}" />` : `<a href="${url}" target="_blank">${fileName}</a>`}
      `;
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn btn-danger btn-sm ms-2";
      deleteButton.textContent = "Delete";
      deleteButton.onclick = () => deleteMedia(postSlug, fileName);
      div.appendChild(deleteButton);
      section.appendChild(div);
    });
  }
}

/**
 * Initializes the create/edit post page by loading tags, categories, and existing post data if applicable.
 * Attach event listeners
 * @returns {Promise<void>}
 */
window.onload = async () => {
  easyMDE = new EasyMDE({ element: document.getElementById('markdown-textarea') });
  theme();
  handleLogout();
  updatePendingRequestsCount();

  try {
    await loadTagsAndCategories();
    const slug = new URLSearchParams(location.search).get("slug");
    if (slug) {
      document.getElementById("form-heading").textContent = "Edit Post";
      await loadExistingPost(slug);
    } else {
      document.getElementById("form-heading").textContent = "Create Post";
    }

    document.querySelector(".continue-btn").addEventListener("click", goToPreview);
    document.getElementById("save-draft").addEventListener("click", saveAsDraft);
    document.querySelector(".publish-btn").addEventListener("click", publishNow);
    document.querySelector(".schedule-btn").addEventListener("click", schedulePost);
    document.querySelector(".back-btn").addEventListener("click", goToForm);
  } catch (error) {
    showToast("Failed to initialize page.", "danger");
  }
};