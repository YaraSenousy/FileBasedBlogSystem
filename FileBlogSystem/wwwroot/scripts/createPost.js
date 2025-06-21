let postSlug = null;
let queuedDeletions = [];

async function goToPreview() {
  const form = document.getElementById("postForm");
  if (!form.reportValidity()) return;
  if (postSlug) {
    document.getElementById("save-draft").innerHTML = "Save Edits";
  }
  const title = document.querySelector("input[name='title']").value;
  const description = document.querySelector("textarea[name='description']").value;
  const content = document.querySelector("textarea[name='content']").value;

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
    const post = await fetch(`/posts/${postSlug}/preview`, { credentials: "include" }).then((res) => res.json());
    if (post.mediaUrls && post.mediaUrls.length > 0) {
      const existingMedia = post.mediaUrls.filter(url => !queuedDeletions.includes(url.split("/").pop()));
      existingMedia.forEach((url) => {
        const fileName = url.split("/").pop();
        const isImage = /\.(jpe?g|png|webp|gif)$/i.test(url);
        mediaPreview.innerHTML += isImage
          ? `<img src="${url}?width=100" style="width: 100px; margin: 5px;" />`
          : `<a href="${url}" target="_blank">${fileName}</a><br/>`;
      });
    }
  }

  [...files].forEach((f) => {
    const url = URL.createObjectURL(f);
    if (/\.(jpe?g|png|webp|gif)$/i.test(f.name)) {
      mediaPreview.innerHTML += `<img src="${url}" style="width: 100px; margin: 5px;" />`;
    } else {
      mediaPreview.innerHTML += `<a href="${url}" target="_blank">${f.name}</a><br/>`;
    }
  });

  switchToPreview();
}

function switchToPreview() {
  document.getElementById("step-form").style.display = "none";
  document.getElementById("step-preview").style.display = "block";
}

function goToForm() {
  document.getElementById("step-preview").style.display = "none";
  document.getElementById("step-form").style.display = "block";
}

async function prepareFormData() {
  const form = document.getElementById("postForm");
  const formData = new FormData(form);
  const tags = [...document.querySelectorAll(".tag-checkbox:checked")].map((cb) => cb.value);
  const cats = [...document.querySelectorAll(".cat-checkbox:checked")].map((cb) => cb.value);
  formData.append("tags", tags.join(","));
  formData.append("categories", cats.join(","));
  return formData;
}

async function saveAsDraft() {
  const formData = await prepareFormData();
  const endpoint = postSlug ? `/posts/${postSlug}/edit` : `/posts`;
  const method = postSlug ? "POST" : "POST";

  const res = await fetch(endpoint, {
    method,
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
  document.getElementById("save-draft").innerHTML = "Save Edits";
}

async function publishNow() {
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
}

async function schedulePost() {
  const time = document.getElementById("schedule-time").value;
  if (!time) return showToast("Select time", "danger");

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
}

async function uploadMedia(slug) {
  const mediaForm = new FormData();
  const files = document.getElementById("media").files;
  [...files].forEach((f) => mediaForm.append("file", f));
  if (files.length > 0) {
    const res = await fetch(`/posts/${slug}/media`, {
      method: "POST",
      body: mediaForm,
      credentials: "include",
    });
    if (!res.ok) {
      showToast("Upload failed.", "danger");
    }
  }
}

async function deleteMedia(slug, filename) {
  queuedDeletions.push(filename);
  const section = document.getElementById("uploaded-media");
  const divToRemove = Array.from(section.children).find((div) =>
    div.innerHTML.includes(filename)
  );
  if (divToRemove) divToRemove.remove();
}

async function loadTagsAndCategories() {
  const tagBox = document.getElementById("tags-list");
  const catBox = document.getElementById("categories-list");

  const tags = await fetch("/tags").then((r) => r.json());
  const cats = await fetch("/categories").then((r) => r.json());

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
}

async function loadExistingPost(slug) {
  const post = await fetch(`/posts/${slug}/preview`, {
    credentials: "include",
  }).then((res) => res.json());

  document.querySelector("input[name='title']").value = post.title;
  document.querySelector("textarea[name='description']").value = post.description;
  document.querySelector("textarea[name='content']").value = post.rawMarkdown;

  post.tags?.forEach((t) =>
    document.querySelector(`.tag-checkbox[value="${t}"]`)?.click()
  );
  post.categories?.forEach((c) =>
    document.querySelector(`.cat-checkbox[value="${c}"]`)?.click()
  );

  postSlug = slug;
  showMedia(post);
  updateStatusAndButtons(post.status);
}

function updateStatusAndButtons(status) {
  const saveDraftBtn = document.getElementById("save-draft");
  const publishNowBtn = document.querySelector("button[onclick='publishNow()']");
  const scheduleBtn = document.querySelector("button[onclick='schedulePost()']");
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
    scheduleBtn.setAttribute("onclick", "unpublishPost()");
    document.getElementById("schedule-time").style.display = "none";
    statusDiv.textContent = "Status: Published";
  } else if (status === "scheduled") {
    saveDraftBtn.textContent = "Save Edits";
    publishNowBtn.style.display = "inline-block";
    scheduleBtn.textContent = "Reschedule";
    scheduleBtn.setAttribute("onclick", "schedulePost()");
    const cancelScheduleBtn = document.createElement("button");
    cancelScheduleBtn.textContent = "Cancel Schedule";
    cancelScheduleBtn.className = "btn btn-outline-secondary btn-sm ms-2";
    cancelScheduleBtn.onclick = () => unpublishPost();
    document.getElementById("post-actions").appendChild(cancelScheduleBtn);
    statusDiv.textContent = "Status: Scheduled";
  }

  document.getElementById("step-preview").appendChild(statusDiv);
}

async function unpublishPost() {
  saveAsDraft();
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
}

function showMedia(post) {
    const section = document.getElementById("uploaded-media");
    if (post.mediaUrls && post.mediaUrls.length > 0) {
        section.innerHTML = `<h3>Uploaded Media:</h3>`;
        post.mediaUrls.forEach(url => {
          const fileName = url.split("/").pop();
          const div = document.createElement("div");
          const isImage = /\.(png|jpe?g|webp|gif)$/i.test(url);
      
          div.innerHTML = `
            ${isImage ? `<img src="${url}?width=100" alt="${fileName}" />` : `<a href="${url}" target="_blank">${fileName}</a>`}
            <button onclick="deleteMedia('${postSlug}', '${fileName}')">Delete</button>
          `;
          section.appendChild(div);
        });
    }
}

function showToast(message, variant = "primary") {
  const toastEl = document.getElementById("live-toast");
  const toastMsg = document.getElementById("toast-message");

  toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
  toastMsg.textContent = message;

  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

window.onload = async () => {
  await loadTagsAndCategories();
  const slug = new URLSearchParams(location.search).get("slug");
  if (slug) {
    document.getElementById("form-heading").textContent = "Edit Post";
    await loadExistingPost(slug);
  } else {
    document.getElementById("form-heading").textContent = "Create Post";
    updateStatusAndButtons("draft");
  }
};