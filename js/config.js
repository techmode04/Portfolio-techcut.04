/* ==========================================================================
   SACHIN DHISLE PORTFOLIO - CONFIGURATION & PRODUCTION DATABASE
   Brand Name: sachindhisle
   ========================================================================== */

const CONFIG = {
  // Deployed Google Apps Script Web App URL
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzNck7RRrXefv7wo0TGFMDsT63WpIYjETV-ffD7TrzLqxS_tO1VRnzPuCObxPm4gW8feQ/exec",
  
  // App info
  SITE_NAME: "sachindhisle",
  SITE_TAGLINE: "Professional Video Editor & Motion Designer",
  CONTACT_EMAIL: "hey.sachindhisle04@gmail.com",
  WHATSAPP_NUMBER: "919369876866",

  DEFAULT_VIDEOS: []
};

(function initStorage() {
  if (!localStorage.getItem("sd_portfolio_videos")) {
    localStorage.setItem("sd_portfolio_videos", JSON.stringify(CONFIG.DEFAULT_VIDEOS));
  }
  if (!localStorage.getItem("sd_portfolio_messages")) {
    localStorage.setItem("sd_portfolio_messages", JSON.stringify([]));
  }
})();
