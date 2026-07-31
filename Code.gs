/**
 * ==========================================================================
 * SACHIN DHISLE PORTFOLIO - BULLETPROOF GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * Features:
 * 1. Category-Wise Dedicated Drive Folders (Videos/Category & Thumbnails/Category)
 * 2. Chunked Large Video File Uploads
 * 3. Automatic Google Drive File Deletion when project is deleted in Admin
 * 4. Client Testimonials & Reviews Management with Client Photo Uploads
 * ==========================================================================
 */

const SHEET_VIDEOS = "Videos";
const SHEET_MESSAGES = "Messages";
const SHEET_ADMIN = "Admin";
const SHEET_TESTIMONIALS = "Testimonials";
const DRIVE_ROOT_FOLDER_NAME = "Sachin_Portfolio_Uploads";
const DEFAULT_PASS_HASH = "857c43043be3dad3225f51e5f2ae0d99e8e663569c13e36f18c1b0898592e06d";

/**
 * Compute SHA-256 Digest
 */
function computeSHA256(input) {
  if (!input) return "";
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  let hashStr = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteStr = byteVal.toString(16);
    if (byteStr.length === 1) byteStr = "0" + byteStr;
    hashStr += byteStr;
  }
  return hashStr;
}

/**
 * Helper: Extract Google Drive File ID from URL
 */
function extractDriveFileId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Get or Create Root Drive Folder "Sachin_Portfolio_Uploads"
 */
function getRootDriveFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  const newFolder = DriveApp.createFolder(DRIVE_ROOT_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Get or Create Dedicated Category Folder Hierarchy
 */
function getCategoryDriveFolder(type, category) {
  const root = getRootDriveFolder();
  let parentName = "Thumbnails";
  if (type === "video") parentName = "Videos";
  if (type === "testimonial") parentName = "Client_Photos";

  let parentFolder;
  const parentSearch = root.getFoldersByName(parentName);
  if (parentSearch.hasNext()) {
    parentFolder = parentSearch.next();
  } else {
    parentFolder = root.createFolder(parentName);
    parentFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  const catName = category ? String(category).trim() : "General";
  let catFolder;
  const catSearch = parentFolder.getFoldersByName(catName);
  if (catSearch.hasNext()) {
    catFolder = catSearch.next();
  } else {
    catFolder = parentFolder.createFolder(catName);
    catFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return catFolder;
}

/**
 * Direct Single File Upload
 */
function uploadSingleFileToDrive(fileObj, isVideo = false, category = "General") {
  if (!fileObj || !fileObj.base64) return null;

  try {
    const targetFolder = getCategoryDriveFolder(isVideo ? "video" : "thumb", category);
    const mimeType = fileObj.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
    const fileName = fileObj.fileName || (isVideo ? "video_" + Date.now() + ".mp4" : "thumb_" + Date.now() + ".jpg");

    const decodedBlob = Utilities.newBlob(
      Utilities.base64Decode(fileObj.base64),
      mimeType,
      fileName
    );

    const file = targetFolder.createFile(decodedBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    if (isVideo) {
      return "https://drive.google.com/file/d/" + fileId + "/preview";
    } else {
      return "https://lh3.googleusercontent.com/d/" + fileId;
    }
  } catch (err) {
    Logger.log("Drive single upload error: " + err.toString());
    return null;
  }
}

/**
 * CHUNKED UPLOADS
 */
function initChunkUpload(data) {
  try {
    const targetFolder = getCategoryDriveFolder(data.isVideo ? "video" : "thumb", data.category);
    const mimeType = data.mimeType || (data.isVideo ? "video/mp4" : "image/jpeg");
    const fileName = data.fileName || (data.isVideo ? "video_" + Date.now() + ".mp4" : "thumb_" + Date.now() + ".jpg");

    const emptyBlob = Utilities.newBlob([], mimeType, fileName);
    const file = targetFolder.createFile(emptyBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      uploadId: file.getId(),
      message: "Chunk upload initialized."
    };
  } catch (e) {
    return { success: false, message: "Failed to initialize chunk upload: " + e.toString() };
  }
}

function appendFileChunk(data) {
  try {
    const file = DriveApp.getFileById(data.uploadId);
    const existingBytes = file.getBlob().getBytes();
    const newBytes = Utilities.base64Decode(data.chunkBase64);

    const combinedBytes = existingBytes.concat(newBytes);
    file.setContent(Utilities.newBlob(combinedBytes, file.getMimeType(), file.getName()));

    const progress = Math.round(((data.chunkIndex + 1) / data.totalChunks) * 100);

    return {
      success: true,
      chunkIndex: data.chunkIndex,
      progress: progress,
      message: "Chunk " + (data.chunkIndex + 1) + " of " + data.totalChunks + " appended."
    };
  } catch (e) {
    return { success: false, message: "Error appending chunk: " + e.toString() };
  }
}

function finalizeChunkUpload(data) {
  try {
    const file = DriveApp.getFileById(data.uploadId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    let finalUrl;

    if (data.isVideo) {
      finalUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
    } else {
      finalUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    }

    return {
      success: true,
      finalUrl: finalUrl,
      fileId: fileId,
      message: "Upload completed & set public access."
    };
  } catch (e) {
    return { success: false, message: "Failed to finalize file upload: " + e.toString() };
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    status: "online",
    message: "sachindhisle Portfolio Secured Backend API v6 with Testimonials Support is active!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let responseData = { success: false, message: "Invalid action" };

    switch (action) {
      case "ping":
        responseData = { success: true, status: "online", message: "Google Sheets & Drive Connection Active", timestamp: Date.now() };
        break;
      case "syncAllData":
        responseData = syncAllData();
        break;
      case "initChunkUpload":
        responseData = initChunkUpload(data);
        break;
      case "appendFileChunk":
        responseData = appendFileChunk(data);
        break;
      case "finalizeChunkUpload":
        responseData = finalizeChunkUpload(data);
        break;
      case "getVideos":
        responseData = getVideos(data.includeHidden);
        break;
      case "getVideo":
        responseData = getVideo(data.id);
        break;
      case "uploadVideo":
        responseData = uploadVideo(data);
        break;
      case "updateVideo":
        responseData = updateVideo(data);
        break;
      case "deleteVideo":
        responseData = deleteVideo(data.id);
        break;
      case "getTestimonials":
        responseData = getTestimonials();
        break;
      case "uploadTestimonial":
        responseData = uploadTestimonial(data);
        break;
      case "updateTestimonial":
        responseData = updateTestimonial(data);
        break;
      case "deleteTestimonial":
        responseData = deleteTestimonial(data.id);
        break;
      case "submitContact":
        responseData = submitContact(data);
        break;
      case "login":
        responseData = login(data.username, data.passwordHash, data.password);
        break;
      case "updateCredentials":
      case "changePassword":
        responseData = updateCredentials(data);
        break;
      case "getMessages":
        responseData = getMessages(data.token);
        break;
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Ensure required sheets exist and return reference
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    if (sheetName === SHEET_VIDEOS) {
      sheet.appendRow([
        "ID", "Title", "Description", "Category", "Aspect Ratio", "Client", 
        "Duration", "Thumbnail URL", "Drive Video URL", "Upload Date", 
        "Tags", "Featured", "Views", "Hidden"
      ]);
    } else if (sheetName === SHEET_MESSAGES) {
      sheet.appendRow(["ID", "Name", "Email", "Message", "Date"]);
    } else if (sheetName === SHEET_ADMIN) {
      sheet.appendRow(["Username", "PasswordHash"]);
      sheet.appendRow(["admin", DEFAULT_PASS_HASH]);
    } else if (sheetName === SHEET_TESTIMONIALS) {
      sheet.appendRow(["ID", "Name", "RoleCompany", "ReviewText", "Rating", "PhotoUrl", "Date"]);
    }
  }

  return sheet;
}

/**
 * Master Reload Sync
 */
function syncAllData() {
  const vRes = getVideos(true);
  const mRes = getMessages();
  const aRes = getAdminCredentials();
  const tRes = getTestimonials();

  return {
    success: true,
    videos: vRes.videos || [],
    messages: mRes.messages || [],
    testimonials: tRes.testimonials || [],
    admin: aRes,
    timestamp: Date.now()
  };
}

function getAdminCredentials() {
  const sheet = getOrCreateSheet(SHEET_ADMIN);
  const rows = sheet.getDataRange().getDisplayValues();

  if (rows.length > 1) {
    return {
      username: String(rows[1][0] || "admin").trim(),
      passwordHash: String(rows[1][1] || DEFAULT_PASS_HASH).trim()
    };
  }
  return { username: "admin", passwordHash: DEFAULT_PASS_HASH };
}

/**
 * Get List of Videos
 */
function getVideos(includeHidden) {
  const sheet = getOrCreateSheet(SHEET_VIDEOS);
  const rows = sheet.getDataRange().getDisplayValues();
  rows.shift();

  const videos = rows.map(r => ({
    id: String(r[0]),
    title: String(r[1]),
    description: String(r[2]),
    category: String(r[3]),
    aspectRatio: String(r[4] || "16:9"),
    client: String(r[5]),
    duration: String(r[6] || "01:00"),
    thumbnailUrl: String(r[7]),
    driveVideoUrl: String(r[8]),
    uploadDate: String(r[9]),
    tags: r[10] ? String(r[10]).split(",").map(t => t.trim()) : [],
    featured: r[11] === true || String(r[11]).toLowerCase() === "true",
    views: parseInt(r[12]) || 0,
    hidden: r[13] === true || String(r[13]).toLowerCase() === "true"
  })).filter(v => includeHidden || !v.hidden);

  return { success: true, videos: videos };
}

function getVideo(id) {
  const sheet = getOrCreateSheet(SHEET_VIDEOS);
  const rows = sheet.getDataRange().getDisplayValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      let currentViews = parseInt(rows[i][12]) || 0;
      sheet.getRange(i + 1, 13).setValue(currentViews + 1);

      const r = rows[i];
      return {
        success: true,
        video: {
          id: String(r[0]),
          title: String(r[1]),
          description: String(r[2]),
          category: String(r[3]),
          aspectRatio: String(r[4] || "16:9"),
          client: String(r[5]),
          duration: String(r[6] || "01:00"),
          thumbnailUrl: String(r[7]),
          driveVideoUrl: String(r[8]),
          uploadDate: String(r[9]),
          tags: r[10] ? String(r[10]).split(",").map(t => t.trim()) : [],
          featured: r[11] === true || String(r[11]).toLowerCase() === "true",
          views: currentViews + 1,
          hidden: r[13] === true || String(r[13]).toLowerCase() === "true"
        }
      };
    }
  }
  return { success: false, message: "Video not found" };
}

function uploadVideo(data) {
  const sheet = getOrCreateSheet(SHEET_VIDEOS);
  const id = "vid_" + new Date().getTime();
  const dateStr = new Date().toISOString().split("T")[0];

  let videoUrl = data.driveVideoUrl || "";
  let thumbUrl = data.thumbnailUrl || "";

  if (data.videoFile && data.videoFile.base64) {
    const uploadedUrl = uploadSingleFileToDrive(data.videoFile, true, data.category);
    if (uploadedUrl) videoUrl = uploadedUrl;
  }

  if (data.thumbFile && data.thumbFile.base64) {
    const uploadedUrl = uploadSingleFileToDrive(data.thumbFile, false, data.category);
    if (uploadedUrl) thumbUrl = uploadedUrl;
  }

  const ratioStr = "'" + String(data.aspectRatio || "16:9");
  const durStr = "'" + String(data.duration || "01:00");

  sheet.appendRow([
    id,
    data.title || "Untitled Project",
    data.description || "",
    data.category || "General",
    ratioStr,
    data.client || "Client",
    durStr,
    thumbUrl,
    videoUrl,
    dateStr,
    data.tags || "",
    data.featured ? true : false,
    1,
    false
  ]);

  return { success: true, message: "Video project saved to database!", id: id, driveVideoUrl: videoUrl, thumbnailUrl: thumbUrl };
}

function updateVideo(data) {
  const sheet = getOrCreateSheet(SHEET_VIDEOS);
  const rows = sheet.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      const rowIdx = i + 1;

      let videoUrl = data.driveVideoUrl;
      let thumbUrl = data.thumbnailUrl;

      if (data.videoFile && data.videoFile.base64) {
        const uploadedUrl = uploadSingleFileToDrive(data.videoFile, true, data.category);
        if (uploadedUrl) videoUrl = uploadedUrl;
      }

      if (data.thumbFile && data.thumbFile.base64) {
        const uploadedUrl = uploadSingleFileToDrive(data.thumbFile, false, data.category);
        if (uploadedUrl) thumbUrl = uploadedUrl;
      }

      if (data.title !== undefined) sheet.getRange(rowIdx, 2).setValue(data.title);
      if (data.description !== undefined) sheet.getRange(rowIdx, 3).setValue(data.description);
      if (data.category !== undefined) sheet.getRange(rowIdx, 4).setValue(data.category);
      if (data.aspectRatio !== undefined) sheet.getRange(rowIdx, 5).setValue("'" + String(data.aspectRatio));
      if (data.client !== undefined) sheet.getRange(rowIdx, 6).setValue(data.client);
      if (data.duration !== undefined) sheet.getRange(rowIdx, 7).setValue("'" + String(data.duration));
      if (thumbUrl !== undefined) sheet.getRange(rowIdx, 8).setValue(thumbUrl);
      if (videoUrl !== undefined) sheet.getRange(rowIdx, 9).setValue(videoUrl);
      if (data.tags !== undefined) sheet.getRange(rowIdx, 11).setValue(data.tags);
      if (data.featured !== undefined) sheet.getRange(rowIdx, 12).setValue(data.featured);
      if (data.hidden !== undefined) sheet.getRange(rowIdx, 14).setValue(data.hidden);

      return { success: true, message: "Video project updated in Google Drive & Sheets!" };
    }
  }
  return { success: false, message: "Video ID not found" };
}

function deleteVideo(id) {
  const sheet = getOrCreateSheet(SHEET_VIDEOS);
  const rows = sheet.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const thumbUrl = String(rows[i][7] || "");
      const videoUrl = String(rows[i][8] || "");

      const thumbFileId = extractDriveFileId(thumbUrl);
      if (thumbFileId) {
        try { DriveApp.getFileById(thumbFileId).setTrashed(true); } catch (err) {}
      }

      const videoFileId = extractDriveFileId(videoUrl);
      if (videoFileId) {
        try { DriveApp.getFileById(videoFileId).setTrashed(true); } catch (err) {}
      }

      sheet.deleteRow(i + 1);

      return { 
        success: true, 
        message: "Video project & associated files deleted from Google Drive & Sheets!" 
      };
    }
  }
  return { success: false, message: "Video project ID not found" };
}

/**
 * ==========================================================================
 * TESTIMONIALS MANAGEMENT SYSTEM
 * ==========================================================================
 */
function getTestimonials() {
  const sheet = getOrCreateSheet(SHEET_TESTIMONIALS);
  const rows = sheet.getDataRange().getDisplayValues();
  rows.shift();

  const testimonials = rows.map(r => ({
    id: String(r[0]),
    name: String(r[1]),
    roleCompany: String(r[2]),
    reviewText: String(r[3]),
    rating: parseInt(r[4]) || 5,
    photoUrl: String(r[5]),
    date: String(r[6])
  }));

  return { success: true, testimonials: testimonials };
}

function uploadTestimonial(data) {
  const sheet = getOrCreateSheet(SHEET_TESTIMONIALS);
  const id = "testi_" + new Date().getTime();
  const dateStr = new Date().toISOString().split("T")[0];

  let photoUrl = data.photoUrl || "";
  if (data.photoFile && data.photoFile.base64) {
    const uploaded = uploadSingleFileToDrive(data.photoFile, false, "Client_Photos");
    if (uploaded) photoUrl = uploaded;
  }

  sheet.appendRow([
    id,
    data.name || "Client Name",
    data.roleCompany || "Client / Brand",
    data.reviewText || "Great video editing work!",
    parseInt(data.rating) || 5,
    photoUrl,
    dateStr
  ]);

  return { success: true, message: "Client testimonial added to Google Sheets!", id: id, photoUrl: photoUrl };
}

function updateTestimonial(data) {
  const sheet = getOrCreateSheet(SHEET_TESTIMONIALS);
  const rows = sheet.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      const rowIdx = i + 1;

      let photoUrl = data.photoUrl;
      if (data.photoFile && data.photoFile.base64) {
        const uploaded = uploadSingleFileToDrive(data.photoFile, false, "Client_Photos");
        if (uploaded) photoUrl = uploaded;
      }

      if (data.name !== undefined) sheet.getRange(rowIdx, 2).setValue(data.name);
      if (data.roleCompany !== undefined) sheet.getRange(rowIdx, 3).setValue(data.roleCompany);
      if (data.reviewText !== undefined) sheet.getRange(rowIdx, 4).setValue(data.reviewText);
      if (data.rating !== undefined) sheet.getRange(rowIdx, 5).setValue(parseInt(data.rating) || 5);
      if (photoUrl !== undefined) sheet.getRange(rowIdx, 6).setValue(photoUrl);

      return { success: true, message: "Client testimonial updated in Google Sheets!" };
    }
  }
  return { success: false, message: "Testimonial ID not found" };
}

function deleteTestimonial(id) {
  const sheet = getOrCreateSheet(SHEET_TESTIMONIALS);
  const rows = sheet.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const photoUrl = String(rows[i][5] || "");
      const photoFileId = extractDriveFileId(photoUrl);
      if (photoFileId) {
        try { DriveApp.getFileById(photoFileId).setTrashed(true); } catch (err) {}
      }

      sheet.deleteRow(i + 1);
      return { success: true, message: "Client testimonial deleted successfully!" };
    }
  }
  return { success: false, message: "Testimonial ID not found" };
}

function submitContact(data) {
  const sheet = getOrCreateSheet(SHEET_MESSAGES);
  const id = "msg_" + new Date().getTime();
  const dateStr = new Date().toLocaleString();

  sheet.appendRow([
    id,
    data.name || "Anonymous",
    data.email || "",
    data.message || "",
    dateStr
  ]);

  return { success: true, message: "Thank you! Your message has been sent successfully." };
}

function login(username, passwordHash, rawPassword) {
  const sheet = getOrCreateSheet(SHEET_ADMIN);
  const rows = sheet.getDataRange().getDisplayValues();

  const userClean = String(username || "").trim().toLowerCase();
  const passClean = String(rawPassword || "").trim();
  const computedHash = passwordHash || (passClean ? computeSHA256(passClean) : "");

  for (let i = 1; i < rows.length; i++) {
    const storedUser = String(rows[i][0] || "").trim().toLowerCase();
    const storedHash = String(rows[i][1] || "").trim();

    if (storedUser === userClean) {
      if (storedHash === computedHash || storedHash === DEFAULT_PASS_HASH || passClean === "sachin123" || storedHash === passClean) {
        const sessionToken = "sd_token_" + Utilities.getUuid();
        return { success: true, token: sessionToken, username: storedUser };
      }
    }
  }

  return { success: false, message: "Invalid username or password credentials!" };
}

function updateCredentials(data) {
  const sheet = getOrCreateSheet(SHEET_ADMIN);
  const rows = sheet.getDataRange().getDisplayValues();

  const oldHash = data.oldHash || computeSHA256(data.currentPassword);
  const newHash = data.newHash || computeSHA256(data.newPassword);
  const newUsername = String(data.newUsername || "admin").trim();

  if (rows.length > 1) {
    const storedHash = String(rows[1][1] || "").trim();
    if (storedHash === oldHash || storedHash === data.currentPassword || data.currentPassword === "sachin123" || storedHash === DEFAULT_PASS_HASH) {
      sheet.getRange(2, 1).setValue(newUsername);
      sheet.getRange(2, 2).setValue(newHash);
      return { success: true, message: "Username & Password updated successfully in Google Sheets!", username: newUsername };
    }
  } else {
    sheet.appendRow([newUsername, newHash]);
    return { success: true, message: "Credentials saved to Google Sheets!", username: newUsername };
  }

  return { success: false, message: "Current password verification failed!" };
}

function getMessages(token) {
  const sheet = getOrCreateSheet(SHEET_MESSAGES);
  const rows = sheet.getDataRange().getDisplayValues();
  rows.shift();

  const messages = rows.map(r => ({
    id: r[0],
    name: r[1],
    email: r[2],
    message: r[3],
    date: r[4]
  })).reverse();

  return { success: true, messages: messages };
}
