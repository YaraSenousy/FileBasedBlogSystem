document.addEventListener("DOMContentLoaded", async () => {
    await loadTagsAndCategories();

    const slug = new URLSearchParams(window.location.search).get("slug");
    if (slug) {
        document.querySelector("h1").innerHTML = "Edit Post";
        document.getElementById("submit-button").innerHTML = "Save Edits"
        // Load existing post for editing
        const post = await fetch(`/posts/${slug}/preview`,{
            method: "Get",
            credentials: "include"}).then(res => res.json());
        document.querySelector("input[name='title']").value = post.title;
        document.querySelector("textarea[name='description']").value = post.description;
        document.querySelector("textarea[name='content']").value = post.rawMarkdown;

        // Check tags and categories
        post.tags?.forEach(t => document.querySelector(`.tag-checkbox[value="${t}"]`)?.click());
        post.categories?.forEach(c => document.querySelector(`.cat-checkbox[value="${c}"]`)?.click());

        showMedia(post);         
    }

    // Form submission
    const form = document.getElementById("postForm");
    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        ["title", "description", "content"].forEach(name => {
            const el = form.querySelector(`[name="${name}"]`);
            formData.append(name, el.value);
        });

        const selectedTags = [...document.querySelectorAll('.tag-checkbox:checked')].map(cb => cb.value);
        const selectedCats = [...document.querySelectorAll('.cat-checkbox:checked')].map(cb => cb.value);

        formData.append("tags", selectedTags.join(","));
        formData.append("categories", selectedCats.join(","));

        if (slug) {
            await fetch(`/posts/${slug}/edit`, { method: "POST", body: formData, credentials: "include"});
            await uploadMedia(slug);
            window.location.reload();
        } else {
            const postRes = await fetch("/posts", { method: "POST", body: formData, credentials: "include" });
            const createdPost = await postRes.json();
            await uploadMedia(createdPost.slug);
            open(`/create.html?slug=${createdPost.slug}`,"_self");
        }
    };
});


async function loadTagsAndCategories() {
    const tagBox = document.getElementById("tags-list");
    const catBox = document.getElementById("categories-list");

    const tags = await fetch("/tags").then(r => r.json());
    const cats = await fetch("/categories").then(r => r.json());

    tagBox.innerHTML += tags.map(tag => `
        <label><input type="checkbox" class="tag-checkbox" value="${tag.slug}"> ${tag.name}</label><br/>
    `).join("");

    catBox.innerHTML += cats.map(cat => `
        <label><input type="checkbox" class="cat-checkbox" value="${cat.slug}"> ${cat.name}</label><br/>
    `).join("");
}

async function publishNow(slug) {
    await fetch(`/posts/${slug}/publish`, { method: "POST", credentials: "include" });
    alert("Published!");
    window.location.reload();
}

async function schedulePost(slug) {
    const time = document.getElementById("schedule-time").value;
    if (!time) return alert("Please pick a time");
    await fetch(`/posts/${slug}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: time }),
        credentials: "include"
    });
    alert("Scheduled!");
    window.location.reload();
}

async function uploadMedia(slug) {
    const mediaFormData = new FormData();
    const files = document.querySelector('input[type="file"]').files;
    if (files.length >= 1)
    {
        for (const f of files) mediaFormData.append("file", f);
        await fetch(`/posts/${slug}/media`, { method: "POST", body: mediaFormData, credentials: "include" });
    }
}
function showPreview(slug) {
    document.getElementById("preview-section").innerHTML = `
        <h2>Preview:</h2>
        <iframe src="/post.html?slug=${slug}&preview=true" style="width:100%; height:500px;"></iframe>
        <br/>
        <button onclick="publishNow('${slug}')">Publish Now</button>
        <button onclick="schedulePost('${slug}')">Schedule Post</button>
        <input type="datetime-local" id="schedule-time" />
    `;
}

function showMedia(post) {
    const section = document.getElementById("preview-section");
    section.innerHTML = `<h3>Uploaded Media:</h3>`;
    if (post.mediaUrls && post.mediaUrls.length > 0) {
        post.mediaUrls.forEach(url => {
          const fileName = url.split("/").pop();
          const div = document.createElement("div");
          const isImage = /\.(png|jpe?g|webp|gif)$/i.test(url);
      
          div.innerHTML = `
            ${isImage ? `<img src="${url}?width=100" alt="${fileName}" />` : `<a href="${url}" target="_blank">${fileName}</a>`}
            <button onclick="deleteMedia('${post.slug}', '${fileName}')">Delete</button>
          `;
          section.appendChild(div);
        });
    }
}

async function deleteMedia(slug, filename) {
    const confirmDelete = confirm(`Delete file: ${filename}?`);
    if (!confirmDelete) return;
  
    const res = await fetch(`/posts/${slug}/media/${filename}`, {
      method: "DELETE",
      credentials: "include"
    });
  
    if (res.ok) {
      alert("Deleted.");
      window.location.reload();
    } else {
      alert("Delete failed.");
    }
}