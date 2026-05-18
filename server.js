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
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// Inisialisasi Koneksi ke Upstash Redis KV
const kv = createClient({
  url: process.env.KV2_KV_REST_API_URL || 'https://stable-gazelle-127629.upstash.io',
  token: process.env.KV2_KV_REST_API_TOKEN || 'gQAAAAAAAfKNAAIgcDEyZWI1YmIzNDBmNWQ0ZjY1YjI5NTZmOTU2NjMyZDFhMg',
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.set('trust proxy', 1);

// Fungsi Helper untuk Inisialisasi Default Data
async function initDefaultData() {
    // Cek salah satu data utama
    const hasInit = await kv.get('siteSettings');
    if (!hasInit) {
        await kv.set('newsList', []);
        await kv.set('albumsList', []);
        await kv.set('pengurusList', []);
        await kv.set('bidangList', []);
        await kv.set('kohatiPengurusList', []);
        await kv.set('kohatiBidangList', []);
        await kv.set('dataAnggotaList', []);
        await kv.set('shortlinkList', []);
        
        await kv.set('siteSettings', {
            webTitle: 'HMI KomKG-UMI',
            headerLogo: '/img/logo-hmikomkgumi.png',
            footerLogo: '/img/logo-hmikomkgumi.png',
            footerTitle: 'Komisariat Kedokteran Gigi UMI',
            footerDesc: 'Tempat berkembang bareng untuk generasi muslim yang progresif, intelektual, dan menjunjung tinggi nilai-nilai keislaman dan keindonesiaan dalam lingkup Kedokteran Gigi.',
            footerCopyright: '© 2026 HMI Komisariat Kedokteran Gigi UMI. All rights reserved.',
            footerProgrammer: '💻 Axa Xyz',
            kohatiActive: true,
            profilText: '<p>Halaman profil ini berisi deskripsi singkat mengenai sejarah, visi, dan misi Himpunan Mahasiswa Islam Komisariat Kedokteran Gigi Universitas Muslim Indonesia...</p>',
            visiMisiText: '<h3>Visi</h3><p>Terbinanya insan akademis...</p><h3>Misi</h3><ul><li>1. Reaktualisasi...</li></ul>',
            mapsEmbed: '',
            bookletPdf: '',
            announceActive: false,
            announceImage: '',
            announceTitle: 'Informasi Penting!',
            announceContent: 'Silakan baca pengumuman ini.'
        });

        await kv.set('socialMediaList', [
            { id: 1, name: 'Instagram', url: 'https://instagram.com/hmi_komkgumi', icon: '' },
            { id: 2, name: 'Facebook', url: 'https://facebook.com/hmi_komkgumi', icon: '' }
        ]);
    }
}

// Auto-Migrasi
async function upgradeDataFormat() {
    let bidang = await kv.get('bidangList');
    if (bidang && bidang.length > 0 && typeof bidang[0] === 'string') {
        const upgraded = bidang.map((b, i) => ({ id: Date.now() + i, name: b, members: [] }));
        await kv.set('bidangList', upgraded);
    }
}

(async () => {
    try {
        await initDefaultData();
        await upgradeDataFormat();
        console.log("Database Redis & Struktur Baru berhasil terkoneksi.");
    } catch (err) {
        console.error("Gagal inisialisasi Redis:", err.message);
    }
})();

// MIDDLEWARE GLOBAL: Mengambil Pengaturan Web untuk Header & Footer
app.use(async (req, res, next) => {
    try {
        // Hindari pemanggilan ke DB jika merender aset statis
        if (req.path.startsWith('/css/') || req.path.startsWith('/img/')) return next();
        
        res.locals.siteSettings = await kv.get('siteSettings') || {};
        res.locals.socialMediaList = await kv.get('socialMediaList') || [];
        next();
    } catch (err) {
        res.locals.siteSettings = {}; res.locals.socialMediaList = [];
        next();
    }
});

// --- ROUTES HALAMAN UTAMA ---
app.get('/', async (req, res) => {
    try {
        let news = await kv.get('newsList') || [];
        const filter = req.query.filter; 
        if (filter && filter !== 'Semua') {
            news = news.filter(n => n.category.toLowerCase() === filter.toLowerCase());
        }
        res.render('index', { page: 'beranda', news, currentFilter: filter || 'Semua' });
    } catch (err) {
        res.render('index', { page: 'beranda', news: [], currentFilter: 'Semua' });
    }
});

app.get('/berita/:id', async (req, res) => {
    try {
        const newsList = await kv.get('newsList') || [];
        const berita = newsList.find(n => n.id === parseInt(req.params.id));
        if (!berita) return res.status(404).render('admin-404', { page: '404' });
        res.render('berita-detail', { page: 'beranda', berita });
    } catch (err) {
        res.status(500).render('admin-404', { page: '404' });
    }
});

app.get('/tentang', async (req, res) => {
    try {
        const pengurus = await kv.get('pengurusList') || [];
        const bidang = await kv.get('bidangList') || [];
        const kohatiPengurus = await kv.get('kohatiPengurusList') || [];
        const kohatiBidang = await kv.get('kohatiBidangList') || [];
        res.render('tentang', { page: 'tentang', pengurus, bidang, kohatiPengurus, kohatiBidang });
    } catch (err) {
        res.render('tentang', { page: 'tentang', pengurus: [], bidang: [], kohatiPengurus:[], kohatiBidang:[] });
    }
});

app.get('/galeri', async (req, res) => {
    try {
        const albums = await kv.get('albumsList') || [];
        res.render('galeri', { page: 'galeri', albums });
    } catch (err) {
        res.render('galeri', { page: 'galeri', albums: [] });
    }
});

app.get('/galeri/:id', async (req, res) => {
    try {
        const albums = await kv.get('albumsList') || [];
        const album = albums.find(a => a.id === parseInt(req.params.id));
        if (!album) return res.status(404).render('admin-404', { page: '404' });
        res.render('galeri-detail', { page: 'galeri', album });
    } catch (err) {
        res.status(500).render('admin-404', { page: '404' });
    }
});

app.get('/data-anggota', async (req, res) => {
    try {
        const dataAnggota = await kv.get('dataAnggotaList') || [];
        res.render('data-anggota', { page: 'data-anggota', dataAnggota });
    } catch (err) {
        res.render('data-anggota', { page: 'data-anggota', dataAnggota: [] });
    }
});

// --- ROUTES ADMIN ---
app.get('/admin', (req, res) => {
    if(req.cookies.admin_auth === 'true') return res.redirect('/admin/dashboard');
    res.render('admin-login', { page: 'admin', error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if(username === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASS || 'password')) {
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
    try {
        const news = await kv.get('newsList') || [];
        const albums = await kv.get('albumsList') || [];
        const pengurus = await kv.get('pengurusList') || [];
        const bidang = await kv.get('bidangList') || [];
        const kohatiPengurus = await kv.get('kohatiPengurusList') || [];
        const kohatiBidang = await kv.get('kohatiBidangList') || [];
        const dataAnggota = await kv.get('dataAnggotaList') || [];
        const shortlinks = await kv.get('shortlinkList') || [];
        res.render('admin-dashboard', { page: 'admin', news, albums, pengurus, bidang, kohatiPengurus, kohatiBidang, dataAnggota, shortlinks });
    } catch (err) {
        res.send("Terjadi error koneksi ke Upstash KV saat memuat dashboard.");
    }
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('admin_auth');
    res.redirect('/admin');
});

// =========================================================================================
// FITUR POST & UPDATE DATA MENGGUNAKAN UPLOAD.ANY() AGAR MULTER BISA BACA SEMUA FIELD FILES
// =========================================================================================

// --- 1. KELOLA DATA BERITA & GALERI ---
app.post('/admin/tambah-berita', requireAdmin, upload.any(), async (req, res) => {
    const { title, category, content, image_b64 } = req.body;
    let news = await kv.get('newsList') || [];
    news.unshift({ id: Date.now(), title, category, date: new Date().toLocaleDateString('id-ID'), content, image: image_b64 || '', photos: [] });
    await kv.set('newsList', news);
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-berita/:id', requireAdmin, upload.any(), async (req, res) => {
    const { title, category, content, date, image_b64 } = req.body;
    let news = await kv.get('newsList') || [];
    let index = news.findIndex(n => n.id === parseInt(req.params.id));
    if (index !== -1) {
        news[index].title = title; news[index].category = category; news[index].content = content;
        if (date) news[index].date = date; 
        if (image_b64) news[index].image = image_b64; 
        await kv.set('newsList', news);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-berita/:id', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || [];
    news = news.filter(n => n.id !== parseInt(req.params.id));
    await kv.set('newsList', news);
    res.redirect('/admin/dashboard');
});
app.post('/admin/tambah-foto-berita/:id', requireAdmin, upload.any(), async (req, res) => {
    let photosB64 = req.body.photos_b64;
    let newPhotos = [];
    if (photosB64) {
        if (!Array.isArray(photosB64)) photosB64 = [photosB64];
        photosB64.forEach(b64 => { newPhotos.push({ id: Date.now() + Math.random(), url: b64 }); });
    }
    let news = await kv.get('newsList') || [];
    let index = news.findIndex(n => n.id === parseInt(req.params.id));
    if (index !== -1) {
        if (!news[index].photos) news[index].photos = [];
        news[index].photos = [...news[index].photos, ...newPhotos];
        await kv.set('newsList', news);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-foto-berita/:beritaId/:photoId', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || [];
    let index = news.findIndex(n => n.id === parseInt(req.params.beritaId));
    if (index !== -1 && news[index].photos) {
        news[index].photos = news[index].photos.filter(p => p.id !== parseFloat(req.params.photoId));
        await kv.set('newsList', news);
    }
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-album', requireAdmin, upload.any(), async (req, res) => {
    const { title, cover_b64 } = req.body;
    let albums = await kv.get('albumsList') || [];
    albums.unshift({ id: Date.now(), title, date: new Date().toLocaleDateString('id-ID'), cover: cover_b64 || '', photos: [] });
    await kv.set('albumsList', albums);
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-album/:id', requireAdmin, upload.any(), async (req, res) => {
    const { title, date, cover_b64 } = req.body;
    let albums = await kv.get('albumsList') || [];
    let index = albums.findIndex(a => a.id === parseInt(req.params.id));
    if (index !== -1) {
        albums[index].title = title;
        if (date) albums[index].date = date; 
        if (cover_b64) albums[index].cover = cover_b64; 
        await kv.set('albumsList', albums);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-album/:id', requireAdmin, async (req, res) => {
    let albums = await kv.get('albumsList') || [];
    albums = albums.filter(a => a.id !== parseInt(req.params.id));
    await kv.set('albumsList', albums);
    res.redirect('/admin/dashboard');
});
app.post('/admin/tambah-foto-album/:id', requireAdmin, upload.any(), async (req, res) => {
    let photosB64 = req.body.photos_b64;
    let newPhotos = [];
    if (photosB64) {
        if (!Array.isArray(photosB64)) photosB64 = [photosB64];
        photosB64.forEach(b64 => { newPhotos.push({ id: Date.now() + Math.random(), url: b64 }); });
    }
    let albums = await kv.get('albumsList') || [];
    let index = albums.findIndex(a => a.id === parseInt(req.params.id));
    if (index !== -1) {
        if (!albums[index].photos) albums[index].photos = [];
        albums[index].photos = [...albums[index].photos, ...newPhotos];
        await kv.set('albumsList', albums);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-foto-album/:albumId/:photoId', requireAdmin, async (req, res) => {
    let albums = await kv.get('albumsList') || [];
    let index = albums.findIndex(a => a.id === parseInt(req.params.albumId));
    if (index !== -1 && albums[index].photos) {
        albums[index].photos = albums[index].photos.filter(p => p.id !== parseFloat(req.params.photoId));
        await kv.set('albumsList', albums);
    }
    res.redirect('/admin/dashboard');
});

// --- 2. KELOLA DATA ANGGOTA (PDF) ---
app.post('/admin/tambah-data-anggota', requireAdmin, upload.any(), async (req, res) => {
    const { title, date, file_b64 } = req.body;
    let dataAnggota = await kv.get('dataAnggotaList') || [];
    dataAnggota.unshift({ id: Date.now(), title, date: date || new Date().toLocaleDateString('id-ID'), file: file_b64 || '' });
    await kv.set('dataAnggotaList', dataAnggota);
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-data-anggota/:id', requireAdmin, upload.any(), async (req, res) => {
    const { title, date, file_b64 } = req.body;
    let dataAnggota = await kv.get('dataAnggotaList') || [];
    let index = dataAnggota.findIndex(d => d.id === parseInt(req.params.id));
    if (index !== -1) {
        dataAnggota[index].title = title;
        if (date) dataAnggota[index].date = date;
        if (file_b64) dataAnggota[index].file = file_b64;
        await kv.set('dataAnggotaList', dataAnggota);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-data-anggota/:id', requireAdmin, async (req, res) => {
    let dataAnggota = await kv.get('dataAnggotaList') || [];
    dataAnggota = dataAnggota.filter(d => d.id !== parseInt(req.params.id));
    await kv.set('dataAnggotaList', dataAnggota);
    res.redirect('/admin/dashboard');
});


// --- 3. KELOLA PENGURUS & BIDANG (UMUM) ---
app.post('/admin/tambah-pengurus', requireAdmin, upload.any(), async (req, res) => {
    const { name, role, image_b64 } = req.body;
    let pengurus = await kv.get('pengurusList') || [];
    pengurus.push({ id: Date.now(), name, role, image: image_b64 || '' });
    await kv.set('pengurusList', pengurus);
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-pengurus/:id', requireAdmin, upload.any(), async (req, res) => {
    const { name, role, image_b64 } = req.body;
    let pengurus = await kv.get('pengurusList') || [];
    let index = pengurus.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        pengurus[index].name = name; pengurus[index].role = role;
        if (image_b64) pengurus[index].image = image_b64;
        await kv.set('pengurusList', pengurus);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-pengurus/:id', requireAdmin, async (req, res) => {
    let pengurus = await kv.get('pengurusList') || [];
    pengurus = pengurus.filter(p => p.id !== parseInt(req.params.id));
    await kv.set('pengurusList', pengurus);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-bidang', requireAdmin, async (req, res) => {
    if(req.body.bidang_name) {
        let bidang = await kv.get('bidangList') || [];
        bidang.push({ id: Date.now(), name: req.body.bidang_name, members: [] });
        await kv.set('bidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-bidang/:id', requireAdmin, async (req, res) => {
    let bidang = await kv.get('bidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.id));
    if(bIndex !== -1 && req.body.bidang_name) {
        bidang[bIndex].name = req.body.bidang_name;
        await kv.set('bidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-bidang/:id', requireAdmin, async (req, res) => {
    let bidang = await kv.get('bidangList') || [];
    bidang = bidang.filter(b => b.id !== parseInt(req.params.id));
    await kv.set('bidangList', bidang);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-anggota-bidang/:bidangId', requireAdmin, upload.any(), async (req, res) => {
    const { name, image_b64 } = req.body;
    let bidang = await kv.get('bidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1) {
        if(!bidang[bIndex].members) bidang[bIndex].members = [];
        bidang[bIndex].members.push({ id: Date.now(), name, image: image_b64 || '' });
        await kv.set('bidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-anggota-bidang/:bidangId/:memberId', requireAdmin, upload.any(), async (req, res) => {
    const { name, image_b64 } = req.body;
    let bidang = await kv.get('bidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1) {
        let mIndex = bidang[bIndex].members.findIndex(m => m.id === parseInt(req.params.memberId));
        if (mIndex !== -1) {
            bidang[bIndex].members[mIndex].name = name;
            if(image_b64) bidang[bIndex].members[mIndex].image = image_b64;
            await kv.set('bidangList', bidang);
        }
    }
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


// --- 4. KELOLA PENGURUS & BIDANG (KHUSUS KOHATI) ---
app.post('/admin/tambah-kohati-pengurus', requireAdmin, upload.any(), async (req, res) => {
    const { name, role, image_b64 } = req.body;
    let pengurus = await kv.get('kohatiPengurusList') || [];
    pengurus.push({ id: Date.now(), name, role, image: image_b64 || '' });
    await kv.set('kohatiPengurusList', pengurus);
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-kohati-pengurus/:id', requireAdmin, upload.any(), async (req, res) => {
    const { name, role, image_b64 } = req.body;
    let pengurus = await kv.get('kohatiPengurusList') || [];
    let index = pengurus.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        pengurus[index].name = name; pengurus[index].role = role;
        if (image_b64) pengurus[index].image = image_b64;
        await kv.set('kohatiPengurusList', pengurus);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-kohati-pengurus/:id', requireAdmin, async (req, res) => {
    let pengurus = await kv.get('kohatiPengurusList') || [];
    pengurus = pengurus.filter(p => p.id !== parseInt(req.params.id));
    await kv.set('kohatiPengurusList', pengurus);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-kohati-bidang', requireAdmin, async (req, res) => {
    if(req.body.bidang_name) {
        let bidang = await kv.get('kohatiBidangList') || [];
        bidang.push({ id: Date.now(), name: req.body.bidang_name, members: [] });
        await kv.set('kohatiBidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-kohati-bidang/:id', requireAdmin, async (req, res) => {
    let bidang = await kv.get('kohatiBidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.id));
    if(bIndex !== -1 && req.body.bidang_name) {
        bidang[bIndex].name = req.body.bidang_name;
        await kv.set('kohatiBidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-kohati-bidang/:id', requireAdmin, async (req, res) => {
    let bidang = await kv.get('kohatiBidangList') || [];
    bidang = bidang.filter(b => b.id !== parseInt(req.params.id));
    await kv.set('kohatiBidangList', bidang);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-anggota-kohati-bidang/:bidangId', requireAdmin, upload.any(), async (req, res) => {
    const { name, image_b64 } = req.body;
    let bidang = await kv.get('kohatiBidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1) {
        if(!bidang[bIndex].members) bidang[bIndex].members = [];
        bidang[bIndex].members.push({ id: Date.now(), name, image: image_b64 || '' });
        await kv.set('kohatiBidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-anggota-kohati-bidang/:bidangId/:memberId', requireAdmin, upload.any(), async (req, res) => {
    const { name, image_b64 } = req.body;
    let bidang = await kv.get('kohatiBidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1) {
        let mIndex = bidang[bIndex].members.findIndex(m => m.id === parseInt(req.params.memberId));
        if (mIndex !== -1) {
            bidang[bIndex].members[mIndex].name = name;
            if(image_b64) bidang[bIndex].members[mIndex].image = image_b64;
            await kv.set('kohatiBidangList', bidang);
        }
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-anggota-kohati-bidang/:bidangId/:memberId', requireAdmin, async (req, res) => {
    let bidang = await kv.get('kohatiBidangList') || [];
    let bIndex = bidang.findIndex(b => b.id === parseInt(req.params.bidangId));
    if (bIndex !== -1 && bidang[bIndex].members) {
        bidang[bIndex].members = bidang[bIndex].members.filter(m => m.id !== parseInt(req.params.memberId));
        await kv.set('kohatiBidangList', bidang);
    }
    res.redirect('/admin/dashboard');
});

// --- 5. SETELAN WEB (HEADER, FOOTER, TENTANG) ---
app.post('/admin/setelan-web', requireAdmin, upload.any(), async (req, res) => {
    let settings = await kv.get('siteSettings') || {};
    
    // Text Fields
    if(req.body.webTitle) settings.webTitle = req.body.webTitle;
    if(req.body.footerTitle) settings.footerTitle = req.body.footerTitle;
    if(req.body.footerDesc) settings.footerDesc = req.body.footerDesc;
    if(req.body.footerCopyright) settings.footerCopyright = req.body.footerCopyright;
    if(req.body.footerProgrammer) settings.footerProgrammer = req.body.footerProgrammer;
    if(req.body.mapsEmbed) settings.mapsEmbed = req.body.mapsEmbed;
    settings.kohatiActive = req.body.kohatiActive === 'on';

    // Rich Texts
    if(req.body.profilText) settings.profilText = req.body.profilText;
    if(req.body.visiMisiText) settings.visiMisiText = req.body.visiMisiText;

    // Base64 Files
    if(req.body.headerLogo_b64) settings.headerLogo = req.body.headerLogo_b64;
    if(req.body.footerLogo_b64) settings.footerLogo = req.body.footerLogo_b64;
    if(req.body.bookletPdf_b64) settings.bookletPdf = req.body.bookletPdf_b64;

    await kv.set('siteSettings', settings);
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-sosmed', requireAdmin, upload.any(), async (req, res) => {
    const { name, url, icon_b64 } = req.body;
    let sosmed = await kv.get('socialMediaList') || [];
    sosmed.push({ id: Date.now(), name, url, icon: icon_b64 || '' });
    await kv.set('socialMediaList', sosmed);
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-sosmed/:id', requireAdmin, async (req, res) => {
    let sosmed = await kv.get('socialMediaList') || [];
    sosmed = sosmed.filter(s => s.id !== parseInt(req.params.id));
    await kv.set('socialMediaList', sosmed);
    res.redirect('/admin/dashboard');
});

// --- 6. ANNOUNCEMENT ---
app.post('/admin/setelan-announcement', requireAdmin, upload.any(), async (req, res) => {
    let settings = await kv.get('siteSettings') || {};
    settings.announceActive = req.body.announceActive === 'on';
    if(req.body.announceTitle) settings.announceTitle = req.body.announceTitle;
    if(req.body.announceContent) settings.announceContent = req.body.announceContent;
    if(req.body.announceImage_b64) settings.announceImage = req.body.announceImage_b64;
    
    await kv.set('siteSettings', settings);
    res.redirect('/admin/dashboard');
});

// --- 7. SHORTLINK CUSTOM ---
app.post('/admin/tambah-shortlink', requireAdmin, async (req, res) => {
    const { title, path, originalUrl } = req.body;
    let links = await kv.get('shortlinkList') || [];
    // Hapus slash awal jika user input dengan slash
    let cleanPath = path.replace(/^\/+/, '');
    links.push({ id: Date.now(), title, path: cleanPath, originalUrl });
    await kv.set('shortlinkList', links);
    res.redirect('/admin/dashboard');
});
app.post('/admin/edit-shortlink/:id', requireAdmin, async (req, res) => {
    const { title, path, originalUrl } = req.body;
    let links = await kv.get('shortlinkList') || [];
    let idx = links.findIndex(l => l.id === parseInt(req.params.id));
    if (idx !== -1) {
        links[idx].title = title;
        links[idx].path = path.replace(/^\/+/, '');
        links[idx].originalUrl = originalUrl;
        await kv.set('shortlinkList', links);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-shortlink/:id', requireAdmin, async (req, res) => {
    let links = await kv.get('shortlinkList') || [];
    links = links.filter(l => l.id !== parseInt(req.params.id));
    await kv.set('shortlinkList', links);
    res.redirect('/admin/dashboard');
});

// WILDCARD ROUTE: Handler Shortlink (Harus Di Atas 404 Middleware)
app.get('/:path', async (req, res, next) => {
    const bypass = ['admin', 'tentang', 'galeri', 'data-anggota', 'berita', 'css', 'img'];
    if (bypass.includes(req.params.path)) return next();
    
    try {
        const shortlinks = await kv.get('shortlinkList') || [];
        const link = shortlinks.find(l => l.path === req.params.path);
        if (link) return res.redirect(link.originalUrl);
    } catch(err) {}
    next();
});

// Middleware 404
app.use((req, res) => {
    res.status(404).render('admin-404', { page: '404' });
});

// Export untuk Vercel Serverless
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
module.exports = app;
