let currentPage = 1;
const limit = 5;

async function loadPosts() {
  const res = await fetch(`/?page=${currentPage}&limit=${limit}`);
  const posts = await res.json();

  const container = document.getElementById("posts-container");
  container.innerHTML = "";

  posts.forEach(post => {
    const postEl = document.createElement("article");
    postEl.innerHTML = `
      <h2>${post.title}</h2>
      <p><i>${new Date(post.published).toLocaleDateString()}</i></p>
      <div>${post.htmlContent}</div>
      <hr/>
    `;
    container.appendChild(postEl);
  });

  document.getElementById("page-number").textContent = `Page ${currentPage}`;
}

function nextPage() {
  currentPage++;
  loadPosts();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadPosts();
  }
}

window.onload = loadPosts;
