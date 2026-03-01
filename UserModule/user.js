/* ================= API ================= */

const apiURL = "http://localhost:3000";

/* ================= FACEBOOK CONFIG ================= */
const FB_PAGE_ID = "1029453713582593";
// Default hardcoded token (fallback)
const DEFAULT_FB_ACCESS_TOKEN = "EAAWQZBzCnZBusBQ6HHZCwkFKMKn32MbkzF1q2FS3VZAjN317IYDfTw1UuFEQ78ZCyXFjkAMkj90jjwkxud0XwWcMlwgVi0LL5iJ1PMJWJYcQjZB9ZA1cFkxAkGexks6s89tIcUlvLhb4lpTBU3uSm5vXg2snSUtGKqJLpa0tWoGCg7puAT2wy1eYNGHqZAjJh7huvQrJtuysiZAZA1aZAU0v26S619HxxgX7HB86sCpqaMZD";

// Initialize token from localStorage or use default
let fbAccessToken = localStorage.getItem("fbAccessToken") || DEFAULT_FB_ACCESS_TOKEN;

async function postToFacebookAPI(message) {
  if (!message) return;
  
  const url = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`;
  const params = new URLSearchParams({
    message: message,
    access_token: fbAccessToken
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: params
    });
    const data = await response.json();
    
    if (data.id) {
      console.log("Successfully posted to Facebook:", data.id);
      return true;
    } else {
      console.error("Error posting to Facebook:", data);
      alert("Failed to post to Facebook: " + (data.error?.message || "Unknown error"));
      return false;
    }
  } catch (error) {
    console.error("Network error posting to Facebook:", error);
    alert("Network error posting to Facebook");
    return false;
  }
}


/* ================= SESSION ================= */

// 🔐 SESSION CHECK START

const session = JSON.parse(localStorage.getItem("loggedInUser"));

if (!session) {
  alert("Session expired. Please login again.");
  window.location.href = "../index.html";
}

const SESSION_LIMIT = 8 * 60 * 60 * 1000; // 8 HOURS

if (Date.now() - session.loginTime > SESSION_LIMIT) {
  localStorage.clear();
  alert("Session expired. Please login again.");
  window.location.href = "../index.html";
}

// 🔐 SESSION CHECK END

const loggedUser = session.employeeId;

// ===== SET EMPLOYEE INFO =====
document.getElementById("empName").innerText = session.name;
document.getElementById("empId").innerText = session.employeeId;


// ===== LOAD ASSIGNED CUSTOMERS =====
const customers = session.assigned
  ? session.assigned.split(",").map(c => c.trim())
  : [];

document.getElementById("totalAssigned").innerText = customers.length;

const list = document.getElementById("customerList");
list.innerHTML = "";

if (customers.length === 0) {
  list.innerHTML = "<p>No Customers Assigned</p>";
} else {
  customers.forEach(c => {
    list.innerHTML += `<span class="tag">${c}</span>`;
  });
}

/* ================= GLOBAL STATE ================= */

let selectedClientName = "";
let selectedClientId = null;
let editingPostId = null;
let deletePostId = null;


/* ================= DOM READY ================= */

document.addEventListener("DOMContentLoaded", function () {

  /* ================= FACEBOOK TOKEN UPDATE ================= */
  const updateFbTokenBtn = document.getElementById("updateFbTokenBtn");
  const fbAccessTokenInput = document.getElementById("fbAccessTokenInput");

  if (updateFbTokenBtn && fbAccessTokenInput) {
    // Pre-fill if exists in localStorage
    const savedToken = localStorage.getItem("fbAccessToken");
    if (savedToken) {
      fbAccessTokenInput.value = savedToken;
    }

    updateFbTokenBtn.addEventListener("click", function() {
      const newToken = fbAccessTokenInput.value.trim();
      if (newToken) {
        fbAccessToken = newToken;
        localStorage.setItem("fbAccessToken", newToken);
        alert("Facebook Access Token updated successfully! Future posts will use this token.");
        
        // Update status text
        const statusEl = document.getElementById("fbStatus");
        if(statusEl) statusEl.innerText = "Connected (Custom Token)";
      } else {
        alert("Please enter a valid token.");
      }
    });
  }

  // ✅ SESSION se assigned customers use karo
window.assignedCustomers = customers;

// 🔥 LOGIN KE BAAD ASSIGNED CUSTOMERS LOAD KARO
async function loadAssignedCustomers() {

  const empId = session.employeeId;

  const res = await fetch(`http://localhost:3000/employee/${empId}`);
  const data = await res.json();

  console.log("Assigned Customers API:", data);

  const list = document.getElementById("customerList");
  const total = document.getElementById("totalAssigned");

  list.innerHTML = "";

  if (!data.customers || data.customers.length === 0) {
    total.innerText = 0;
    list.innerHTML = "<p>No Customers Assigned</p>";
    return;
  }

  total.innerText = data.customers.length;

  data.customers.forEach(c => {
    list.innerHTML += `<span class="tag">${c.cust_name}</span>`;
  });

  // also update selection array
  window.assignedCustomers = data.customers.map(c => c.cust_name);
}

loadAssignedCustomers();

  /* RESET STATE */

  selectedClientId = null;
  selectedClientName = "";

  document.getElementById("selectClientBtn").innerText = "Select Client";
  document.getElementById("contentTable").innerHTML = "";

  const search = document.getElementById("searchInput");
  if (search) search.value = "";


  /* ================= LOAD EMPLOYEE ================= */



  /* ================= OPEN MODAL ================= */

  document.getElementById("openModal").onclick = function () {

    editingPostId = null;

    document.getElementById("createBtn").innerText = "Create Post";

    document.getElementById("project_name").value = "";
    document.getElementById("project_caption").value = "";
    document.getElementById("platform").value = "";
    document.getElementById("status").value = "Draft";
    document.getElementById("schedule_date").value = "";
    document.getElementById("notification_email").value = "ankitagkjha@gmail.com";

    document.getElementById("postModal").classList.remove("hidden");
  };


  /* ================= CANCEL MODAL ================= */

  document.getElementById("cancelBtn").onclick = function () {
    document.getElementById("postModal").classList.add("hidden");
  };


  /* ================= CREATE / UPDATE POST ================= */

  document.getElementById("createBtn").onclick = async function () {

    const title = document.getElementById("project_name").value.trim();
    const caption = document.getElementById("project_caption").value.trim();
    const platform = document.getElementById("platform").value;
    const status = document.getElementById("status").value;
    const date = document.getElementById("schedule_date").value;
    const notification_email = document.getElementById("notification_email").value;

    if (!selectedClientId) {
      alert("Please select a client first");
      return;
    }

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    const empId = user.employeeId;

    const postData = {
      customer_name: selectedClientName,
      title,
      caption,
      platform,
      status,
      post_date: date,
      notification_email
    };

    console.log("POST DATA:", postData);

    // ================= DATE VALIDATION =================

    const selectedDate = new Date(date);
    const today = new Date();

    // remove time part
    selectedDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    if (selectedDate < today) {

      alert("❌ Cannot create post for past date.\nPlease select today or future date.");

      return; // STOP post creation

    }

    /* UPDATE */

    if (editingPostId) {

      // If status is changing to Published and platform is Facebook, maybe we should post?
      // For now, let's keep it simple and only do it on CREATE as requested, 
      // or if the user explicitly updates it to Published.
      // Let's add it for Update too if it becomes Published.
      
      if (platform === "Facebook" && status === "Published") {
        const success = await postToFacebookAPI(caption);
        if (!success) {
           if (!confirm("Facebook posting failed. Do you still want to save the post to database?")) {
             return;
           }
        } else {
            alert("✅ Posted to Facebook Page!");
        }
      }

      fetch(apiURL + "/updatePost/" + editingPostId, {

        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)

      })
      .then(res => res.json())
      .then(() => {

        alert("Post Updated Successfully");

        editingPostId = null;

        document.getElementById("createBtn").innerText =
          "Create Post";

        document.getElementById("postModal")
          .classList.add("hidden");

        loadContent(selectedClientName);

      });

    }

    /* CREATE */

    else {
      
      // AUTO-PUBLISH TO FACEBOOK
      if (platform === "Facebook" && status === "Published") {
        const success = await postToFacebookAPI(caption);
        if (!success) {
           if (!confirm("Facebook posting failed. Do you still want to save the post to database?")) {
             return;
           }
        } else {
            alert("✅ Posted to Facebook Page!");
        }
      }

      fetch(apiURL + "/addPost", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)

      })
      .then(res => res.json())
      .then(() => {

        alert("Post Created Successfully");

        document.getElementById("postModal")
          .classList.add("hidden");

        loadContent(selectedClientName);

      });

    }

  };


  /* ================= CLIENT SELECTION ================= */

  const selectClientBtn =
    document.getElementById("selectClientBtn");

  const clientListDiv =
    document.getElementById("clientList");

  const radioClientsDiv =
    document.getElementById("radioClients");

  const cancelClientBtn =
    document.getElementById("cancelClient");

  const confirmClientBtn =
    document.getElementById("confirmClient");


  /* OPEN CLIENT LIST */

selectClientBtn.onclick = function () {

  const customers = window.assignedCustomers;

  console.log("Customers for selection:", customers);

  clientListDiv.style.display = "block";
  radioClientsDiv.innerHTML = "";

  if (!customers || customers.length === 0) {
    radioClientsDiv.innerHTML = "<p>No clients assigned to you</p>";
    return;
  }

  // customers are STRING → not object
  customers.forEach(function(name) {

    const label = document.createElement("label");
    label.className = "client-card";

    label.innerHTML = `
      <input type="radio" name="selectedClient" value="${name}">
      <span>${name}</span>
    `;

    radioClientsDiv.appendChild(label);

  });

};


  /* CANCEL */

  cancelClientBtn.onclick = function () {

    clientListDiv.style.display = "none";

    selectedClientId = null;
    selectedClientName = "";

  };


  /* CONFIRM */

confirmClientBtn.onclick = function () {

  const selected = document.querySelector("input[name='selectedClient']:checked");

  if (!selected) {
    alert("Please select a client");
    return;
  }

  // 🔥 yahi correct hai
  selectedClientName = selected.value;
  selectedClientId = selected.value;

  clientListDiv.style.display = "none";

  // button text update karo
  document.getElementById("selectClientBtn").innerText = selectedClientName;

  console.log("Selected Client:", selectedClientName);

  loadContent(selectedClientName);
};

});

/* ================= CHANGE PASSWORD ================= */

document.getElementById("updatePasswordBtn").onclick = function(){

  const current = document.getElementById("currentPassword").value.trim();
  const newPass = document.getElementById("newPassword").value.trim();
  const confirm = document.getElementById("confirmPassword").value.trim();

  if(!current || !newPass || !confirm){
    alert("Please fill all fields");
    return;
  }

  if(newPass !== confirm){
    alert("New password and confirm password must match");
    return;
  }

  if(newPass.length < 4){
    alert("Password must be at least 4 characters");
    return;
  }

  // 🔥 Logged in employee ID from session
  const empId = session.employeeId;

  fetch(apiURL + "/change-password", {
    method:"PUT",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      empId: empId,
      password: newPass
    })
  })
  .then(res=>res.text())
  .then(msg=>{
    alert("Password Updated Successfully ✅");

    document.getElementById("currentPassword").value="";
    document.getElementById("newPassword").value="";
    document.getElementById("confirmPassword").value="";
  })
  .catch(()=>alert("Error updating password"));
};

/* ================= ANALYTICS NAVIGATION ================= */

document.getElementById("showAnalyticsBtn").onclick = function() {
  if (!selectedClientName) {
    alert("Please select a client first");
    return;
  }
  window.location.href = `analytics.html?customer_name=${encodeURIComponent(selectedClientName)}`;
};

/* ================= LOAD CONTENT ================= */

function loadContent(clientId) {

  if (!clientId) return;
  
  // Show Analytics Button
  const analyticsBtn = document.getElementById("showAnalyticsBtn");
  if(analyticsBtn) analyticsBtn.style.display = "block";

  const table = document.getElementById("contentTable");

  table.innerHTML =
    "<tr><td colspan='5'>Loading...</td></tr>";

  fetch(apiURL + "/posts?customer_name=" + encodeURIComponent(clientId))
    .then(res => {
      if (!res.ok) {
        throw new Error("Server Error: " + res.status);
      }
      return res.json();
    })
    .then(data => {

      table.innerHTML = "";

      if (!Array.isArray(data) || data.length === 0) {
        table.innerHTML =
          "<tr><td colspan='5'>No Posts Found</td></tr>";
        return;
      }

      data.forEach(post => {

        table.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600;">${post.title}</div>
            <div style="font-size:13px; color:#666; margin-top:4px;">
              ${post.caption || ""}
            </div>
          </td>
          <td>${post.platform}</td>
          <td>${post.status}</td>
          <td>${
            post.schedule_date
              ? new Date(post.schedule_date).toLocaleDateString("en-GB")
              : "-"
          }</td>

          <td class="action-cell">
            <div class="menu-wrapper">
              <button class="menu-btn">⋮</button>
              <div class="menu-dropdown" style="display:none;">
                <p class="edit-btn"
                   data-id="${post.content_id}"
                   data-title="${post.title}"
                   data-caption="${post.caption || ''}"
                   data-platform="${post.platform}"
                   data-status="${post.status}"
                   data-date="${post.schedule_date}"
                   data-email="${post.notification_email || ''}">
                   ✏️ Edit
                </p>
                <p class="send-email-btn"
                   data-id="${post.content_id}"
                   data-email="${post.notification_email || 'ankitagkjha@gmail.com'}">
                   📧 Send Email
                </p>
                <p class="post-now-btn"
                   data-id="${post.content_id}"
                   data-title="${post.title}"
                   data-caption="${post.caption || ''}"
                   data-platform="${post.platform}"
                   data-status="${post.status}"
                   data-date="${post.schedule_date}">
                   🚀 Post Now
                </p>
                <p class="reschedule-btn"
                   data-id="${post.content_id}"
                   data-title="${post.title}"
                   data-caption="${post.caption || ''}"
                   data-platform="${post.platform}"
                   data-status="${post.status}"
                   data-date="${post.schedule_date}">
                   📅 Reschedule
                </p>
                <p class="delete-btn"
                   data-id="${post.content_id}">
                   🗑️ Delete
                </p>
              </div>
            </div>
          </td>
        </tr>`;
      });

    })
    .catch(err => {
      console.error("Fetch Error:", err);
      table.innerHTML =
        "<tr><td colspan='5'>Server Error</td></tr>";
    });
}


/* ================= DROPDOWN ================= */

document.addEventListener("click", function (e) {

  const isMenuBtn = e.target.classList.contains("menu-btn");
  const isInsideMenu = e.target.closest(".menu-dropdown");

  // close all menus first
  document.querySelectorAll(".menu-dropdown")
    .forEach(menu => {
      menu.style.display = "none";
    });

  // open clicked menu
  if (isMenuBtn) {

    e.stopPropagation();

    const menu = e.target.nextElementSibling;

    if (menu) {

      menu.style.display = "block";
      menu.style.position = "absolute";
      menu.style.zIndex = "99999";

    }

  }

  // prevent closing when clicking inside menu
  if (isInsideMenu) {
    e.stopPropagation();
  }

});


/* ================= DELETE ================= */

document.addEventListener("click", function(e){

  if (e.target.classList.contains("delete-btn")) {

    deletePostId = e.target.dataset.id;

    document.getElementById("deleteModal")
      .style.display = "flex";

  }

});


document.getElementById("cancelDeleteBtn").onclick =
function(){

  deletePostId = null;

  document.getElementById("deleteModal")
    .style.display = "none";

};


document.getElementById("confirmDeleteBtn").onclick =
function(){

  if (!deletePostId) return;

  fetch(apiURL + "/deletePost/" + deletePostId,
  { method:"DELETE" })
  .then(()=>{

    document.getElementById("deleteModal")
      .style.display="none";

    loadContent(selectedClientName);

  });

};


/* ================= EDIT ================= */

document.addEventListener("click", async function(e){

  /* --- EDIT / RESCHEDULE --- */
  if (e.target.classList.contains("edit-btn") || e.target.classList.contains("reschedule-btn")) {

    editingPostId =
      e.target.dataset.id;

    document.getElementById("project_name").value =
      e.target.dataset.title;

    document.getElementById("project_caption").value =
      e.target.dataset.caption;

    document.getElementById("platform").value =
      e.target.dataset.platform;

    document.getElementById("status").value =
      e.target.dataset.status;

    document.getElementById("schedule_date").value =
      e.target.dataset.date.split("T")[0];
      
    document.getElementById("notification_email").value =
      e.target.dataset.email || "ankitagkjha@gmail.com";

    document.getElementById("createBtn").innerText =
      "Update Post";
      
    // Focus on date if reschedule
    if (e.target.classList.contains("reschedule-btn")) {
       document.getElementById("schedule_date").focus();
    }

    document.getElementById("postModal")
      .classList.remove("hidden");

  }
  
  /* --- MANUAL EMAIL TRIGGER --- */
  if (e.target.classList.contains("send-email-btn")) {
    const postId = e.target.dataset.id;
    const recipient = e.target.dataset.email;

    if (!confirm(`Send email reminder to ${recipient}?`)) {
      return;
    }

    try {
      const res = await fetch(apiURL + "/sendEmail/" + postId, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await res.json();

      if (res.ok) {
        alert("✅ " + data.message);
      } else {
        alert("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error sending email:", err);
      alert("❌ Error sending email: " + err.message);
    }
  }

  /* --- POST NOW --- */
  if (e.target.classList.contains("post-now-btn")) {
      const postId = e.target.dataset.id;
      const title = e.target.dataset.title;
      const caption = e.target.dataset.caption;
      const platform = e.target.dataset.platform;
      const currentStatus = e.target.dataset.status;
      const date = e.target.dataset.date;
      
      if (platform !== "Facebook") {
          alert("Currently 'Post Now' is only supported for Facebook.");
          return;
      }
      
      if (currentStatus === "Published") {
          if (!confirm("This post is already marked as Published. Do you want to post it again?")) {
              return;
          }
      } else {
          if (!confirm("Are you sure you want to post this to Facebook now?")) {
              return;
          }
      }
      
      const success = await postToFacebookAPI(caption);
      
      if (success) {
          alert("✅ Posted to Facebook successfully!");
          
          // Update status to Published
          const postData = {
              customer_name: selectedClientName,
              title: title,
              caption: caption,
              platform: platform,
              status: "Published",
              post_date: date ? date.split('T')[0] : new Date().toISOString().split('T')[0]
          };
          
          try {
              const res = await fetch(apiURL + "/updatePost/" + postId, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(postData)
              });
              
              if (res.ok) {
                  loadContent(selectedClientName);
              } else {
                  console.error("Failed to update status in DB");
              }
          } catch (err) {
              console.error("Error updating status:", err);
          }
      }
  }

});
/* ================= SEARCH BAR FILTER ================= */

document
  .getElementById("searchInput")
  .addEventListener("input", function () {

    const searchValue =
      this.value.toLowerCase().trim();

    const rows =
      document.querySelectorAll(
        "#contentTable tr"
      );

    rows.forEach(row => {

      const title =
        row.children[0]?.innerText
        .toLowerCase() || "";

      const status =
        row.children[2]?.innerText
        .toLowerCase() || "";

      const date =
        row.children[3]?.innerText
        .toLowerCase() || "";

      const combinedText =
        title + " " +
        status + " " +
        date;

      if (combinedText.includes(searchValue)) {

        row.style.display = "";

      } else {

        row.style.display = "none";

      }

    });

});
/* ================= CONNECT BUTTONS ================= */

document
.getElementById("connectInstagramBtn")
.onclick = function(){

  window.location.href =
  apiURL + "/connectInstagram";

};


document
.getElementById("connectFacebookBtn")
.onclick = function(){

  window.location.href =
  apiURL + "/connectFacebook";

};