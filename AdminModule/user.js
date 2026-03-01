const API = "http://localhost:3000";

/* ================= LOAD POSTS ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadPosts();
});

/* LOAD TABLE */

async function loadPosts() {
  const res = await fetch(`${API}/posts`);
  const posts = await res.json();

  const table = document.getElementById("contentTable");
  table.innerHTML = "";

  posts.forEach((post) => {
    table.innerHTML += `
      <tr>
        <td>${post.title}</td>
        <td>${post.platform}</td>
        <td>${post.status}</td>
        <td>${formatDate(post.post_date)}</td>
        <td>
          <button onclick="deletePost(${post.post_id})">🗑</button>
        </td>
      </tr>
    `;
  });
}

/* DATE FORMAT */

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

/* DELETE POST */

async function deletePost(id) {
  if (!confirm("Delete post?")) return;

  await fetch(`${API}/deletePost/${id}`, {
    method: "DELETE",
  });

  loadPosts();
}

/* ================= SEARCH ================= */

document.getElementById("searchInput").addEventListener("input", function () {
  const value = this.value.toLowerCase();
  const rows = document.querySelectorAll("#contentTable tr");

  rows.forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(value)
      ? ""
      : "none";
  });
});

/* ================= SOCIAL CONNECT ================= */

document.getElementById("connectInstagramBtn").addEventListener("click", () => {
  window.location.href = `${API}/connectInstagram`;
});

document.getElementById("connectFacebookBtn").addEventListener("click", () => {
  window.location.href = `${API}/connectFacebook`;
});
