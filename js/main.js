/* ==========================================================================
   SACHIN DHISLE PORTFOLIO - MAIN JS & INLINE LIGHTBOX VIDEO MODAL
   Features: Instant Inline Lightbox Video Player & Dynamic Client Testimonials
   Includes: Reliable Google Drive Photo Thumbnail Renderer for Client Reviews
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initAmbientGlow();
  initScrollAnimations();
  initStatsCounters();
  initInlineVideoModalMarkup();
  renderTestimonials();
  registerServiceWorker();
});

/**
 * Navigation Bar & Mobile Drawer logic
 */
function initNavigation() {
  const navbar = document.querySelector(".navbar");
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navLinks = document.querySelector(".nav-links");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar?.classList.add("scrolled");
    } else {
      navbar?.classList.remove("scrolled");
    }
  });

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      const icon = mobileToggle.querySelector("i");
      if (icon) {
        icon.className = navLinks.classList.contains("active") ? "ri-close-line" : "ri-menu-line";
      }
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        const icon = mobileToggle.querySelector("i");
        if (icon) icon.className = "ri-menu-line";
      });
    });
  }

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * Ambient Mouse Glow Tracker Effect
 */
function initAmbientGlow() {
  const glow = document.getElementById("ambient-glow");
  if (!glow) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let glowX = mouseX;
  let glowY = mouseY;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = `${glowX}px`;
    glow.style.top = `${glowY}px`;
    requestAnimationFrame(animateGlow);
  }
  animateGlow();
}

/**
 * Scroll Reveal Animations
 */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal-on-scroll").forEach(el => observer.observe(el));
}

/**
 * Animated Stat Numbers Counter
 */
function initStatsCounters() {
  const statNumbers = document.querySelectorAll(".stat-number[data-target]");
  if (!statNumbers.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute("data-target"), 10);
        let current = 0;
        const increment = Math.max(1, Math.ceil(target / 40));

        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.innerHTML = `${current}<span>+</span>`;
        }, 30);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => observer.observe(el));
}

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
 * Render Dynamic Client Testimonials & Reviews on Home Page (index.html)
 */
async function renderTestimonials() {
  const container = document.getElementById("testimonials-grid");
  if (!container) return;

  let testimonials = [];
  try {
    const res = await API.getTestimonials();
    if (res && res.success && res.testimonials && res.testimonials.length > 0) {
      testimonials = res.testimonials;
    } else {
      testimonials = JSON.parse(localStorage.getItem("sd_portfolio_testimonials") || "[]");
    }
  } catch (e) {
    testimonials = JSON.parse(localStorage.getItem("sd_portfolio_testimonials") || "[]");
  }

  // If no custom testimonials added yet, render default testimonials
  if (!testimonials || testimonials.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="padding: 28px;">
        <div style="color: #f59e0b; font-size: 1.1rem; margin-bottom: 14px;">
          <i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i>
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.7;">
          "sachindhisle turned our raw drone and walkthrough footage into an unbelievable luxury real estate film. Our client was blown away by the speed ramps and sound design!"
        </p>
        <div style="font-weight: 700; color: var(--text-main);">David Miller</div>
        <div style="font-size: 0.8rem; color: var(--accent-primary);">Vanguard Estates, LA</div>
      </div>

      <div class="glass-card" style="padding: 28px;">
        <div style="color: #f59e0b; font-size: 1.1rem; margin-bottom: 14px;">
          <i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i>
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.7;">
          "Our Instagram Reel retention jumped by 40% after sachindhisle redesigned our caption typography and kinetic cuts. Top tier video editing skills."
        </p>
        <div style="font-weight: 700; color: var(--text-main);">Alex Turner</div>
        <div style="font-size: 0.8rem; color: var(--accent-primary);">Creator Mastery</div>
      </div>
    `;
    return;
  }

  // Render custom testimonials dynamically with Crisp Google Drive Client Photo!
  container.innerHTML = testimonials.map(t => {
    const starCount = t.rating || 5;
    const starsHtml = '<i class="ri-star-fill"></i>'.repeat(starCount);
    const photoUrl = formatGoogleDriveImageUrl(t.photoUrl);
    const driveFileId = extractDriveFileId(t.photoUrl);

    return `
      <div class="glass-card" style="padding: 28px; display: flex; flex-direction: column;">
        <div style="color: #f59e0b; font-size: 1.1rem; margin-bottom: 14px;">
          ${starsHtml}
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.7; flex-grow: 1;">
          "${escapeHTML(t.reviewText)}"
        </p>
        <div style="display: flex; align-items: center; gap: 14px;">
          ${photoUrl ? `
            <img src="${escapeHTML(photoUrl)}" 
                 onerror="if(this.dataset.retry!='1'){this.dataset.retry='1';this.src='https://lh3.googleusercontent.com/d/${driveFileId}';}else{this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';}"
                 style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);" 
                 alt="${escapeHTML(t.name)}" />
            <div style="width:48px; height:48px; border-radius:50%; background:rgba(0,102,255,0.15); display:none; align-items:center; justify-content:center; color:var(--accent-primary); font-size:1.2rem; font-weight:700;">${escapeHTML((t.name || 'C')[0])}</div>
          ` : `
            <div style="width:48px; height:48px; border-radius:50%; background:rgba(0,102,255,0.15); display:flex; align-items:center; justify-content:center; color:var(--accent-primary); font-size:1.2rem; font-weight:700;">${escapeHTML((t.name || 'C')[0])}</div>
          `}
          <div>
            <div style="font-weight: 700; color: var(--text-main); font-size: 1.02rem;">${escapeHTML(t.name)}</div>
            <div style="font-size: 0.82rem; color: var(--accent-primary);">${escapeHTML(t.roleCompany || 'Client')}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Toast Notification System
 */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconClass = "ri-information-line";
  if (type === "success") iconClass = "ri-checkbox-circle-line";
  if (type === "error") iconClass = "ri-error-warning-line";

  toast.innerHTML = `<i class="${iconClass}" style="font-size: 1.2rem;"></i> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * INLINE LIGHTBOX VIDEO PLAYER MODAL
 */
function initInlineVideoModalMarkup() {
  if (document.getElementById("inline-video-modal")) return;

  const modalHtml = `
    <div class="modal-overlay" id="inline-video-modal" style="z-index: 2500; backdrop-filter: blur(20px);">
      <div class="modal-content" style="max-width: 900px; background: rgba(12, 13, 18, 0.95); border: 1px solid var(--border-color); padding: 0; overflow: hidden; position: relative;">
        
        <!-- Top Control Bar -->
        <div style="padding: 14px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge badge-accent" id="lightbox-category">Category</span>
            <span class="badge badge-ratio" id="lightbox-ratio">16:9</span>
          </div>
          <button class="modal-close-btn" onclick="closeInlineVideoModal()" aria-label="Close Video Player"><i class="ri-close-line"></i></button>
        </div>

        <!-- Video Player Container -->
        <div id="lightbox-player-container" style="background: #000; display: flex; align-items: center; justify-content: center; position: relative; min-height: 280px;">
          <!-- Dynamically injected stream -->
        </div>

        <!-- Video Meta & Action Footer -->
        <div style="padding: 20px 24px;">
          <h2 id="lightbox-title" style="font-size: 1.3rem; margin-bottom: 8px; color: #fff;">Project Title</h2>
          
          <div style="display: flex; align-items: center; gap: 18px; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; flex-wrap: wrap;">
            <span><i class="ri-user-line"></i> Client: <strong id="lightbox-client" style="color:var(--text-main)">Client</strong></span>
            <span><i class="ri-calendar-line"></i> Released: <strong id="lightbox-date" style="color:var(--text-main)">2026</strong></span>
          </div>

          <p id="lightbox-desc" style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 16px;">
            Project description...
          </p>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 14px;">
            <div id="lightbox-tags" style="display: flex; gap: 6px; flex-wrap: wrap;">
              <!-- Software tags -->
            </div>

            <div style="display: flex; gap: 10px;">
              <a href="https://wa.me/919369876866" target="_blank" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); border: none;">
                <i class="ri-whatsapp-line"></i> Hire / WhatsApp
              </a>
              <a href="contact.html" class="btn btn-secondary btn-sm">Contact Form</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeInlineVideoModal();
  });
}

async function openInlineVideoModal(target) {
  initInlineVideoModalMarkup();
  const modal = document.getElementById("inline-video-modal");
  const playerContainer = document.getElementById("lightbox-player-container");
  const modalContent = modal?.querySelector(".modal-content");

  if (!modal || !playerContainer) return;

  let video = null;

  if (typeof target === "object" && target !== null) {
    video = target;
  } else {
    let videos = (typeof allVideos !== "undefined" && allVideos.length > 0) ? allVideos : JSON.parse(localStorage.getItem("sd_portfolio_videos") || "[]");
    video = videos.find(v => v.id === target);

    if (!video) {
      try {
        const res = await API.getVideo(target);
        if (res && res.success && res.video) video = res.video;
      } catch (e) {}
    }
  }

  if (!video) {
    showToast("Video project details not found.", "error");
    return;
  }

  const isVertical = (video.aspectRatio === "9:16" || (video.category || "").toLowerCase().includes("reel") || (video.category || "").toLowerCase().includes("short"));
  if (modalContent) {
    modalContent.style.maxWidth = isVertical ? "420px" : "880px";
  }

  // Populate Metadata
  document.getElementById("lightbox-title").textContent = video.title || "Project Showcase";
  document.getElementById("lightbox-category").textContent = video.category || "General";
  document.getElementById("lightbox-ratio").textContent = video.aspectRatio || (isVertical ? "9:16" : "16:9");
  document.getElementById("lightbox-client").textContent = video.client || "Client";
  document.getElementById("lightbox-date").textContent = (video.uploadDate || "").split("T")[0] || "2026";
  document.getElementById("lightbox-desc").textContent = video.description || "High-impact video editing project by sachindhisle.";

  const tagsEl = document.getElementById("lightbox-tags");
  if (tagsEl) {
    const tags = video.tags && video.tags.length > 0 ? video.tags : ["DaVinci Resolve", "Color Grading"];
    tagsEl.innerHTML = tags.map(t => `<span class="badge" style="background:rgba(255,255,255,0.06); font-size:0.75rem;">${escapeHTML(t)}</span>`).join("");
  }

  // Multi-Engine Stream Player Loader
  const rawUrl = video.driveVideoUrl || "";
  const fileId = extractDriveFileId(rawUrl);

  if (fileId) {
    const iframePreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const driveDirectUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    playerContainer.innerHTML = `
      <div style="width: 100%; position: relative; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <iframe src="${escapeHTML(iframePreviewUrl)}" 
                style="width: 100%; aspect-ratio: ${isVertical ? '9/16' : '16/9'}; height: ${isVertical ? '540px' : '460px'}; max-height: 70vh; border: none; border-radius: var(--radius-md);" 
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media" 
                allowfullscreen>
        </iframe>
        
        <div style="padding: 10px 16px; width: 100%; background: rgba(255,255,255,0.03); border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted);">
          <span><i class="ri-shield-check-line" style="color:var(--success)"></i> Google Drive Stream</span>
          <a href="${escapeHTML(driveDirectUrl)}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 4px 12px; font-size: 0.78rem;">
            Open in Google Drive <i class="ri-external-link-line"></i>
          </a>
        </div>
      </div>
    `;
  } else if (rawUrl.includes("youtube.com") || rawUrl.includes("youtu.be")) {
    const match = rawUrl.match(/v=([a-zA-Z0-9_-]+)/) || rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    const ytId = match ? match[1] : "";
    playerContainer.innerHTML = `
      <div style="width: 100%; aspect-ratio: 16/9; background: #000;">
        <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" style="width: 100%; height: 100%; border: none;" allow="autoplay; fullscreen" allowfullscreen></iframe>
      </div>
    `;
  } else if (rawUrl.startsWith("http")) {
    playerContainer.innerHTML = `
      <div style="width: 100%; background: #000;">
        <video controls autoplay playsinline style="width: 100%; max-height: 75vh; object-fit: contain;">
          <source src="${escapeHTML(rawUrl)}" type="video/mp4">
          Your browser does not support HTML5 video playback.
        </video>
      </div>
    `;
  } else {
    playerContainer.innerHTML = `<div style="padding: 40px; color: var(--text-muted);">No video stream URL available for this project.</div>`;
  }

  modal.classList.add("active");
}

function closeInlineVideoModal() {
  const modal = document.getElementById("inline-video-modal");
  const playerContainer = document.getElementById("lightbox-player-container");
  if (!modal) return;

  if (playerContainer) {
    playerContainer.innerHTML = "";
  }

  modal.classList.remove("active");
}

/**
 * Service Worker Registration
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration skipped:', err);
      });
    });
  }
}
