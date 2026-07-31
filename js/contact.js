/* ==========================================================================
   SACHIN DHISLE PORTFOLIO - CONTACT FORM & WHATSAPP LOGIC
   Form validation, rate-limiting, submit to Apps Script backend
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contact-form");
  const whatsappBtn = document.getElementById("whatsapp-direct-btn");

  if (contactForm) {
    contactForm.addEventListener("submit", handleContactSubmit);
  }

  if (whatsappBtn) {
    whatsappBtn.addEventListener("click", openWhatsApp);
  }
});

let lastSubmitTime = 0;

async function handleContactSubmit(e) {
  e.preventDefault();

  // Rate Limiting Protection (10 seconds between submissions)
  const now = Date.now();
  if (now - lastSubmitTime < 10000) {
    showToast("Please wait a few seconds before sending another message.", "warning");
    return;
  }

  const nameInput = document.getElementById("contact-name");
  const emailInput = document.getElementById("contact-email");
  const messageInput = document.getElementById("contact-message");
  const submitBtn = document.getElementById("contact-submit-btn");

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const message = messageInput.value.trim();

  // Input Validation & XSS Sanity
  if (!name || !email || !message) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  if (!validateEmail(email)) {
    showToast("Please enter a valid email address.", "error");
    return;
  }

  // Set Button Loading State
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Sending...`;

  try {
    const res = await API.submitContact({ name, email, message });

    if (res.success) {
      showToast(res.message || "Message sent successfully!", "success");
      contactForm.reset();
      lastSubmitTime = Date.now();
    } else {
      showToast(res.message || "Failed to send message. Please try again.", "error");
    }
  } catch (error) {
    console.error("Submission error:", error);
    showToast("An error occurred while submitting. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

function openWhatsApp() {
  const name = document.getElementById("contact-name")?.value.trim() || "";
  const message = document.getElementById("contact-message")?.value.trim() || "";

  let text = `Hi Sachin! I'm reaching out from your portfolio website.`;
  if (name) text += ` My name is ${name}.`;
  if (message) text += ` Project Inquiry: "${message}"`;

  const phone = CONFIG.WHATSAPP_NUMBER || "919876543210";
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
