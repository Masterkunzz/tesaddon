// ====================================================================
// BAGIAN 1: KONFIGURASI FIREBASE & INISIALISASI
// ====================================================================

// KONFIGURASI KHUSUS PROYEK ANDA (addonpakdhe)
const firebaseConfig = {
    apiKey: "AIzaSyCFe6ZnsjQ7si0jFo2UjxFRPBdExfmrc40",
    authDomain: "addonpakdhe.firebaseapp.com",
    projectId: "addonpakdhe",
    storageBucket: "addonpakdhe.firebasestorage.app",
    messagingSenderId: "799579427870",
    appId: "1:799579427870:web:5d6dcb3cfe81926cc84a0f",
    measurementId: "G-R7NEB07M3P"
};

let db;
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}


// ====================================================================
// BAGIAN 2: LOGIKA CRUD (CREATE, READ, DELETE, READ ONE)
// ====================================================================

// READ ALL: Mengambil semua data addon
async function getAddons() {
    if (!db) return [];
    try {
        const snapshot = await db.collection("addons").orderBy("createdAt", "desc").get();
        const addons = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return addons;
    } catch (error) {
        console.error("Error fetching documents: ", error);
        return [];
    }
}

// READ ONE: Mengambil satu data addon berdasarkan ID
async function getAddonById(id) {
    if (!db) return null;
    try {
        const doc = await db.collection("addons").doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        } else {
            console.warn("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching document by ID: ", error);
        return null;
    }
}


// CREATE: Menambahkan addon baru (Admin Panel)
async function addAddon(data) {
    if (!db) return { success: false, message: "Database tidak terinisialisasi." };
    try {
        const newData = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
        const docRef = await db.collection("addons").add(newData);
        return { success: true, message: `Addon berhasil ditambahkan (ID: ${docRef.id}).` };
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, message: `Gagal menambahkan addon: ${error.message}` };
    }
}

// DELETE: Menghapus addon (Admin Panel)
async function deleteAddon(id) {
    if (!db) return { success: false, message: "Database tidak terinisialisasi." };
    try {
        await db.collection("addons").doc(id).delete();
        return { success: true, message: "Addon berhasil dihapus." };
    } catch (error) {
        console.error("Error deleting document: ", error);
        return { success: false, message: `Gagal menghapus addon: ${error.message}` };
    }
}


// ====================================================================
// BAGIAN 3: LOGIKA DOM (INDEX, SEARCH, ADMIN, DETAIL)
// ====================================================================

// FUNGSI UTILITY: Mengubah Newline (\n) menjadi <br>
function formatDescription(text) {
    // Pastikan teks di-encode untuk mencegah XSS dan ganti \n dengan <br>
    const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return safeText.replace(/\n/g, '<br>');
}

// FUNGSI UTILITY: Membuat Snippet
function createSnippet(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    // Cari spasi terakhir sebelum batas karakter dan tambahkan '...'
    return text.substring(0, maxLength).trim() + '...';
}


document.addEventListener('DOMContentLoaded', async () => {
    // [Logika Theme Toggle & Search Input di sini]
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        if(themeToggle) themeToggle.innerText = '☀️';
    }

    if(themeToggle){
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.innerText = '☀️';
            } else {
                localStorage.setItem('light', 'dark');
                themeToggle.innerText = '🌙';
            }
        });
    }

    const searchInput = document.getElementById('search-input');
    if(searchInput){
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    // 2. Tentukan Halaman yang dimuat dan ambil data dari Firebase
    if (document.title.includes('Panel Admin')) {
        await loadAdminPage();
    } else if (document.title.includes('Detail Addon')) {
        await loadDetailPage();
    } else {
        await loadFrontEndPage();
    }
});

// Fungsi untuk memuat data di Index dan Search
async function loadFrontEndPage() {
    const databaseAddons = await getAddons();

    // Halaman Index
    const indexAddonGrid = document.querySelector('.addon-grid');
    if (indexAddonGrid && document.title.includes('Addon Directory')) {
        renderFrontEndResults(databaseAddons, indexAddonGrid);
    }

    // Halaman Search
    const searchResultsContainer = document.getElementById('search-results-container');
    if (searchResultsContainer) {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');

        if (query) {
            document.getElementById('search-keyword').innerText = `"${query}"`;
            document.getElementById('search-input').value = query;

            const hasil = databaseAddons.filter(item => 
                item.judul.toLowerCase().includes(query.toLowerCase()) || 
                item.deskripsi.toLowerCase().includes(query.toLowerCase())
            );

            renderFrontEndResults(hasil, searchResultsContainer);
        } else {
            searchResultsContainer.innerHTML = '<p style="grid-column: 1/-1;">Silakan ketik sesuatu di kolom pencarian.</p>';
        }
    }
}

// FUNGSI UTAMA: Render Card di Index/Search
function renderFrontEndResults(data, container) {
    container.innerHTML = '';
    
    if (document.title.includes('Addon Directory')) {
        data = data.slice(0, 4);
    }
    
    if (data.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px;"><h3>Belum ada Addon 😢</h3><p>Segera ditambahkan oleh Admin!</p></div>';
        return;
    }

    data.forEach(item => {
        // --- 1. APLIKASI SNIPPET DI SINI ---
        const snippet = createSnippet(item.deskripsi, 100); 
        
        const card = document.createElement('a');
        card.href = `detail.html?id=${item.id}`; 
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.gambar}" alt="${item.judul}">
            <div class="card-content">
                <div class="card-title">${item.judul}</div>
                <div class="card-desc">${snippet}</div> 
            </div>
        `;
        container.appendChild(card);
    });
}

// FUNGSI BARU: Memuat data dan merender Halaman Detail Dinamis
async function loadDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const addonId = params.get('id');
    const detailContent = document.getElementById('detail-content');

    if (!addonId || !detailContent) {
        detailContent.innerHTML = '<h1>Error 404</h1><p>Addon tidak ditemukan atau ID tidak valid.</p>';
        return;
    }

    detailContent.innerHTML = '<h1>Loading...</h1><p>Mengambil data dari database...</p>';
    
    const addon = await getAddonById(addonId);
    
    if (!addon) {
        detailContent.innerHTML = '<h1>Addon Tidak Ditemukan</h1><p>ID: ' + addonId + ' tidak terdaftar.</p>';
        document.title = '404 Not Found';
        return;
    }
    
    // --- 2. APLIKASI LINE BREAK DI SINI ---
    const formattedDescription = formatDescription(addon.deskripsi);
    
    // Render Konten
    document.title = addon.judul + ' - AhZanMC';

    detailContent.innerHTML = `
        <h1>${addon.judul}</h1>
        <img src="${addon.gambar}" class="detail-img" alt="${addon.judul}">
        
        <p style="font-size: 1.1rem; line-height: 1.6;">${formattedDescription}</p>
        <br>
        
        <h3>Preview Video:</h3>
        <iframe class="detail-video" src="${addon.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}" frameborder="0" allowfullscreen></iframe>
        
        <div class="download-btn-container">
            <button class="btn-download" onclick="showDownloadPopup('${addon.tipe_iklan}', '${addon.link_download || 'https://www.mediafire.com/default-link'}')">
                DOWNLOAD SEKARANG (${addon.tipe_iklan === 'video' ? 'Video Ad' : 'Banner Ad'}) ⬇️
            </button>
        </div>
    `;
}


// Fungsi untuk memuat data di Admin Panel
async function loadAdminPage() {
    // [Logika Admin Panel]
    const adminForm = document.getElementById('addon-form');
    const deleteListContainer = document.getElementById('delete-list');
    
    if (adminForm) {
        if (!adminForm.dataset.listenerAdded) {
            
            // Logika Add (CREATE)
            adminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusPesan = document.getElementById('status-pesan');
                statusPesan.innerText = "Sedang menyimpan...";
                
                const data = {
                    judul: document.getElementById('judul').value,
                    deskripsi: document.getElementById('deskripsi').value,
                    gambar: document.getElementById('gambar').value,
                    link_download: document.getElementById('link_download').value, 
                    tipe_iklan: document.getElementById('tipe_iklan').value,
                    video_url: document.getElementById('video_url').value,
                };
                
                const result = await addAddon(data);
                if (result.success) {
                    statusPesan.style.color = 'green';
                    e.target.reset();
                    await renderDeleteList(deleteListContainer); 
                } else {
                    statusPesan.style.color = 'red';
                }
                statusPesan.innerText = result.message;
            });
            
            adminForm.dataset.listenerAdded = true;
        }
    }
    
    // Logika Delete (DELETE)
    if (deleteListContainer) {
        await renderDeleteList(deleteListContainer);
        
        deleteListContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const docId = e.target.dataset.id;
                const konfirmasi = confirm(`Yakin ingin menghapus Addon ID ${docId}?`);
                if (konfirmasi) {
                    e.target.innerText = 'Menghapus...';
                    const result = await deleteAddon(docId);
                    if (result.success) {
                        await renderDeleteList(deleteListContainer);
                    } else {
                        alert(result.message);
                    }
                }
            }
        });
    }
}

// Fungsi untuk merender daftar addon yang bisa dihapus
async function renderDeleteList(container) {
    container.innerHTML = '<li>Memuat daftar addon...</li>';
    const allAddons = await getAddons();
    
    if (allAddons.length === 0) {
        container.innerHTML = '<li>Belum ada addon di database.</li>';
        return;
    }
    
    container.innerHTML = '';
    allAddons.forEach(addon => {
        const li = document.createElement('li');
        li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom: 1px solid var(--text-sub);';
        li.innerHTML = `
            <span><strong>${addon.judul}</strong><br><small style="color:var(--text-sub);">Iklan: ${addon.tipe_iklan || 'N/A'}</small></span>
            <button class="delete-btn" data-id="${addon.id}" style="background: red; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Hapus</button>
        `;
        container.appendChild(li);
    });
}


// ====================================================================
// BAGIAN 4: LOGIKA POPUP & IKLAN
// ====================================================================

function showDownloadPopup(adType, targetUrl) {
    // [Logika Popup Iklan]
    const popup = document.getElementById('download-popup');
    const adContainer = document.getElementById('ad-container');
    const proceedBtn = document.getElementById('btn-proceed');
    
    popup.style.display = 'flex';
    proceedBtn.classList.remove('active');
    proceedBtn.disabled = true;
    proceedBtn.innerText = "Memuat Iklan...";
    adContainer.innerHTML = '';

    if (adType === 'video') {
        const video = document.createElement('video');
        video.src = 'assets/tesiklan.mp4'; 
        video.controls = true;
        video.style.width = '100%';
        video.autoplay = true;
        adContainer.appendChild(video);
        video.onended = () => activateButton(proceedBtn, targetUrl);

    } else if (adType === '3rdparty') {
        const adWrapper = document.createElement('div');
        adWrapper.style.cssText = "display:flex; justify-content:center; margin:20px 0;";
        adContainer.appendChild(adWrapper);

        const confScript = document.createElement('script');
        confScript.text = `atOptions = {'key':'f04a7d1db7ea14f25a7d57fd9aaaef86','format':'iframe','height':50,'width':320,'params':{}};`;
        
        const srcScript = document.createElement('script');
        srcScript.src = "//www.highperformanceformat.com/f04a7d1db7ea14f25a7d57fd9aaaef86/invoke.js";

        adWrapper.appendChild(confScript);
        adWrapper.appendChild(srcScript);

        let counter = 15; 
        proceedBtn.innerText = `Tunggu ${counter}s`;
        const timer = setInterval(() => {
            counter--;
            proceedBtn.innerText = `Tunggu ${counter}s`;
            if (counter <= 0) { clearInterval(timer); activateButton(proceedBtn, targetUrl); }
        }, 1000);
    }
}

function activateButton(btn, url) {
    btn.classList.add('active');
    btn.disabled = false;
    btn.innerText = "LANJUT KE LINK 🚀";
    btn.onclick = () => window.open(url, '_blank');
}

function closePopup() {
    document.getElementById('download-popup').style.display = 'none';
    document.getElementById('ad-container').innerHTML = ''; 
}
