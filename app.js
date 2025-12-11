let SQL = null;
let db = null;
const blobUrlCache = new Map();

//This part is needed ot initilize database and set up database schema
async function initDB() {
  SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
  });

  db = new SQL.Database();
  createSchema();
  seedDemoVideos();
}

function createSchema() {
  const schema = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      filename TEXT,
      thumbnail TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      views INTEGER DEFAULT 0,
      FOREIGN KEY (uploaded_by) REFERENCES users(username)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      comment TEXT NOT NULL,
      commented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos(id),
      FOREIGN KEY (username) REFERENCES users(username)
    );
  `;
  db.run(schema);
}

function seedDemoVideos() {
  const stmt = db.prepare(`
    INSERT INTO users (username) VALUES (?)
  `);
  stmt.run(["Anonymous"]);
  stmt.run(["Sheep"]);
  stmt.run(["Justin"]);
  stmt.free();

  const insertVid = db.prepare(`
    INSERT INTO videos (title, description, filename, thumbnail, uploaded_by, uploaded_at, views)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertVid.run([
    "Biscuit",
    "Old video exploring what a biscuit really is.",
    "videos/video1.mp4",
    "thumbnails/Thumbnail1.png",
    "Justin",
    "2025-11-29",
    "7"
  ]);
  insertVid.run([
    "Gaming Clip",
    "Playing Nuclear Nightmare",
    "videos/video2.mp4",
    "",
    "Sheep",
    "2025-12-4",
    "4"
  ]);
  insertVid.run([
    "Ghost Spotted",
    "I found a real ghost in my room!",
    "videos/video3.mp4",
    "thumbnails/Thumbnail2.png",
    "Justin",
    "2025-11-21",
    "1"
  ]);
    insertVid.run([
    "Breaking Jalopy",
    "I broke a world record by being an idiot.",
    "videos/video4.mp4",
    "thumbnails/Thumbnail4.png",
    "Justin",
    "2025-12-6",
    "23"
  ]);
    insertVid.run([
    "Coding",
    "Joke about programing.",
    "videos/video5.mp4",
    "thumbnails/Thumbnail5.png",
    "Justin",
    "2025-12-7",
    "13"
  ]);
    insertVid.run([
    "Time and Resources",
    "Learn more about the limit!",
    "videos/video6.mp4",
    "thumbnails/Thumbnail6.png",
    "Justin",
    "2025-12-5",
    "31"
  ]);
    insertVid.run([
    "Crumple Animation",
    "I animated a can getting crushed!",
    "videos/video7.mp4",
    "thumbnails/Thumbnail7.png",
    "Justin",
    "2025-11-11",
    "17"
  ]);
    insertVid.run([
    "Man Skates Away While Talking About A Hockey Stick",
    "I skate around a rink with no context",
    "videos/video8.mp4",
    "",
    "Justin",
    "2025-11-10",
    "9"
  ]);
    insertVid.run([
    "Promesses Cover - Guitar",
    "I play promesses by Bigflo et Oli on guitar",
    "videos/video9.mp4",
    "",
    "Justin",
    "2025-11-11",
    "23"
  ]);
  
  insertVid.free();
}

//This part was a pain to make for no reason
//this is where the grid is rendered with rows and columns. 
function renderGrid({ search = "", sort = "uploaded_at DESC" } = {}) {
  const grid = document.getElementById("video-grid");
  grid.innerHTML = "";

  const safeSearch = search.replace(/'/g, "''");
  const q = `
    SELECT id, title, description, filename, thumbnail, views, uploaded_at
    FROM videos
    WHERE title LIKE '%${safeSearch}%' OR description LIKE '%${safeSearch}%'
    ORDER BY ${sort}
  `;
  const result = db.exec(q);
  if (!result || !result[0] || !result[0].values || result[0].values.length === 0) {
    grid.innerHTML = "<p style='padding:16px;color:#666'>No videos found.</p>";
    return;
  }

  const rows = result[0].values;
  const cols = result[0].columns;

  rows.forEach(vals => {
    const row = {};
    cols.forEach((c, i) => row[c] = vals[i]);

    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = row.id;

    const thumbnailUrl = blobUrlCache.get(`thumbnail_${row.id}`) || row.thumbnail || "";
    const thumbHtml = thumbnailUrl
    //I dont know why the compiler compains here but it works
      ? `<img class="thumbnail-thumb" src="${thumbnailUrl}" alt="${escapeHtml(row.title)} thumbnail">`
      : `<div class="thumb-placeholder">▶</div>`;

    card.innerHTML = `
      <div class="thumb-wrap" data-id="${row.id}">
        ${thumbHtml}
      </div>
      <div class="meta">
        <h4>${escapeHtml(row.title)}</h4>
        <p>${escapeHtml(row.description || "")}</p>
        <div class="stats">
          <span>${row.views} views</span>
          <span>&middot;</span>
          <span>${formatDate(row.uploaded_at)}</span>
        </div>
      </div>
    `;

    const thumbWrap = card.querySelector(".thumb-wrap");
    thumbWrap.style.cursor = "pointer";
    thumbWrap.addEventListener("click", () => openPlayer(row.id));

    grid.appendChild(card);
  });
}

/* ---------- Player Modal ---------- */
function openPlayer(videoId) {
  const player = document.getElementById("player-video");
  player.pause();
  player.removeAttribute("src");
  player.load();

  const res = db.exec(`SELECT id,title,description,filename,thumbnail,views,uploaded_by,uploaded_at FROM videos WHERE id=${videoId};`);
  if (!res || !res[0] || !res[0].values || res[0].values.length === 0) return;
  const v = res[0].values[0];
  const cols = res[0].columns;
  const row = {};
  cols.forEach((c,i)=>row[c]=v[i]);

  document.getElementById("player-title").textContent = row.title;
  document.getElementById("player-desc").textContent = row.description || "";
  document.getElementById("player-views").textContent = `${row.views} views`;
  document.getElementById("uploader-name").textContent = row.uploaded_by || "Anonymous";
  document.getElementById("uploaded-date").textContent = formatDate(row.uploaded_at);
  document.getElementById("uploader-avatar").textContent = (row.uploaded_by?.[0]||"A").toUpperCase();

  const videoUrl = blobUrlCache.get(`video_${row.id}`) || row.filename || "";
  player.src = videoUrl;
  if (blobUrlCache.has(`thumbnail_${row.id}`)) player.setAttribute("thumbnail", blobUrlCache.get(`thumbnail_${row.id}`));

  const modal = document.getElementById("player-modal");
  modal.classList.remove("hidden");

  player.addEventListener("play", function incrementViews() {
    db.run("UPDATE videos SET views=views+1 WHERE id=?;", [row.id]);
    player.removeEventListener("play", incrementViews);
    renderGridWrapper();
  });

  document.getElementById("close-modal").onclick = () => {
    player.pause();
    player.removeAttribute("src");
    modal.classList.add("hidden");
  };

  setupComments(videoId);
}

//Coments left on vidoes are set up
function setupComments(videoId) {
  const commentsList = document.getElementById("comments-list");
  const commentForm = document.getElementById("comment-form");
  const commentText = document.getElementById("comment-text");
  const sortSelect = document.getElementById("comment-sort");

  function renderComments() {
    const sort = ["commented_at DESC","commented_at ASC","username ASC"].includes(sortSelect.value)
//I dont know why the compiler compains here but it works part 2
      ? sortSelect.value : "commented_at DESC";

    const r = db.exec(`SELECT id, username, comment, commented_at FROM comments WHERE video_id=${videoId} ORDER BY ${sort};`);
    commentsList.innerHTML = "";
    if (!r || !r[0] || !r[0].values || r[0].values.length===0) {
      commentsList.innerHTML="<p class='muted'>No comments yet.</p>";
      return;
    }

    
    const cols = r[0].columns;
    r[0].values.forEach(vals=>{
      const row = {};
      cols.forEach((c,i)=>row[c]=vals[i]);
      const commentEl = document.createElement("div");
      commentEl.className = "comment";
      commentEl.innerHTML = `
        <div class="avatar">${escapeHtml((row.username||"A")[0]||"A")}</div>
        <div class="comment-body">
          <div class="comment-meta"><strong>${escapeHtml(row.username)}</strong> · <span class="muted">${formatDateTime(row.commented_at)}</span></div>
          <div class="comment-text">${escapeHtml(row.comment)}</div>
        </div>
      `;
      commentsList.appendChild(commentEl);
    });
  }

  renderComments();
  sortSelect.onchange = renderComments;
  commentForm.onsubmit = (ev)=>{
    ev.preventDefault();
    const text = commentText.value.trim();
    if(!text) return alert("Comment cannot be empty.");
    const username = document.getElementById("username").value || "Anonymous";
    db.run("INSERT INTO comments (video_id, username, comment) VALUES (?,?,?);",[videoId,username,text]);
    commentText.value="";
    renderComments();
  };
}
//I honestly dont think this is needed anymore since everything is local due to so many issues.
function attachUploadUI() {
  const toggle = document.getElementById("toggle-upload");
  const panel = document.getElementById("upload-panel");
  const form = document.getElementById("upload-form");
  const cancel = document.getElementById("cancel-upload");
  const previewSection = document.getElementById("upload-preview");
  const thumbnailPreview = document.getElementById("thumbnail-preview");
  const statusText = document.getElementById("upload-status");
  const progressFill = document.getElementById("upload-progress-fill");
  const uploadMsg = document.getElementById("upload-msg");
  const doUploadBtn = document.getElementById("do-upload");

  toggle.onclick = ()=>panel.classList.toggle("hidden");
  cancel.onclick = ()=>panel.classList.add("hidden");

  const thumbnailInput = document.getElementById("upload-thumbnail");
  thumbnailInput.onchange = ()=> {
    if(thumbnailInput.files && thumbnailInput.files[0]){
      const url = URL.createObjectURL(thumbnailInput.files[0]);
      thumbnailPreview.innerHTML=`<img src="${url}" alt="thumbnail preview">`;
      previewSection.classList.remove("hidden");
      statusText.textContent="thumbnail selected";
    }
  };

  const videoInput = document.getElementById("upload-file");
  videoInput.onchange = ()=> {
    previewSection.classList.remove("hidden");
    statusText.textContent=videoInput.files[0]?`${videoInput.files[0].name} selected`:"Ready to upload";
    progressFill.style.width="0%";
    uploadMsg.textContent="";
  };

  form.onsubmit=async (ev)=>{
    ev.preventDefault();
    const file = videoInput.files[0];
    const title = document.getElementById("upload-title").value.trim();
    if(!file || !title) return alert("Select a file and enter a title.");
    doUploadBtn.disabled=true;
    doUploadBtn.innerHTML=`Uploading <span class="spinner"></span>`;
    statusText.textContent="Reading files...";
    progressFill.style.width="2%";

    let thumbnailFile = thumbnailInput.files[0] || null;
    const username = document.getElementById("username").value || "Anonymous";

    // create blob URLs for session usage, there is no backend so it will all be lost upon exit.
    //Again, did this to makeit hostable on github.
    const videoURL = URL.createObjectURL(file);
    let thumbnailURL = thumbnailFile ? URL.createObjectURL(thumbnailFile) : "";
    if(thumbnailURL) thumbnailPreview.innerHTML=`<img src="${thumbnailURL}" alt="thumbnail preview">`;

    // metadata into DB
    const stmtU = db.prepare("INSERT OR IGNORE INTO users (username) VALUES (?)");
    stmtU.run([username]);
    stmtU.free();

    const stmt = db.prepare(`
      INSERT INTO videos (title, description, filename, thumbnail, uploaded_by)
      VALUES (?,?,?,?,?)
    `);
    stmt.run([
      title,
      document.getElementById("upload-desc").value,
      file.name,
      thumbnailURL,
      username
    ]);
    stmt.free();


    const lastIdRes = db.exec("SELECT last_insert_rowid() AS id;");
    const newId = lastIdRes[0].values[0][0];

    // store blob URLs in cache for in-memory playback, localstorage didnt work because it was way too small to hold videos.
    blobUrlCache.set(`video_${newId}`, videoURL);
    if(thumbnailURL) blobUrlCache.set(`thumbnail_${newId}`, thumbnailURL);

    // update UI
    progressFill.style.width="100%";
    statusText.textContent="Upload complete";
    uploadMsg.textContent="Video ready in the homepage.";
    doUploadBtn.innerHTML="Upload ✓";
    setTimeout(()=>{ doUploadBtn.innerHTML="Upload"; doUploadBtn.disabled=false; },800);
    document.getElementById("upload-title").value="";
    document.getElementById("upload-desc").value="";
    videoInput.value="";
    thumbnailInput.value="";
    previewSection.classList.add("hidden");
    panel.classList.add("hidden");
    renderGridWrapper();
    highlightCardById(newId);
  };
}


function escapeHtml(text){return (text||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function formatDate(ts){return new Date(ts).toLocaleDateString();}
function formatDateTime(ts){return new Date(ts).toLocaleString();}
function highlightCardById(id){
  const el=document.querySelector(`.card[data-id="${id}"]`);
  if(!el) return;
  el.classList.add("highlight");
  setTimeout(()=>el.classList.remove("highlight"),2000);
}



function attachUI(){
  document.getElementById("search").addEventListener("input",renderGridWrapper);
  document.getElementById("sort").addEventListener("change",renderGridWrapper);
  attachUploadUI();
}




function renderGridWrapper(){
  const search=document.getElementById("search").value.trim();
  const sort=document.getElementById("sort").value;
  const allowedSort=["uploaded_at DESC","views DESC","title ASC"];
  renderGrid({search, sort: allowedSort.includes(sort)?sort:"uploaded_at DESC"});
}



(async function main(){
  await initDB();
  attachUI();
  renderGridWrapper();
})();
