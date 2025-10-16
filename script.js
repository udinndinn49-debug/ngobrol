// script.js

// Variabel global dan elemen DOM
const htmlEl = document.documentElement;
const modalRoot = document.getElementById('modal-root');
const DEFAULT_CATS = ['Teknologi', 'Lifestyle', 'Edukasi', 'Hiburan', 'Umum'];

let currentUser = null; // Akan diisi data profil dari Supabase
let currentSession = null; // Akan diisi sesi login dari Supabase

// ===== UI helpers =====
function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstChild;
}
function escapeHtml(s) {
    if (!s) return '';
    return s.toString().replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ===== Theme Toggler Logic =====
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
let isDarkMode = htmlEl.classList.contains('dark-mode');

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
themeIcon.textContent = isDarkMode ? '🌙' : '☀️';
themeToggleBtn.onclick = () => {
    isDarkMode = !isDarkMode;
    applyTheme();
};

// ===== Auth (SUPABASE) =====
async function setupAuth() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    currentSession = session;
    if (session) {
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        currentUser = profile;
    } else {
        currentUser = null;
    }
    renderTopProfile();
    renderComposer();
}

function renderTopProfile() {
    const root = document.getElementById('top-profile');
    root.innerHTML = '';
    if (currentUser) {
        const prof = el(`<div style="display:flex;gap:8px;align-items:center"><div class="avatar">${currentUser.name[0].toUpperCase()}</div><div style="text-align:right"><div style="font-size:13px">${currentUser.name}</div><div style="font-size:12px;color:var(--muted)">${currentUser.email}</div></div><button class="btn secondary" id="logout">Keluar</button></div>`);
        root.appendChild(prof);
        prof.querySelector('#logout').onclick = async () => {
            await window.supabaseClient.auth.signOut();
            currentUser = null;
            currentSession = null;
            renderTopProfile();
            renderComposer();
        };
    } else {
        const login = el(`<div style="display:flex;gap:6px;align-items:center"><button class="btn" id="open-login">Masuk / Daftar</button></div>`);
        root.appendChild(login);
        login.querySelector('#open-login').onclick = openAuthModal;
    }
}

function openAuthModal() {
    showModal(`<div class="card" style="max-width:420px; padding:20px;"><h3>Masuk atau Daftar</h3>
    <div style="display:grid;gap:10px;margin-top:12px">
      <input type="text" id="auth-name" placeholder="Nama Lengkap (hanya untuk daftar)" />
      <input type="email" id="auth-email" placeholder="Email" required />
      <input type="password" id="auth-pass" placeholder="Kata Sandi (min. 6 karakter)" required />
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button class="btn secondary" id="close-auth">Tutup</button>
        <button class="btn secondary" id="do-signup">Daftar</button>
        <button class="btn" id="do-login">Masuk</button>
      </div>
    </div>
  </div>`);

    document.getElementById('close-auth').onclick = closeModal;
    document.getElementById('do-signup').onclick = async () => {
        const name = document.getElementById('auth-name').value.trim();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-pass').value;
        if (!name || !email || !password) { alert('Nama, email, dan kata sandi wajib diisi untuk mendaftar.'); return; }
        
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { name: name } }
        });

        if (error) { alert(`Gagal mendaftar: ${error.message}`); return; }
        alert('Pendaftaran berhasil! Silakan cek email untuk verifikasi.');
        closeModal();
    };

    document.getElementById('do-login').onclick = async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-pass').value;
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { alert(`Gagal masuk: ${error.message}`); return; }
        await setupAuth(); // Re-fetch user profile
        closeModal();
    };
}

// Listen for auth state changes
window.supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (currentSession?.access_token !== session?.access_token) {
        currentSession = session;
        setupAuth();
    }
});


// ===== Modal helpers =====
function showModal(inner) {
    modalRoot.innerHTML = `<div class="modal-backdrop">${inner}</div>`;
}
function closeModal() { modalRoot.innerHTML = ''; }


// ===== Categories =====
function renderCategories(active = 'Semua') {
    const root = document.getElementById('categories');
    root.innerHTML = '';
    ['Semua', ...DEFAULT_CATS].forEach(c => {
        const d = el(`<div class="cat ${c === active ? 'active' : ''}">${c}</div>`);
        d.onclick = () => {
            renderCategories(c);
            renderThreads(c);
        };
        root.appendChild(d);
    });
}

// ===== Composer =====
function renderComposer() {
    document.getElementById('composer-avatar').textContent = currentUser ? currentUser.name[0].toUpperCase() : 'G';
    const sel = document.getElementById('thread-category');
    sel.innerHTML = '';
    DEFAULT_CATS.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
    });
    document.getElementById('post-thread').onclick = postThread;
}

async function postThread() {
    if (!currentUser) { openAuthModal(); return; }

    const title = document.getElementById('thread-title').value.trim();
    const body = document.getElementById('thread-body').value.trim();
    const category = document.getElementById('thread-category').value;
    const media_url = document.getElementById('thread-media-url').value.trim();

    if (!title || !body) { alert('Judul dan isi thread wajib diisi.'); return; }

    const { error } = await window.supabaseClient
        .from('threads')
        .insert({
            title,
            body,
            category,
            media_url,
            author_id: currentUser.id
        });
    
    if (error) { alert(`Gagal memposting: ${error.message}`); return; }
    
    document.getElementById('thread-title').value = '';
    document.getElementById('thread-body').value = '';
    document.getElementById('thread-media-url').value = '';
    renderThreads(); // Refresh list
}


// ===== Threads & Replies =====
async function renderThreads(filter = 'Semua') {
    const list = document.getElementById('threads-list');
    list.innerHTML = '<div class="card" style="text-align:center;">Memuat threads...</div>';

    let query = window.supabaseClient
        .from('threads')
        .select(`
            *,
            profiles ( name )
        `)
        .order('created_at', { ascending: false });

    if (filter !== 'Semua') {
        query = query.eq('category', filter);
    }
    
    const { data: threads, error } = await query;
    if (error) { list.innerHTML = `<div class="card">Gagal memuat data: ${error.message}</div>`; return; }

    if (threads.length === 0) {
        list.innerHTML = '<div class="card" style="text-align:center; padding: 20px;">Belum ada thread. Jadilah yang pertama!</div>';
        return;
    }

    list.innerHTML = '';
    threads.forEach(t => {
        const item = el(`
          <div class="card thread" style="padding:15px">
            <div class="vote">
              <button class="up" data-id="${t.id}">▲</button>
              <div class="votes-count">${t.votes}</div>
              <button class="down" data-id="${t.id}">▼</button>
            </div>
            <div style="flex:1">
              <div style="font-weight:700">${escapeHtml(t.title)}</div>
              <div class="meta">oleh ${escapeHtml(t.profiles.name)} • ${new Date(t.created_at).toLocaleString()}</div>
              <div style="margin-top:8px;">${escapeHtml(truncate(t.body, 150))}</div>
              <div style="margin-top:10px;">
                <button class="btn small" data-id="${t.id}">Buka Thread</button>
              </div>
            </div>
          </div>
        `);
        list.appendChild(item);

        item.querySelector('.btn').onclick = () => openThread(t.id);
        
        // Vote listeners
        item.querySelector('.up').onclick = () => updateVote('threads', t.id, t.votes + 1);
        item.querySelector('.down').onclick = () => updateVote('threads', t.id, t.votes - 1);
    });
}

async function openThread(id) {
    const { data: t, error } = await window.supabaseClient
        .from('threads')
        .select(`*, profiles(name)`)
        .eq('id', id)
        .single();
    if (error) { alert(`Gagal membuka thread: ${error.message}`); return; }
    
    const { data: replies, error: repliesError } = await window.supabaseClient
        .from('replies')
        .select(`*, profiles(name)`)
        .eq('thread_id', id)
        .order('created_at', { ascending: true });

    let repliesHtml = '';
    if (repliesError) {
        repliesHtml = 'Gagal memuat balasan.';
    } else if (replies.length > 0) {
        replies.forEach(r => {
            repliesHtml += `
            <div class="reply">
                <strong>${escapeHtml(r.profiles.name)}</strong>
                <div class="meta">${new Date(r.created_at).toLocaleString()}</div>
                <div style="margin-top:8px">${escapeHtml(r.body)}</div>
            </div>`;
        });
    } else {
        repliesHtml = '<p>Belum ada balasan.</p>';
    }

    const modalHtml = `
    <div class="card" style="max-width:820px; padding:20px; text-align:left;">
      <h2 class="thread-title">${escapeHtml(t.title)}</h2>
      <div class="meta">oleh ${escapeHtml(t.profiles.name)} • ${new Date(t.created_at).toLocaleString()}</div>
      <div style="margin-top:12px; white-space:pre-wrap;">${escapeHtml(t.body)}</div>
      <hr style="margin:16px 0;">
      <h3>Balasan</h3>
      <div id="replies-root">${repliesHtml}</div>
      <div class="card" style="margin-top:15px;">
        <textarea id="reply-body" placeholder="${currentUser ? 'Tulis balasan...' : 'Masuk untuk membalas...'}" ${!currentUser ? 'disabled' : ''}></textarea>
        <div style="text-align:right; margin-top:8px;">
          <button class="btn" id="post-reply" ${!currentUser ? 'disabled' : ''}>Kirim Balasan</button>
        </div>
      </div>
      <button class="btn secondary" id="close-thread" style="margin-top:15px;">Tutup</button>
    </div>`;
    showModal(modalHtml);
    document.getElementById('close-thread').onclick = closeModal;
    if (currentUser) {
        document.getElementById('post-reply').onclick = async () => {
            const body = document.getElementById('reply-body').value.trim();
            if (!body) return;
            await window.supabaseClient.from('replies').insert({
                body,
                thread_id: t.id,
                author_id: currentUser.id
            });
            openThread(id); // Refresh thread view
        };
    }
}

async function updateVote(table, id, newCount) {
    if (!currentUser) { openAuthModal(); return; }
    await window.supabaseClient
        .from(table)
        .update({ votes: newCount })
        .eq('id', id);
    renderThreads(); // Quick & dirty refresh
}

// ===== Initializer / Bootstrap =====
async function main() {
    await setupAuth();
    renderCategories();
    renderThreads();
    document.getElementById('clear-thread').onclick = () => {
        document.getElementById('thread-title').value = '';
        document.getElementById('thread-body').value = '';
        document.getElementById('thread-media-url').value = '';
    };
    document.getElementById('new-thread-btn').onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('thread-title').focus();
    };
}

main(); // Jalankan aplikasi
