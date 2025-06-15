document.addEventListener("DOMContentLoaded", async () => {
    await loadTagsAndCategories();

    const slug = new URLSearchParams(window.location.search).get("slug");
    if (slug) {
        document.getElementById("submit-button").innerHTML = "Save Edits"
        // Load existing post for editing
        const post = await fetch(`/posts/${slug}?preview=true`).then(res => res.json());
        document.querySelector("input[name='title']").value = post.title;
        document.querySelector("textarea[name='description']").value = post.description;
        document.querySelector("textarea[name='content']").value = post.rawMarkdown;

        // Check tags and categories
        post.tags?.forEach(t => document.querySelector(`.tag-checkbox[value="${t}"]`)?.click());
        post.categories?.forEach(c => document.querySelector(`.cat-checkbox[value="${c}"]`)?.click());

        document.getElementById("result").textContent = `Editing: ${slug}`;
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
            await fetch(`/posts/${slug}/edit`, { method: "POST", body: formData });
            await uploadMedia(slug);
            alert("Updated!");
        } else {
            const postRes = await fetch("/posts", { method: "POST", body: formData });
            const result = await postRes.json();
            await uploadMedia(result.slug);
            showPreview(result.slug);
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
    await fetch(`/posts/${slug}/publish`, { method: "POST" });
    alert("Published!");
    window.location.reload();
}

async function schedulePost(slug) {
    const time = document.getElementById("schedule-time").value;
    if (!time) return alert("Please pick a time");
    await fetch(`/posts/${slug}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: time })
    });
    alert("Scheduled!");
    window.location.reload();
}

async function uploadMedia(slug) {
    const mediaFormData = new FormData();
    const files = document.querySelector('input[type="file"]').files;
    for (const f of files) mediaFormData.append("file", f);
    await fetch(`/posts/${slug}/media`, { method: "POST", body: mediaFormData });
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
