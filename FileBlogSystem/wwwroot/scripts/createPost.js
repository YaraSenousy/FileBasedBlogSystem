document.addEventListener("DOMContentLoaded", async () => {
    await loadTagsAndCategories();

    const form = document.getElementById('postForm');
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

        const postRes = await fetch("/posts", { method: "POST", body: formData });
        const { slug } = await postRes.json();
        document.getElementById("result").textContent = `Draft created: ${slug}`;

        const mediaFormData = new FormData();
        const files = form.querySelector('input[type="file"]').files;
        for (const f of files) mediaFormData.append("file", f);
        await fetch(`/posts/${slug}/media`, { method: "POST", body: mediaFormData });

        document.getElementById("preview-section").innerHTML = `
            <h2>Preview:</h2>
            <iframe src="/post.html?slug=${slug}&preview=true" style="width:100%; height:500px;"></iframe>
            <br/>
            <button onclick="publishNow('${slug}')">Publish Now</button>
            <button onclick="schedulePost('${slug}')">Schedule Post</button>
            <input type="datetime-local" id="schedule-time" />
        `;
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
