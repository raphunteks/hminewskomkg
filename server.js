const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@vercel/kv');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi Multer
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // Limit diatur ke 50MB (Walau Vercel akan otomatis handle di client-side)
});

// Inisialisasi Koneksi ke Upstash Redis KV
const kv = createClient({
  url: process.env.KV2_KV_REST_API_URL,
  token: process.env.KV2_KV_REST_API_TOKEN,
});

// Konfigurasi EJS & Public folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk form data (Limit dinaikkan agar tidak 413)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser()); // Menggunakan Cookie Parser untuk sesi Vercel

// Fungsi Helper untuk Inisialisasi Default Data
async function initDefaultData() {
    const hasNews = await kv.get('newsList');
    if (!hasNews) {
        await kv.set('newsList', [
            { id: 1, title: 'Silaturahmi, Penghargaan dan Launching Kaos', category: 'Terbaru', date: '10 May 2025', content: 'Kegiatan silaturahmi kader...', image: '[https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80)' },
            { id: 2, title: 'Semarak Hari Santri! HMI Gelar Pengajian', category: 'Populer', date: '22 Oct 2024', content: 'Peringatan hari santri nasional...', image: '[https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80)' }
        ]);
        await kv.set('albumsList', [
            { id: 1, title: 'Basic Training (LK I) LXIII', date: '12 Maret 2025', cover: '[https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80)' }
        ]);
        await kv.set('pengurusList', [
            { id: 1, name: 'Muh. Xavier Syafwan', role: 'Ketua Umum', image: '[https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80](https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80)' }
        ]);
        await kv.set('bidangList', [
            { id: 101, name: 'Bidang PPPA', members: [] },
            { id: 102, name: 'Bidang PTKP', members: [] }
        ]);
    }
}
initDefaultData();

// Auto-Migrasi: Ubah struktur Bidang lama (String) menjadi Object (Bisa Punya Anggota)
async function upgradeDataFormat() {
    let bidang = await kv.get('bidangList');
    if (bidang && bidang.length > 0 && typeof bidang[0] === 'string') {
        const upgraded = bidang.map((b, i) => ({ id: Date.now() + i, name: b, members: [] }));
        await kv.set('bidangList', upgraded);
    }
}
upgradeDataFormat();

// --- ROUTES HALAMAN UTAMA ---
app.get('/', async (req, res) => {
    const news = await kv.get('newsList') || [];
    res.render('index', { page: 'beranda', news });
});

app.get('/tentang', async (req, res) => {
    const pengurus = await kv.get('pengurusList') || [];
    const bidang = await kv.get('bidangList') || [];
    res.render('tentang', { page: 'tentang', pengurus, bidang });
});

app.get('/galeri', async (req, res) => {
    const albums = await kv.get('albumsList') || [];
    res.render('galeri', { page: 'galeri', albums });
});

app.get('/data-anggota', (req, res) => res.render('data-anggota', { page: 'data-anggota' }));

// --- ROUTES ADMIN (FIXED LOGIN PERSISTENT) ---
app.get('/admin', (req, res) => {
    if(req.cookies.admin_auth === 'true') return res.redirect('/admin/dashboard');
    res.render('admin-login', { page: 'admin', error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if(username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        // Set Cookie tahan 7 Hari, Solusi ampuh untuk Vercel
        res.cookie('admin_auth', 'true', { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin-login', { page: 'admin', error: 'Username atau Password salah!' });
    }
});

const requireAdmin = (req, res, next) => {
    if (req.cookies.admin_auth !== 'true') return res.redirect('/admin');
    next();
};

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    const news = await kv.get('newsList') || [];
    const albums = await kv.get('albumsList') || [];
    const pengurus = await kv.get('pengurusList') || [];
    const bidang = await kv.get('bidangList') || [];
    res.render('admin-dashboard', { page: 'admin', news, albums, pengurus, bidang });
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('admin_auth');
    res.redirect('/admin');
});

// --- FITUR UPLOAD & TAMBAH DATA (MENDUKUNG COMPRESS DARI CLIENT) ---
app.post('/admin/tambah-berita', requireAdmin, upload.single('image'), async (req, res) => {
    const { title, category, content, image_b64 } = req.body;
    let imageStr = image_b64 || '';
    if (!imageStr && req.file) {
        imageStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    let news = await kv.get('newsList') || [];
    news.unshift({ id: Date.now(), title, category, date: new Date().toLocaleDateString('id-ID'), content, image: imageStr });
    await kv.set('newsList', news);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-album', requireAdmin, upload.single('cover'), async (req, res) => {
    const { title, cover_b64 } = req.body;
    let coverStr = cover_b64 || '';
    if (!coverStr && req.file) {
        coverStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    let albums = await kv.get('albumsList') || [];
    albums.unshift({ id: Date.now(), title, date: new Date().toLocaleDateString('id-ID'), cover: coverStr });
    await kv.set('albumsList', albums);
    res.redirect('/admin/dashboard');
});

// --- FITUR PENGURUS UTAMA ---
app.post('/admin/tambah-pengurus', requireAdmin, upload.single('image'), async (req, res) => {
    const { name, role, image_b64 } = req.body;
    let imageStr = image_b64 || '';
    if (!imageStr && req.file) {
        imageStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    let pengurus = await kv.get('pengurusList') || [];
    pengurus.push({ id: Date.now(), name, role, image: imageStr });
    await kv.set('pengurusList', pengurus);
    res.redirect('/admin/dashboard');
});

// EDIT PENGURUS
app.post('/admin/edit-pengurus/:id', requireAdmin, upload.single('image'), async (req, res) => {
    const { name, role, image_b64 } = req.body;
    let pengurus = await kv.get('pengurusList') || [];
    let index = pengurus.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        pengurus[index].name = name;
        pengurus[index].role = role;
        
        let imageStr = image_b64 || '';
        if (!imageStr && req.file) {
            imageStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        if (imageStr) pengurus[index].image = imageStr; // Hanya update jika ada file baru
        
        await kv.set('pengurusList', pengurus);
    }
    res.redirect('/admin/dashboard');
});

// --- FITUR BIDANG & ANGGOTA BIDANG ---
app.post('/admin/tambah-bidang', requireAdmin, async (req, res) => {
    if(req.body.bidang_name) {
        let bidang = await kv.get('bidangList') || [];
        bidang.push({ id: Date.now(), name: req.body.bidang_name, members: [] });
        await kv.set('bidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-anggota-bidang/:bidangId', requireAdmin, upload.single('image'), async (req, res) => {
    const { name, image_b64 } = req.body;
    let imageStr = image_b64 || '';
    if (!imageStr && req.file) {
        imageStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    let bidang = await kv.get('bidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1) {
        if(!bidang[bIndex].members) bidang[bIndex].members = [];
        bidang[bIndex].members.push({ id: Date.now(), name, image: imageStr });
        await kv.set('bidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});

// --- FITUR HAPUS DATA ---
app.post('/admin/hapus-berita/:id', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || [];
    news = news.filter(n => n.id !== parseInt(req.params.id));
    await kv.set('newsList', news);
    res.redirect('/admin/dashboard');
});

app.post('/admin/hapus-pengurus/:id', requireAdmin, async (req, res) => {
    let pengurus = await kv.get('pengurusList') || [];
    pengurus = pengurus.filter(p => p.id !== parseInt(req.params.id));
    await kv.set('pengurusList', pengurus);
    res.redirect('/admin/dashboard');
});

app.post('/admin/hapus-album/:id', requireAdmin, async (req, res) => {
    let albums = await kv.get('albumsList') || [];
    albums = albums.filter(a => a.id !== parseInt(req.params.id));
    await kv.set('albumsList', albums);
    res.redirect('/admin/dashboard');
});

app.post('/admin/hapus-bidang/:id', requireAdmin, async (req, res) => {
    let bidang = await kv.get('bidangList') || [];
    bidang = bidang.filter(b => b.id !== parseInt(req.params.id));
    await kv.set('bidangList', bidang);
    res.redirect('/admin/dashboard');
});

app.post('/admin/hapus-anggota-bidang/:bidangId/:memberId', requireAdmin, async (req, res) => {
    let bidang = await kv.get('bidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1 && bidang[bIndex].members) {
        bidang[bIndex].members = bidang[bIndex].members.filter(m => m.id !== parseInt(req.params.memberId));
        await kv.set('bidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});

// Middleware 404
app.use((req, res) => {
    res.status(404).render('admin-404', { page: '404' });
});

// Export untuk Vercel Serverless
app.listen(port, () => console.log(`Server running on port ${port}`));
module.exports = app;
