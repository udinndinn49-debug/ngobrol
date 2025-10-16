// Variabel global yang digunakan di seluruh skrip
const htmlEl = document.documentElement; // Akses elemen <html>

// ======= Simple local-storage forum implementation =======
const DEFAULT_CATS = ['Teknologi', 'Lifestyle', 'Edukasi', 'Hiburan', 'Umum'];

function loadData() {
  const raw = localStorage.getItem('obrolin_data');
  if (raw) return JSON.parse(raw);
  const data = { users: [], threads: [], notifications: [] };
  return data;
}
function saveData(d) { localStorage.setItem('obrolin_data', JSON.stringify(d)); }

let data = loadData();
let currentUser = JSON.parse(localStorage.getItem('obrolin_currentUser') || 'null');
const modalRoot = document.getElementById('modal-root');

// ===== UI helpers =====
function el(html) { const div = document.createElement('div'); div.innerHTML = html.trim(); return div.firstChild; }

// ===== Theme Toggler Logic (UPDATED) =====
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
let isDarkMode = htmlEl.classList.contains('dark-mode'); // Ambil status awal dari HTML

function applyTheme() {
  if (isDarkMode) {
    htmlEl.classList.add('dark-mode');
    themeIcon.textContent = '🌙';
    localStorage.setItem('obrolin_theme', 'dark');
  } else {
    htmlEl.classList.remove('dark-mode');
    themeIcon.textContent = '☀️';
    localStorage.setItem('obrolin_theme', 'light');
  }
}

// Atur ikon yang benar saat dimuat (setelah script di <head> menerapkan class)
themeIcon.textContent = isDarkMode ? '🌙' : '☀️';

themeToggleBtn.onclick = () => {
  isDarkMode = !isDarkMode;
  applyTheme();
};

// ===== Auth (very simple demo) =====
function renderTopProfile() {
  const root = document.getElementById('top-profile'); root.innerHTML = '';
  if (currentUser) {
    const prof = el(`<div style="display:flex;gap:8px;align-items:center"><div class="avatar">${currentUser.name[0].toUpperCase()}</div><div style="text-align:right"><div style="font-size:13px">${currentUser.name}</div><div style="font-size:12px;color:var(--muted)">${currentUser.email}</div></div><button class="btn secondary" id="logout">Keluar</button></div>`);
    root.appendChild(prof);
    prof.querySelector('#logout').onclick = () => { currentUser = null; localStorage.removeItem('obrolin_currentUser'); renderTopProfile(); renderComposer(); renderThreads(); }
  } else {
    const login = el(`<div style="display:flex;gap:6px;align-items:center"><button class="btn" id="open-login">Masuk / Daftar</button></div>`);
    root.appendChild(login);
    login.querySelector('#open-login').onclick = openAuthModal;
  }
}

function openAuthModal() {
  showModal(`<div class="card" style="max-width:420px; padding:20px;"><h3>Masuk atau Daftar</h3>
    <div style="display:grid;gap:10px;margin-top:12px">
      <input type="text" id="auth-name" placeholder="Nama (untuk daftar)" />
      <input type="text" id="auth-email" placeholder="Email" />
      <input type="password" id="auth-pass" placeholder="Kata sandi" />
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button class="btn secondary" id="close-auth">Tutup</button>
        <button class="btn secondary" id="do-signup">Daftar</button>
        <button class="btn" id="do-login">Masuk</button>
      </div>
    </div>
  </div>`);

  document.getElementById('close-auth').onclick = closeModal;
  document.getElementById('do-signup').onclick = () => {
    const name = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value;
    if (!name || !email || !pass) { alert('Isi semua kolom untuk daftar.'); return; }
    if (data.users.find(u => u.email === email)) { alert('Email sudah terdaftar. Silakan masuk.'); return; }
    const user = { id: Date.now().toString(), name, email, pass, joined: new Date().toISOString() };
    data.users.push(user); saveData(data); currentUser = user; localStorage.setItem('obrolin_currentUser', JSON.stringify(currentUser)); closeModal(); renderTopProfile(); renderComposer(); renderThreads();
  }
  document.getElementById('do-login').onclick = () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value;
    const user = data.users.find(u => u.email === email && u.pass === pass);
    if (!user) { alert('Email atau kata sandi salah.'); return; }
    currentUser = user; localStorage.setItem('obrolin_currentUser', JSON.stringify(currentUser)); closeModal(); renderTopProfile(); renderComposer(); renderThreads();
  }
}

// ===== Modal helpers =====
function showModal(inner) {
  modalRoot.innerHTML = `<div class="modal-backdrop">${inner}</div>`;
}
function closeModal() { modalRoot.innerHTML = ''; }

// ===== categories =====
function renderCategories(active = 'Semua') {
  const root = document.getElementById('categories'); root.innerHTML = '';
  const cats = ['Semua', ...DEFAULT_CATS];
  cats.forEach(c => {
    const d = el(`<div class="cat ${c === active ? 'active' : ''}" data-cat="${c}">${c} <span style="color:var(--muted)"></span></div>`);
    d.onclick = () => { renderCategories(c); renderThreads(c); document.getElementById('thread-category').value = (DEFAULT_CATS.includes(c) ? c : DEFAULT_CATS[0]); }
    root.appendChild(d);
  })
}

// ===== composer =====
function renderComposer() {
  document.getElementById('composer-avatar').textContent = currentUser ? currentUser.name[0].toUpperCase() : 'G';
  const sel = document.getElementById('thread-category'); sel.innerHTML = ''; DEFAULT_CATS.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c; sel.appendChild(opt); });
  document.getElementById('post-thread').onclick = postThread;
  document.getElementById('clear-thread').onclick = () => { document.getElementById('thread-title').value = ''; document.getElementById('thread-body').value = ''; document.getElementById('thread-media-url').value = ''; }
}

function postThread() {
  if (!currentUser) { openAuthModal(); return; }
  const title = document.getElementById('thread-title').value.trim();
  const body = document.getElementById('thread-body').value.trim();
  const category = document.getElementById('thread-category').value;
  const mediaUrl = document.getElementById('thread-media-url').value.trim(); 
  
  if (!title || !body) { alert('Judul dan isi thread wajib diisi.'); return; }
  
  const thread = { 
    id: Date.now().toString(), 
    title, 
    body, 
    category, 
    mediaUrl: mediaUrl, 
    authorId: currentUser.id, 
    authorName: currentUser.name, 
    created: new Date().toISOString(), 
    votes: 0, 
    replies: [] 
  };
  
  data.threads.unshift(thread); 
  saveData(data); 
  renderThreads(); 
  document.getElementById('thread-title').value = ''; 
  document.getElementById('thread-body').value = '';
  document.getElementById('thread-media-url').value = ''; 
}

// HELPER: Untuk membuat elemen media berdasarkan URL
function createMediaElement(url) {
    if (!url) return '';
    const ext = url.split('.').pop().toLowerCase().split('?')[0]; 
    let mediaHtml = '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        mediaHtml = `<img src="${url}" alt="Thread Media" loading="lazy">`;
    } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
        mediaHtml = `<video src="${url}" controls loading="lazy"></video>`;
    }
    
    if (mediaHtml) {
        return `<div class="thread-media">${mediaHtml}</div>`;
    }
    return '';
}


// ===== threads list & view (simplified rendering) =====
function renderThreads(filter = 'Semua') {
  const list = document.getElementById('threads-list'); list.innerHTML = '';
  const threads = data.threads.filter(t => filter === 'Semua' || t.category === filter);
  if (threads.length === 0) list.innerHTML = '<div class="card" style="text-align:center; padding: 20px;">Belum ada thread. Jadilah yang pertama!</div>';
  
  threads.forEach(t => {
    const mediaPreview = createMediaElement(t.mediaUrl); 
    
    const item = el(`
      <div class="card thread" style="padding:15px">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="vote">
            <button class="up" data-id="${t.id}">▲</button>
            <div class="votes-count">${t.votes}</div>
            <button class="down" data-id="${t.id}">▼</button>
          </div>
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <div>
              <div style="font-weight:700">${escapeHtml(t.title)}</div>
              <div class="meta">oleh ${escapeHtml(t.authorName)} • ${new Date(t.created).toLocaleString()}</div>
            </div>
            <div class="meta">${escapeHtml(t.category)}</div>
          </div>
          <div style="margin-top:8px;color:var(--muted);">${escapeHtml(truncate(t.body, 200))}</div>
          
          ${mediaPreview} 
          
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn small" data-id="${t.id}" data-action="open">Buka (${t.replies.length} Balasan)</button>
            <button class="btn secondary small" data-id="${t.id}" data-action="share">Bagikan</button>
          </div>
        </div>
      </div>
    `);
    list.appendChild(item);
    
    // Attach dynamic listeners
    item.querySelector('[data-action=open]').onclick = () => openThread(t.id);
    item.querySelector('[data-action=share]').onclick = () => { navigator.clipboard?.writeText(window.location.href + '#t=' + t.id).then(() => alert('Link disalin ke clipboard')) }
    
    // Vote listeners - simplified to use existing logic
    item.querySelector('.up').onclick = () => { t.votes++; item.querySelector('.votes-count').textContent = t.votes; saveData(data); };
    item.querySelector('.down').onclick = () => { t.votes--; item.querySelector('.votes-count').textContent = t.votes; saveData(data); };
  });
  updateNotifUI();
}

function openThread(id) {
  const t = data.threads.find(x => x.id === id); if (!t) return;
  const mediaElementFull = createMediaElement(t.mediaUrl); 
  
  let html = `<div class="card" style="max-width:820px; padding:20px;">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div class="vote" style="padding:0;"><div style="font-size:24px; color:var(--accent);">${t.votes}</div><div class="meta">Votes</div></div>
      <div style="flex:1">
        <h2 class="thread-title">${escapeHtml(t.title)}</h2>
        <div class="meta">oleh ${escapeHtml(t.authorName)} • ${new Date(t.created).toLocaleString()} • ${escapeHtml(t.category)}</div>
        <div style="height:12px"></div>
        <div style="white-space:pre-wrap; margin-bottom:15px;">${escapeHtml(t.body)}</div>
        
        ${mediaElementFull} 

        <div class="thread-actions">
          <button class="btn secondary" id="close-thread">Tutup</button>
        </div>
      </div>
    </div>
    <hr style="margin:16px 0; border-color: var(--border);">
    <h3 style="margin-top:0">Balasan (${t.replies.length})</h3>
    <div id="replies-root"></div>
    <div style="height:10px"></div>
    <div class="card" style="padding:10px 14px; border:1px solid var(--border); box-shadow:none;">
      <div style="display:flex;gap:10px">
        <div class="avatar">${currentUser ? currentUser.name[0].toUpperCase() : 'G'}</div>
        <div style="flex:1">
          <textarea id="reply-body" placeholder="${currentUser ? 'Tulis balasan...' : 'Silakan masuk untuk membalas...'}" ${currentUser ? '' : 'disabled'}></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button class="btn" id="post-reply" ${currentUser ? '' : 'disabled'}>Kirim Balasan</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  showModal(html);

  renderReplies(t);
  document.getElementById('close-thread').onclick = closeModal;
  document.getElementById('post-reply').onclick = () => {
    if (!currentUser) { closeModal(); openAuthModal(); return; }
    const body = document.getElementById('reply-body').value.trim(); if (!body) { alert('Tulis pesan terlebih dahulu'); return; }
    const reply = { id: Date.now().toString(), authorId: currentUser.id, authorName: currentUser.name, body, created: new Date().toISOString(), replies: [], votes: 0, parentId: null };
    t.replies.push(reply); saveData(data); renderReplies(t); notifyAuthorIfNeeded(t, reply); updateNotifUI(); document.getElementById('reply-body').value = '';
  }
}

function renderReplies(thread) {
  const root = document.getElementById('replies-root'); root.innerHTML = '';
  function renderList(list, container, depth) {
    list.forEach(r => {
      const rep = document.createElement('div'); rep.className = 'reply'; rep.style.marginLeft = (depth * 15) + 'px'; // Increased indent
      rep.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(r.authorName)}</strong><div class="meta">${new Date(r.created).toLocaleString()}</div></div><div class="meta">Votes: <span class="votes-count-reply">${r.votes}</span></div></div><div style="margin-top:8px;white-space:pre-wrap">${escapeHtml(r.body)}</div><div style="margin-top:8px;display:flex;gap:8px"><button class="btn small" data-id="${r.id}" data-action="reply">Balas</button><button class="icon-btn" data-id="${r.id}" data-action="up">▲</button><button class="icon-btn" data-id="${r.id}" data-action="down">▼</button></div>`;
      container.appendChild(rep);

      // Reply action handler
      rep.querySelector('[data-action=reply]').onclick = () => {
        if (!currentUser) { alert('Silakan masuk untuk membalas.'); return; }
        const existingBox = rep.querySelector('.reply-box');
        if (existingBox) { existingBox.remove(); return; } // Toggle close

        const box = document.createElement('div'); box.className = 'reply-box'; box.style.marginTop = '8px';
        box.innerHTML = `<textarea placeholder="Balas..." style="width:100%;min-height:60px; padding:8px;"></textarea><div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn small">Kirim</button></div>`;
        rep.appendChild(box);

        box.querySelector('button').onclick = () => {
          const txt = box.querySelector('textarea').value.trim(); if (!txt) return; const newR = { id: Date.now().toString(), authorId: currentUser.id, authorName: currentUser.name, body: txt, created: new Date().toISOString(), replies: [], votes: 0, parentId: r.id };
          r.replies.push(newR); saveData(data); renderReplies(thread); notifyAuthorIfNeeded(thread, newR); updateNotifUI();
        }
      }

      // Vote action handler
      const vc = rep.querySelector('.votes-count-reply');
      rep.querySelector('[data-action=up]').onclick = () => { r.votes++; vc.textContent = r.votes; saveData(data); }
      rep.querySelector('[data-action=down]').onclick = () => { r.votes--; vc.textContent = r.votes; saveData(data); }

      if (r.replies && r.replies.length) renderList(r.replies, container, depth + 1);
    })
  }
  root.innerHTML = '';
  renderList(thread.replies, root, 0);
}


// ===== notifications (local) =====
function notifyAuthorIfNeeded(thread, reply) {
  if (thread.authorId && thread.authorId !== currentUser?.id) {
    const notif = { id: Date.now().toString(), userId: thread.authorId, threadId: thread.id, threadTitle: thread.title, from: reply.authorName, created: new Date().toISOString(), read: false };
    data.notifications.push(notif); saveData(data);
  }
}
function updateNotifUI() {
  const btn = document.getElementById('notif-btn'); const span = document.getElementById('notif-count');
  if (!currentUser) { span.textContent = ''; btn.onclick = () => { openAuthModal(); }; return; }
  const unread = data.notifications.filter(n => n.userId === currentUser.id && !n.read).length;
  span.innerHTML = unread ? `<span class="notif-badge">${unread}</span>` : '';
  btn.onclick = () => { openNotifPanel(); }
}
function openNotifPanel() {
  if (!currentUser) return openAuthModal();
  const nots = data.notifications.filter(n => n.userId === currentUser.id).sort((a, b) => b.created.localeCompare(a.created));
  let html = `<div class="card" style="max-width:420px; padding:20px;"><h3>Notifikasi (${nots.length})</h3><div style="display:flex;flex-direction:column;gap:8px; margin-top:12px">`;
  nots.forEach(n => { html += `<div style="padding:8px;border-radius:8px;background:${n.read ? 'var(--card)' : 'rgba(37,99,235,0.08)'}; border:1px solid var(--border);"><div style="font-weight:700">${escapeHtml(n.from)}</div><div style="color:var(--muted);font-size:13px">Membalas thread: <a href="#t=${n.threadId}" onclick="closeModal(); setTimeout(()=>openThread('${n.threadId}'), 100);" style="color:var(--accent); text-decoration:none;">${escapeHtml(n.threadTitle)}</a></div><div style="font-size:12px;color:var(--muted)">${new Date(n.created).toLocaleString()}</div></div>` });
  html += `</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:15px"><button class="btn secondary" id="close-notif">Tutup</button><button class="btn" id="mark-read">Tandai sudah dibaca</button></div></div>`;
  showModal(html);
  document.getElementById('close-notif').onclick = closeModal;
  document.getElementById('mark-read').onclick = () => { data.notifications.forEach(n => { if (n.userId === currentUser.id) n.read = true; }); saveData(data); closeModal(); updateNotifUI(); }
}

// ===== utilities =====
function escapeHtml(s) { if (!s) return ''; return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ===== bootstrap =====
document.getElementById('new-thread-btn').onclick = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById('thread-title').focus(); }
document.getElementById('notif-count').textContent = '';

renderTopProfile(); 
renderComposer(); 
renderCategories(); 
renderThreads(); 
updateNotifUI();

// Provide deep-link support: #t=threadid
if (window.location.hash.startsWith('#t=')) { const id = window.location.hash.split('=')[1]; setTimeout(() => openThread(id), 600); }

// expose for debugging
window._obrolin = { data, saveData, loadData, isDarkMode };
