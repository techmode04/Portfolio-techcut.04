/* ==========================================================================
   SACHIN DHISLE PORTFOLIO - PORTFOLIO GRID & HERO SHOWREEL SYNC LOGIC
   Features: 
   1. Real Google Drive Video Frame Cover Extractor & Multi-Fallback Thumbnails
   2. Hero Showreel Banner Sync (Displays featured video set from Admin!)
   3. Height-fitted 16:9 & 9:16 Cards Alignment
   ========================================================================== */

let allVideos = [];
let currentCategory = "All";
let searchQuery = "";
let visibleCount = 6;

document.addEventListener("DOMContentLoaded", () => {
  initPortfolio();
});

/**
 * Extract Google Drive File ID from URL
 */
function extractDriveFileId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Format Google Drive Thumbnail Image URL
 */
function formatGoogleDriveImageUrl(thumbUrl, driveVideoUrl) {
  let fileId = extractDriveFileId(thumbUrl);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  if (thumbUrl && (thumbUrl.startsWith("http") || thumbUrl.startsWith("data:"))) {
    return thumbUrl;
  }

  const videoFileId = extractDriveFileId(driveVideoUrl);
  if (videoFileId) {
    return `https://drive.google.com/thumbnail?id=${videoFileId}&sz=w1000`;
  }

  return "";
}

/**
 * Clean & Sanitize String Values
 */
function cleanRatioValue(val) {
  if (!val) return "16:9";
  const s = String(val).trim();
  if (s.includes("1899-12-30") || s.includes("T03:") || s.includes("T19:") || s.length > 10) {
    return "9:16";
  }
  return s;
}

function cleanDurationValue(val) {
  if (!val) return "01:00";
  const s = String(val).trim();
  if (s.includes("1899-12-30") || s.includes("T") || s.length > 8) {
    return "01:00";
  }
  return s;
}

function cleanDateValue(val) {
  if (!val) return "2026";
  const s = String(val).trim();
  if (s.includes("1899-12-30")) return "2026-07-26";
  if (s.includes("T")) return s.split("T")[0];
  return s;
}

async function initPortfolio() {
  const portfolioGrid = document.getElementById("portfolio-grid");
  if (portfolioGrid) renderSkeletons(6);

  // Check local cache first
  const cached = localStorage.getItem("sd_portfolio_videos");
  if (cached) {
    try {
      allVideos = JSON.parse(cached);
      syncHeroShowreel();
      renderPortfolio();
    } catch (e) {}
  }
  
  try {
    const res = await API.getVideos();
    if (res && res.success && res.videos) {
      allVideos = res.videos;
      localStorage.setItem("sd_portfolio_videos", JSON.stringify(allVideos));
    }
  } catch (e) {
    console.error("Failed to load portfolio videos:", e);
  }

  syncHeroShowreel();
  setupCategoryFilter();
  setupSearchInput();
  renderPortfolio();

  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      visibleCount += 6;
      renderPortfolio();
    });
  }
}

/**
 * Dynamically Sync Featured Video to Hero Showreel Banner on Home Page (index.html)
 */
function syncHeroShowreel() {
  const showreelCard = document.getElementById("hero-showreel-card");
  const showreelTitle = document.getElementById("hero-showreel-title");
  const showreelBadge = document.getElementById("hero-showreel-badge");
  if (!showreelCard) return;

  if (allVideos.length === 0) return;

  const featured = allVideos.find(v => v.featured) || allVideos[0];
  if (!featured) return;

  const thumbUrl = formatGoogleDriveImageUrl(featured.thumbnailUrl, featured.driveVideoUrl);

  if (showreelTitle) showreelTitle.textContent = featured.title;
  if (showreelBadge) showreelBadge.textContent = featured.category || "Featured Showreel";

  if (thumbUrl) {
    showreelCard.style.backgroundImage = `url('${thumbUrl}')`;
    showreelCard.style.backgroundSize = "cover";
    showreelCard.style.backgroundPosition = "center";
  }

  // Attach click listener to play video in Lightbox Modal
  showreelCard.onclick = (e) => {
    e.preventDefault();
    openInlineVideoModal(featured.id);
  };
}

function renderSkeletons(count = 6) {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;
  
  grid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const skel = document.createElement("div");
    skel.className = "skeleton skeleton-card";
    grid.appendChild(skel);
  }
}

function setupCategoryFilter() {
  const pillsContainer = document.getElementById("category-pills");
  if (!pillsContainer) return;

  const categories = [
    "All", "Real Estate", "Reels", "Shorts", "Commercial", 
    "YouTube", "Wedding", "Motion Graphics", "Color Grading"
  ];

  pillsContainer.innerHTML = categories.map(cat => `
    <button class="filter-btn ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">
      ${cat}
    </button>
  `).join("");

  pillsContainer.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      pillsContainer.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category");
      visibleCount = 6;
      renderPortfolio();
    });
  });
}

function setupSearchInput() {
  const searchInput = document.getElementById("portfolio-search");
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      visibleCount = 6;
      renderPortfolio();
    }, 200);
  });
}

function getFilteredVideos() {
  return allVideos.filter(vid => {
    const matchesCategory = currentCategory === "All" || vid.category.toLowerCase() === currentCategory.toLowerCase();
    const matchesSearch = !searchQuery || 
      vid.title.toLowerCase().includes(searchQuery) ||
      vid.description.toLowerCase().includes(searchQuery) ||
      vid.client.toLowerCase().includes(searchQuery) ||
      (vid.tags && vid.tags.some(t => t.toLowerCase().includes(searchQuery)));
    
    return matchesCategory && matchesSearch;
  });
}

function getRatioClass(aspectRatio) {
  const clean = cleanRatioValue(aspectRatio).replace(":", "-");
  return `ratio-${clean}`;
}

function renderPortfolio() {
  const grid = document.getElementById("portfolio-grid");
  const loadMoreContainer = document.getElementById("load-more-container");
  if (!grid) return;

  const filtered = getFilteredVideos();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1; padding: 50px 24px; text-align: center;">
        <i class="ri-film-line no-results-icon"></i>
        <h3 style="margin-bottom: 8px; color: var(--text-main); font-size: 1.35rem;">No video projects yet</h3>
        <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 440px; margin: 0 auto 24px auto;">
          Your portfolio database is clean and ready. Add your video projects from the Admin Panel to display them here!
        </p>
        <a href="admin.html" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="ri-add-line" style="font-size: 1.1rem; color: #fff;"></i> <span>Go to Admin Panel</span>
        </a>
      </div>
    `;
    if (loadMoreContainer) loadMoreContainer.style.display = "none";
    return;
  }

  const toDisplay = filtered.slice(0, visibleCount);

  grid.innerHTML = toDisplay.map(vid => {
    const cleanRatio = cleanRatioValue(vid.aspectRatio);
    const ratioClass = getRatioClass(cleanRatio);
    const thumbImgUrl = formatGoogleDriveImageUrl(vid.thumbnailUrl, vid.driveVideoUrl);
    const displayDuration = cleanDurationValue(vid.duration);
    const displayDate = cleanDateValue(vid.uploadDate);
    const driveFileId = extractDriveFileId(vid.thumbnailUrl) || extractDriveFileId(vid.driveVideoUrl);

    return `
      <div class="video-card glass-card" onclick="openInlineVideoModal('${vid.id}')">
        <div class="video-thumbnail ${ratioClass}" style="background: linear-gradient(135deg, #121420 0%, #0a0b12 100%);">
          ${thumbImgUrl ? `
            <img src="${escapeHTML(thumbImgUrl)}" 
                 onerror="if(this.dataset.retry!='1'){this.dataset.retry='1';this.src='https://lh3.googleusercontent.com/d/${driveFileId}';}else{this.style.display='none';}"
                 alt="${escapeHTML(vid.title)}" 
                 loading="lazy" />
          ` : ''}
          <span class="aspect-ratio-tag">${escapeHTML(cleanRatio)}</span>
          <div class="thumbnail-overlay">
            <div class="play-btn-circle">
              <i class="ri-play-fill"></i>
            </div>
          </div>
          <span class="duration-badge">${escapeHTML(displayDuration)}</span>
        </div>
        <div class="video-info">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span class="video-category">${escapeHTML(vid.category)}</span>
          </div>
          <h3 class="video-title">${escapeHTML(vid.title)}</h3>
          <div class="video-meta">
            <span class="client-name"><i class="ri-user-line"></i> ${escapeHTML(vid.client || 'Client')}</span>
            <span><i class="ri-calendar-line"></i> ${escapeHTML(displayDate)}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (loadMoreContainer) {
    if (visibleCount < filtered.length) {
      loadMoreContainer.style.display = "flex";
    } else {
      loadMoreContainer.style.display = "none";
    }
  }
}

function openVideoDetail(id) {
  openInlineVideoModal(id);
}
