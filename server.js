const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@vercel/kv');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Inisialisasi Koneksi ke Upstash Redis KV
const kv = createClient({
  url: process.env.KV2_KV_REST_API_URL,
  token: process.env.KV2_KV_REST_API_TOKEN,
});

// Konfigurasi EJS & Public folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk form data & sesi
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// FIX SESI LOGIN: Agar tidak mudah logout (bertahan 7 hari)
app.set('trust proxy', 1);
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Hari
    }
}));

// Fungsi Helper untuk Inisialisasi Default Data jika Database Kosong
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
        await kv.set('bidangList', ['Bidang PPPA', 'Bidang PTKP', 'Bidang KPP', 'Bidang PU']);
    }
}
initDefaultData(); // Panggil saat server berjalan

// --- ROUTES HALAMAN UTAMA (Dengan Async Await dari DB) ---
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

// --- ROUTES ADMIN ---
app.get('/admin', (req, res) => {
    if(req.session.loggedIn) return res.redirect('/admin/dashboard');
    res.render('admin-login', { page: 'admin', error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if(username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.loggedIn = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin-login', { page: 'admin', error: 'Username atau Password salah!' });
    }
});

// Middleware Proteksi Halaman Admin
const requireAdmin = (req, res, next) => {
    if (!req.session.loggedIn) return res.redirect('/admin');
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
    req.session.destroy();
    res.redirect('/admin');
});

// --- ROUTES FUNGSI ADMIN (UPDATE KE UPSTASH REDIS DB) ---
app.post('/admin/tambah-berita', requireAdmin, async (req, res) => {
    const { title, category, image, content } = req.body;
    let news = await kv.get('newsList') || [];
    news.unshift({ id: Date.now(), title, category, date: new Date().toLocaleDateString('id-ID'), content, image });
    await kv.set('newsList', news);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-album', requireAdmin, async (req, res) => {
    const { title, cover } = req.body;
    let albums = await kv.get('albumsList') || [];
    albums.unshift({ id: Date.now(), title, date: new Date().toLocaleDateString('id-ID'), cover });
    await kv.set('albumsList', albums);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-pengurus', requireAdmin, async (req, res) => {
    const { name, role, image } = req.body;
    let pengurus = await kv.get('pengurusList') || [];
    pengurus.push({ id: Date.now(), name, role, image });
    await kv.set('pengurusList', pengurus);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-bidang', requireAdmin, async (req, res) => {
    if(req.body.bidang_name) {
        let bidang = await kv.get('bidangList') || [];
        bidang.push(req.body.bidang_name);
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
