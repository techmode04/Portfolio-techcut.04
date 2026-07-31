/* ==========================================================================
   SACHIN DHISLE PORTFOLIO - VIDEO PLAYER & DETAIL PAGE LOGIC
   Features: Dual-Engine Player (Native HTML5 Stream + Google Drive Iframe Fallback)
   Zero Unsplash URLs across codebase!
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("id");

  if (!videoId) {
    window.location.href = "portfolio.html";
    return;
  }

  await loadVideoDetails(videoId);
});

/**
 * Format Google Drive Thumbnail Image URL
 */
function formatGoogleDriveImageUrl(url, driveVideoUrl) {
  let fileId = extractDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
  }
  if (url && (url.startsWith("http") || url.startsWith("data:"))) {
    return url;
  }
  const videoFileId = extractDriveFileId(driveVideoUrl);
  if (videoFileId) {
    return `https://drive.google.com/thumbnail?id=${videoFileId}&sz=w1200`;
  }
  return "";
}

/**
 * Extract File ID from Google Drive URL
 */
function extractDriveFileId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function cleanDateValue(val) {
  if (!val) return "2026";
  const s = String(val).trim();
  if (s.includes("1899-12-30")) return "2026-07-26";
  if (s.includes("T")) return s.split("T")[0];
  return s;
}

async function loadVideoDetails(id) {
  const container = document.getElementById("player-container");
  if (!container) return;

  try {
    const res = await API.getVideo(id);
    if (!res.success || !res.video) {
      showToast("Video project not found", "error");
      setTimeout(() => window.location.href = "portfolio.html", 1500);
      return;
    }

    const video = res.video;
    renderPlayer(video);
    renderMetadata(video);
    setupProjectNavigation(video.id);
  } catch (e) {
    console.error("Error loading video detail:", e);
    showToast("Error loading video details", "error");
  }
}

/**
 * Render Video Player
 */
function renderPlayer(video) {
  const container = document.getElementById("player-container");
  if (!container) return;

  const rawUrl = video.driveVideoUrl || "";
  const fileId = extractDriveFileId(rawUrl);
  const thumbUrl = formatGoogleDriveImageUrl(video.thumbnailUrl, rawUrl);
  const isVertical = video.aspectRatio === "9:16";

  if (fileId) {
    const iframePreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

    container.innerHTML = `
      <div class="player-wrapper" style="position: relative; width: 100%; ${isVertical ? 'max-width: 440px;' : 'max-width: 900px;'} margin: 0 auto; border-radius: var(--radius-md); overflow: hidden; background: #000; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <iframe src="${escapeHTML(iframePreviewUrl)}" 
                style="width: 100%; aspect-ratio: ${isVertical ? '9/16' : '16/9'}; height: ${isVertical ? '560px' : '480px'}; max-height: 80vh; border: none;" 
                allow="autoplay; fullscreen" 
                allowfullscreen>
        </iframe>
      </div>
    `;
  } else if (rawUrl.includes("youtube.com") || rawUrl.includes("youtu.be")) {
    const match = rawUrl.match(/v=([a-zA-Z0-9_-]+)/) || rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    const ytId = match ? match[1] : "";
    container.innerHTML = `
      <div style="position: relative; width: 100%; aspect-ratio: 16/9; max-height: 80vh; border-radius: var(--radius-md); overflow: hidden; background: #000;">
        <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" style="width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <p>No video stream URL available for this project.</p>
      </div>
    `;
  }
}

function renderMetadata(video) {
  document.title = `${video.title} - sachindhisle Portfolio`;

  const titleEl = document.getElementById("video-title");
  const catBadge = document.getElementById("video-category-badge");
  const ratioBadge = document.getElementById("video-ratio-badge");
  const clientEl = document.getElementById("video-client-name");
  const dateEl = document.getElementById("video-upload-date");
  const viewsEl = document.getElementById("video-views-count");
  const descEl = document.getElementById("video-description-text");
  const tagsContainer = document.getElementById("video-software-tags");

  if (titleEl) titleEl.textContent = video.title;
  if (catBadge) catBadge.textContent = video.category || "General";
  if (ratioBadge) ratioBadge.textContent = video.aspectRatio || "16:9";
  if (clientEl) clientEl.textContent = video.client || "Client";
  if (dateEl) dateEl.textContent = cleanDateValue(video.uploadDate);
  if (viewsEl) viewsEl.textContent = `${video.views || 1}`;
  if (descEl) descEl.textContent = video.description || "No description provided for this project.";

  if (tagsContainer) {
    const tags = video.tags && video.tags.length > 0 ? video.tags : ["DaVinci Resolve", "Premiere Pro", "After Effects"];
    tagsContainer.innerHTML = tags.map(tag => `
      <span class="badge badge-accent" style="font-size: 0.85rem; padding: 6px 14px;">
        <i class="ri-tools-line"></i> ${escapeHTML(tag)}
      </span>
    `).join("");
  }

  const shareBtn = document.getElementById("share-project-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      if (navigator.share) {
        navigator.share({
          title: video.title,
          url: window.location.href
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        showToast("Project link copied to clipboard!", "success");
      }
    });
  }
}

async function setupProjectNavigation(currentId) {
  const container = document.getElementById("project-nav-bar");
  if (!container) return;

  try {
    const res = await API.getVideos();
    if (!res.success || !res.videos) return;

    const videos = res.videos;
    const currentIndex = videos.findIndex(v => v.id === currentId);

    let html = "";

    if (currentIndex > 0) {
      const prevVideo = videos[currentIndex - 1];
      html += `
        <a href="video.html?id=${prevVideo.id}" class="btn btn-secondary btn-sm">
          <i class="ri-arrow-left-line"></i> Previous: ${escapeHTML(prevVideo.title)}
        </a>
      `;
    }

    if (currentIndex < videos.length - 1) {
      const nextVideo = videos[currentIndex + 1];
      html += `
        <a href="video.html?id=${nextVideo.id}" class="btn btn-secondary btn-sm" style="margin-left: auto;">
          Next: ${escapeHTML(nextVideo.title)} <i class="ri-arrow-right-line"></i>
        </a>
      `;
    }

    container.innerHTML = html;
  } catch (e) {
    console.error("Error setting up project navigation:", e);
  }
}
