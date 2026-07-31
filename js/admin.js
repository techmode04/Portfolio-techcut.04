/* ==========================================================================
   SACHIN DHISLE PORTFOLIO - SECURED ADMIN DASHBOARD JS
   Features: Automatic Video Frame Thumbnail Generator & Testimonials Management
   Includes: Reliable Google Drive Photo Thumbnail Renderer for Client Reviews
   ========================================================================== */

let adminToken = sessionStorage.getItem("sd_admin_token") || null;
let adminVideosList = [];
let adminTestimonialsList = [];
let editingVideoId = null;
let editingTestimonialId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("admin-login-form");
  const uploadForm = document.getElementById("video-form");
  const passwordForm = document.getElementById("change-password-form");
  const testimonialForm = document.getElementById("testimonial-form");

  if (loginForm) {
    loginForm.addEventListener("submit", handleAdminLogin);
  }

  if (uploadForm) {
    uploadForm.addEventListener("submit", handleVideoSave);
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", handleChangeCredentialsSubmit);
  }

  if (testimonialForm) {
    testimonialForm.addEventListener("submit", handleTestimonialSave);
  }

  const logoutBtn = document.getElementById("admin-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  await API.syncFromSheet();
  checkAdminAuth();
});

function extractDriveFileId(url) {
  if (!url) return null;
  const s = String(url).trim();
  const match = s.match(/\/d\/([a-zA-Z0-9_-]+)/) || s.match(/id=([a-zA-Z0-9_-]+)/) || s.match(/^([a-zA-Z0-9_-]{25,50})$/);
  return match ? match[1] : null;
}

function formatGoogleDriveImageUrl(url) {
  if (!url || url.trim() === "") return "";
  const fileId = extractDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
  }
  if (url.startsWith("http") || url.startsWith("data:")) {
    return url;
  }
  return "";
}

/**
 * Extract a Crisp Frame from Video File to use as Cover Thumbnail
 */
function extractFrameFromVideoFile(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        URL.revokeObjectURL(video.src);
        resolve({
          base64: base64,
          fileName: "autothumb_" + Date.now() + ".jpg",
          mimeType: "image/jpeg"
        });
      } catch (err) {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
  });
}

/**
 * Live Google Sheets Connection Status Tester
 */
async function testLiveConnection() {
  const dot = document.getElementById("connection-status-dot");
  const title = document.getElementById("connection-status-title");
  const sub = document.getElementById("connection-status-sub");
  const inputUrl = document.getElementById("input-apps-script-url");

  const curUrl = localStorage.getItem("sd_apps_script_url") || CONFIG.APPS_SCRIPT_URL;
  if (inputUrl && curUrl) inputUrl.value = curUrl;

  if (title) title.textContent = "Testing Google Sheets Connection...";
  if (sub) sub.textContent = "Pinging Google Apps Script API endpoint...";
  if (dot) {
    dot.style.background = "#f59e0b";
    dot.style.boxShadow = "0 0 10px #f59e0b";
  }

  const status = await API.testConnection();

  if (status.success) {
    if (title) title.textContent = "🟢 Google Sheets Connected";
    if (sub) sub.textContent = `${status.message} — Real-time database active!`;
    if (dot) {
      dot.style.background = "#10b981";
      dot.style.boxShadow = "0 0 12px #10b981";
    }
  } else {
    if (status.mode === "local") {
      if (title) title.textContent = "🟡 Offline / Local Storage Mode";
      if (sub) sub.textContent = "Script URL not set. Click 'Configure API URL' to connect Google Sheets!";
      if (dot) {
        dot.style.background = "#f59e0b";
        dot.style.boxShadow = "0 0 10px #f59e0b";
      }
    } else {
      if (title) title.textContent = "🔴 Google Sheets Disconnected";
      if (sub) sub.textContent = `${status.message} — Please verify Apps Script Web App permissions (Set to 'Anyone').`;
      if (dot) {
        dot.style.background = "#ef4444";
        dot.style.boxShadow = "0 0 12px #ef4444";
      }
    }
  }
}

function toggleScriptUrlBox() {
  const box = document.getElementById("script-url-config-box");
  if (!box) return;
  const isHidden = box.style.display === "none";
  box.style.display = isHidden ? "block" : "none";
  if (isHidden) {
    const curUrl = localStorage.getItem("sd_apps_script_url") || CONFIG.APPS_SCRIPT_URL;
    const inputUrl = document.getElementById("input-apps-script-url");
    if (inputUrl && curUrl) inputUrl.value = curUrl;
  }
}

async function saveAppsScriptUrl() {
  const inputUrl = document.getElementById("input-apps-script-url");
  if (!inputUrl) return;
  const newUrl = inputUrl.value.trim();

  if (!newUrl) {
    localStorage.removeItem("sd_apps_script_url");
    CONFIG.APPS_SCRIPT_URL = "";
    showToast("Cleared Apps Script URL. Switched to Local Storage Mode.", "info");
  } else {
    localStorage.setItem("sd_apps_script_url", newUrl);
    CONFIG.APPS_SCRIPT_URL = newUrl;
    showToast("Google Apps Script URL saved!", "success");
  }

  toggleScriptUrlBox();
  await API.syncFromSheet();
  testLiveConnection();
  loadDashboardData();
}

function switchVideoSource(type) {
  const tabFile = document.getElementById("tab-v-file");
  const tabUrl = document.getElementById("tab-v-url");
  const fileContainer = document.getElementById("v-file-container");
  const urlContainer = document.getElementById("v-url-container");

  if (type === "file") {
    tabFile?.classList.add("active");
    tabUrl?.classList.remove("active");
    if (fileContainer) fileContainer.style.display = "block";
    if (urlContainer) urlContainer.style.display = "none";
  } else {
    tabUrl?.classList.add("active");
    tabFile?.classList.remove("active");
    if (urlContainer) urlContainer.style.display = "block";
    if (fileContainer) fileContainer.style.display = "none";
  }
}

function switchThumbSource(type) {
  const tabFile = document.getElementById("tab-t-file");
  const tabUrl = document.getElementById("tab-t-url");
  const fileContainer = document.getElementById("t-file-container");
  const urlContainer = document.getElementById("t-url-container");

  if (type === "file") {
    tabFile?.classList.add("active");
    tabUrl?.classList.remove("active");
    if (fileContainer) fileContainer.style.display = "block";
    if (urlContainer) urlContainer.style.display = "none";
  } else {
    tabUrl?.classList.add("active");
    tabFile?.classList.remove("active");
    if (urlContainer) urlContainer.style.display = "block";
    if (fileContainer) fileContainer.style.display = "none";
  }
}

function updateFileName(input, labelId) {
  const label = document.getElementById(labelId);
  if (!label) return;
  if (input.files && input.files.length > 0) {
    label.textContent = `Selected: ${input.files[0].name}`;
    label.style.color = "var(--accent-primary)";
    label.style.fontWeight = "700";
  }
}

function checkAdminAuth() {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");

  if (adminToken) {
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";
    testLiveConnection();
    loadDashboardData();
  } else {
    if (loginSection) loginSection.style.display = "block";
    if (dashboardSection) dashboardSection.style.display = "none";
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();

  const user = document.getElementById("admin-username").value.trim();
  const pass = document.getElementById("admin-password").value.trim();
  const loginBtn = document.getElementById("login-submit-btn");

  if (!user || !pass) {
    showToast("Please enter username and password.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Syncing credentials from Google Sheets...`;

  try {
    await API.syncFromSheet();

    const res = await API.login(user, pass);
    if (res.success && res.token) {
      adminToken = res.token;
      sessionStorage.setItem("sd_admin_token", adminToken);
      showToast("Access Granted. Welcome back!", "success");
      document.getElementById("admin-password").value = "";
      checkAdminAuth();
    } else {
      showToast(res.message || "Invalid credentials! Access denied.", "error");
    }
  } catch (err) {
    console.error("Login error:", err);
    showToast("Authentication failed.", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `Login to Dashboard <i class="ri-arrow-right-line"></i>`;
  }
}

function handleLogout() {
  adminToken = null;
  sessionStorage.removeItem("sd_admin_token");
  showToast("Logged out successfully.", "info");
  checkAdminAuth();
}

function openCredentialsModal() {
  const modal = document.getElementById("password-modal");
  const form = document.getElementById("change-password-form");
  if (form) form.reset();
  
  const curUser = localStorage.getItem("sd_admin_username") || "admin";
  const userField = document.getElementById("acc-new-user");
  if (userField) userField.value = curUser;

  if (modal) modal.classList.add("active");
}

function closePasswordModal() {
  const modal = document.getElementById("password-modal");
  if (modal) modal.classList.remove("active");
}

async function handleChangeCredentialsSubmit(e) {
  e.preventDefault();

  const currentPass = document.getElementById("pass-current").value.trim();
  const newUsername = document.getElementById("acc-new-user").value.trim();
  const newPass = document.getElementById("pass-new").value.trim();
  const confirmPass = document.getElementById("pass-confirm").value.trim();
  const submitBtn = document.getElementById("save-password-btn");

  if (!currentPass || !newUsername || !newPass || !confirmPass) {
    showToast("Please fill in all credential fields.", "error");
    return;
  }

  if (newPass.length < 6) {
    showToast("New password must be at least 6 characters long.", "error");
    return;
  }

  if (newPass !== confirmPass) {
    showToast("New password and confirm password do not match!", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Updating in Google Sheets...`;

  try {
    const res = await API.updateCredentials(currentPass, newUsername, newPass);
    if (res.success) {
      showToast(res.message || "Username & Password updated successfully in Google Sheets!", "success");
      await API.syncFromSheet();
      closePasswordModal();
    } else {
      showToast(res.message || "Credentials update failed.", "error");
    }
  } catch (err) {
    console.error("Change credentials error:", err);
    showToast("Error changing username or password", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Credentials";
  }
}

async function loadDashboardData() {
  try {
    await API.syncFromSheet();

    const vRes = await API.getVideos(true);
    if (vRes.success && vRes.videos) {
      adminVideosList = vRes.videos;
    }

    const tRes = await API.getTestimonials();
    if (tRes.success && tRes.testimonials) {
      adminTestimonialsList = tRes.testimonials;
    }

    renderAdminStats();
    renderAdminTable();
    renderAdminTestimonialsTable();
    loadAdminMessages();
  } catch (e) {
    console.error("Error loading dashboard data:", e);
  }
}

function renderAdminStats() {
  const totalVidEl = document.getElementById("stat-total-videos");
  const totalViewsEl = document.getElementById("stat-total-views");
  const totalTestiEl = document.getElementById("stat-total-testimonials");
  const latestUploadEl = document.getElementById("stat-latest-upload");

  const totalVideos = adminVideosList.length;
  const totalViews = adminVideosList.reduce((acc, v) => acc + (parseInt(v.views) || 0), 0);
  const totalTestimonials = adminTestimonialsList.length;
  const latestDate = adminVideosList.length > 0 ? adminVideosList[0].uploadDate : "N/A";

  if (totalVidEl) totalVidEl.textContent = totalVideos;
  if (totalViewsEl) totalViewsEl.textContent = totalViews.toLocaleString();
  if (totalTestiEl) totalTestiEl.textContent = totalTestimonials;
  if (latestUploadEl) latestUploadEl.textContent = latestDate || "N/A";
}

function renderAdminTable() {
  const tbody = document.getElementById("admin-videos-tbody");
  if (!tbody) return;

  if (adminVideosList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px 20px;">
          <p style="color: var(--text-muted); margin-bottom: 14px;">No video projects found in the database.</p>
          <button onclick="openAddModal()" class="btn btn-primary btn-sm">
            <i class="ri-add-line"></i> + Add Your First Video Project
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminVideosList.map(vid => `
    <tr>
      <td><img src="${escapeHTML(vid.thumbnailUrl)}" class="admin-thumb-preview" alt="Thumbnail" /></td>
      <td><strong>${escapeHTML(vid.title)}</strong></td>
      <td><span class="badge badge-accent">${escapeHTML(vid.category)}</span></td>
      <td><span class="badge badge-ratio">${escapeHTML(vid.aspectRatio || '16:9')}</span></td>
      <td>${escapeHTML(vid.client || 'Client')}</td>
      <td>${vid.views || 0}</td>
      <td>
        ${vid.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
        ${vid.hidden ? '<span class="badge" style="background:#ef4444;color:#fff;">Hidden</span>' : ''}
      </td>
      <td>
        <div class="action-btns">
          <button class="action-icon-btn edit" onclick="openEditModal('${vid.id}')" title="Edit Video">
            <i class="ri-pencil-line"></i>
          </button>
          <button class="action-icon-btn feature" onclick="toggleFeatureVideo('${vid.id}')" title="Toggle Featured">
            <i class="ri-star-line"></i>
          </button>
          <button class="action-icon-btn delete" onclick="deleteVideoConfirm('${vid.id}')" title="Delete Video">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

/**
 * Render Testimonials & Client Reviews Table in Admin Dashboard
 */
function renderAdminTestimonialsTable() {
  const tbody = document.getElementById("admin-testimonials-tbody");
  if (!tbody) return;

  if (adminTestimonialsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 30px 20px;">
          <p style="color: var(--text-muted); margin-bottom: 12px;">No custom client reviews added yet. Default client reviews are currently showing on your site.</p>
          <button onclick="openAddTestimonialModal()" class="btn btn-primary btn-sm" style="background: #f59e0b; border: none;">
            <i class="ri-add-line"></i> + Add Client Review
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminTestimonialsList.map(t => {
    const stars = "⭐".repeat(t.rating || 5);
    const photoUrl = formatGoogleDriveImageUrl(t.photoUrl);
    const driveFileId = extractDriveFileId(t.photoUrl);

    return `
      <tr>
        <td>
          ${photoUrl ? `
            <img src="${escapeHTML(photoUrl)}" 
                 onerror="if(this.dataset.retry!='1'){this.dataset.retry='1';this.src='https://lh3.googleusercontent.com/d/${driveFileId}';}else{this.style.display='none';}"
                 style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--accent-primary);" 
                 alt="Client" />
          ` : `
            <div style="width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; color:var(--text-muted);"><i class="ri-user-3-line"></i></div>
          `}
        </td>
        <td><strong>${escapeHTML(t.name)}</strong></td>
        <td><span class="badge badge-accent">${escapeHTML(t.roleCompany)}</span></td>
        <td>${stars}</td>
        <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted);">"${escapeHTML(t.reviewText)}"</td>
        <td>
          <div class="action-btns">
            <button class="action-icon-btn edit" onclick="openEditTestimonialModal('${t.id}')" title="Edit Review">
              <i class="ri-pencil-line"></i>
            </button>
            <button class="action-icon-btn delete" onclick="deleteTestimonialConfirm('${t.id}')" title="Delete Review">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddModal() {
  editingVideoId = null;
  const modal = document.getElementById("video-modal");
  const form = document.getElementById("video-form");
  const modalTitle = document.getElementById("modal-title");
  const statusBox = document.getElementById("upload-status-box");

  if (form) form.reset();
  switchVideoSource('file');
  switchThumbSource('file');
  if (statusBox) statusBox.style.display = "none";
  if (modalTitle) modalTitle.textContent = "+ Add New Video Project";
  if (modal) modal.classList.add("active");
}

function openEditModal(id) {
  const video = adminVideosList.find(v => v.id === id);
  if (!video) return;

  editingVideoId = id;
  const modal = document.getElementById("video-modal");
  const modalTitle = document.getElementById("modal-title");
  const statusBox = document.getElementById("upload-status-box");

  if (statusBox) statusBox.style.display = "none";
  if (modalTitle) modalTitle.textContent = "Edit Video Project";

  document.getElementById("form-title").value = video.title || "";
  document.getElementById("form-category").value = video.category || "Real Estate";
  document.getElementById("form-aspect-ratio").value = video.aspectRatio || "16:9";
  document.getElementById("form-client").value = video.client || "";
  document.getElementById("form-duration").value = video.duration || "01:00";
  document.getElementById("form-thumbnail").value = video.thumbnailUrl || "";
  document.getElementById("form-drive-url").value = video.driveVideoUrl || "";
  document.getElementById("form-description").value = video.description || "";
  document.getElementById("form-tags").value = video.tags ? video.tags.join(", ") : "";
  document.getElementById("form-featured").checked = !!video.featured;

  if (video.driveVideoUrl) switchVideoSource('url');
  if (video.thumbnailUrl) switchThumbSource('url');

  if (modal) modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("video-modal");
  if (modal) modal.classList.remove("active");
}

/**
 * Testimonial Modal Open / Close Handlers
 */
function openAddTestimonialModal() {
  editingTestimonialId = null;
  const modal = document.getElementById("testimonial-modal");
  const form = document.getElementById("testimonial-form");
  const title = document.getElementById("t-modal-title");

  if (form) form.reset();
  if (title) title.textContent = "+ Add Client Review";
  if (modal) modal.classList.add("active");
}

function openEditTestimonialModal(id) {
  const t = adminTestimonialsList.find(item => item.id === id);
  if (!t) return;

  editingTestimonialId = id;
  const modal = document.getElementById("testimonial-modal");
  const title = document.getElementById("t-modal-title");

  if (title) title.textContent = "Edit Client Review";
  document.getElementById("t-form-name").value = t.name || "";
  document.getElementById("t-form-role").value = t.roleCompany || "";
  document.getElementById("t-form-rating").value = t.rating || "5";
  document.getElementById("t-form-photo-url").value = t.photoUrl || "";
  document.getElementById("t-form-review").value = t.reviewText || "";

  if (modal) modal.classList.add("active");
}

function closeTestimonialModal() {
  const modal = document.getElementById("testimonial-modal");
  if (modal) modal.classList.remove("active");
}

async function handleTestimonialSave(e) {
  e.preventDefault();

  const name = document.getElementById("t-form-name").value.trim();
  const roleCompany = document.getElementById("t-form-role").value.trim();
  const rating = parseInt(document.getElementById("t-form-rating").value) || 5;
  let photoUrl = document.getElementById("t-form-photo-url").value.trim();
  const reviewText = document.getElementById("t-form-review").value.trim();
  const photoFileInput = document.getElementById("t-form-photo-file");

  if (!name || !reviewText) {
    showToast("Client name and review feedback are required.", "error");
    return;
  }

  const saveBtn = document.getElementById("save-testimonial-btn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Saving review...`;

  try {
    if (photoFileInput && photoFileInput.files.length > 0) {
      const file = photoFileInput.files[0];
      const uploadedPhotoUrl = await API.uploadFileWithProgress(file, false, "Client_Photos");
      if (uploadedPhotoUrl) photoUrl = uploadedPhotoUrl;
    }

    const payload = {
      name,
      roleCompany,
      rating,
      photoUrl,
      reviewText
    };

    let res;
    if (editingTestimonialId) {
      res = await API.updateTestimonial(editingTestimonialId, payload);
    } else {
      res = await API.uploadTestimonial(payload);
    }

    if (res.success) {
      showToast(res.message || "Testimonial saved successfully!", "success");
      closeTestimonialModal();
      loadDashboardData();
    } else {
      showToast(res.message || "Failed to save testimonial.", "error");
    }
  } catch (err) {
    console.error("Testimonial save error:", err);
    showToast("Error saving testimonial: " + err.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `Save Review <i class="ri-check-line"></i>`;
  }
}

async function deleteTestimonialConfirm(id) {
  if (!confirm("Are you sure you want to delete this client review?")) return;

  try {
    const res = await API.deleteTestimonial(id);
    if (res.success) {
      showToast("Testimonial deleted successfully", "success");
      loadDashboardData();
    }
  } catch (e) {
    showToast("Error deleting testimonial", "error");
  }
}

async function handleVideoSave(e) {
  e.preventDefault();

  const title = document.getElementById("form-title").value.trim();
  const category = document.getElementById("form-category").value;
  const aspectRatio = document.getElementById("form-aspect-ratio").value;
  const client = document.getElementById("form-client").value.trim();
  const duration = document.getElementById("form-duration").value.trim();
  let thumbnailUrl = document.getElementById("form-thumbnail").value.trim();
  let driveVideoUrl = document.getElementById("form-drive-url").value.trim();
  const description = document.getElementById("form-description").value.trim();
  const tags = document.getElementById("form-tags").value.trim();
  const featured = document.getElementById("form-featured").checked;

  const videoFileInput = document.getElementById("form-video-file");
  const thumbFileInput = document.getElementById("form-thumb-file");
  const statusBox = document.getElementById("upload-status-box");
  const statusText = document.getElementById("upload-status-text");
  const progressPercentEl = document.getElementById("upload-progress-percent");
  const progressBarEl = document.getElementById("upload-progress-bar");

  if (!title) {
    showToast("Video Title is required.", "error");
    return;
  }

  const hasVideoFile = videoFileInput && videoFileInput.files.length > 0;
  let hasThumbFile = thumbFileInput && thumbFileInput.files.length > 0;

  if (!driveVideoUrl && !hasVideoFile) {
    showToast("Please select a Video file or paste a Video URL.", "error");
    return;
  }

  const updateProgress = (percent, message) => {
    if (statusBox) statusBox.style.display = "flex";
    if (statusText) statusText.textContent = message;
    if (progressPercentEl) progressPercentEl.textContent = `${percent}%`;
    if (progressBarEl) progressBarEl.style.width = `${percent}%`;
  };

  const saveBtn = document.getElementById("save-video-btn");
  saveBtn.disabled = true;
  updateProgress(0, "Preparing upload...");

  try {
    let videoFileObj = null;

    if (hasVideoFile) {
      videoFileObj = videoFileInput.files[0];
      const uploadedDriveUrl = await API.uploadFileWithProgress(videoFileObj, true, category, updateProgress);
      if (uploadedDriveUrl) driveVideoUrl = uploadedDriveUrl;
    }

    if (!hasThumbFile && !thumbnailUrl && hasVideoFile && videoFileObj) {
      updateProgress(85, "Extracting real video frame for cover thumbnail...");
      const extractedFrameData = await extractFrameFromVideoFile(videoFileObj);
      if (extractedFrameData) {
        updateProgress(90, "Uploading generated video frame thumbnail to Google Drive...");
        const uploadedThumbUrl = await API.uploadBase64WithProgress(extractedFrameData, false, category);
        if (uploadedThumbUrl) thumbnailUrl = uploadedThumbUrl;
      }
    } else if (hasThumbFile) {
      const thumbFile = thumbFileInput.files[0];
      const uploadedThumbUrl = await API.uploadFileWithProgress(thumbFile, false, category, (p, msg) => {
        updateProgress(p, `Uploading custom thumbnail image (${p}%)...`);
      });
      if (uploadedThumbUrl) thumbnailUrl = uploadedThumbUrl;
    }

    updateProgress(98, "Saving project metadata to Google Sheets...");

    const payload = {
      title,
      category,
      aspectRatio,
      client,
      duration,
      thumbnailUrl,
      driveVideoUrl,
      description,
      tags,
      featured
    };

    let res;
    if (editingVideoId) {
      res = await API.updateVideo(editingVideoId, payload);
    } else {
      res = await API.uploadVideo(payload);
    }

    if (res.success) {
      updateProgress(100, "Project saved successfully!");
      showToast(res.message || "Project saved successfully!", "success");
      setTimeout(() => {
        closeModal();
        loadDashboardData();
      }, 600);
    } else {
      showToast(res.message || "Save failed.", "error");
    }
  } catch (err) {
    console.error("Save error:", err);
    showToast("Error uploading video project: " + err.message, "error");
  } finally {
    saveBtn.disabled = false;
    setTimeout(() => {
      if (statusBox) statusBox.style.display = "none";
    }, 1500);
  }
}

async function toggleFeatureVideo(id) {
  const video = adminVideosList.find(v => v.id === id);
  if (!video) return;

  try {
    const res = await API.updateVideo(id, { featured: !video.featured });
    if (res.success) {
      showToast("Featured status updated!", "success");
      loadDashboardData();
    }
  } catch (e) {
    showToast("Failed to update status", "error");
  }
}

async function deleteVideoConfirm(id) {
  if (!confirm("Are you sure you want to delete this video project?")) return;

  try {
    const res = await API.deleteVideo(id);
    if (res.success) {
      showToast("Video deleted successfully", "success");
      loadDashboardData();
    }
  } catch (e) {
    showToast("Error deleting video", "error");
  }
}

async function loadAdminMessages() {
  const tbody = document.getElementById("admin-messages-tbody");
  if (!tbody) return;

  try {
    const res = await API.getMessages();
    if (res.success && res.messages) {
      if (res.messages.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">No messages received yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.messages.map(msg => `
        <tr>
          <td><strong>${escapeHTML(msg.name)}</strong></td>
          <td><a href="mailto:${escapeHTML(msg.email)}" style="color:var(--accent-primary)">${escapeHTML(msg.email)}</a></td>
          <td>${escapeHTML(msg.message)}</td>
          <td><small>${escapeHTML(msg.date)}</small></td>
        </tr>
      `).join("");
    }
  } catch (e) {
    console.error("Error loading messages:", e);
  }
}
