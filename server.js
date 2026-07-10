const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@vercel/kv');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi Multer (Limit besar untuk PDF Base64 & Upload Gambar)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// Inisialisasi Koneksi ke Upstash Redis KV
const kv = createClient({
  url: process.env.KV2_KV_REST_API_URL || 'https://stable-gazelle-127629.upstash.io',
  token: process.env.KV2_KV_REST_API_TOKEN || 'gQAAAAAAAfKNAAIgcDEyZWI1YmIzNDBmNWQ0ZjY1YjI5NTZmOTU2NjMyZDFhMg',
});

// Konfigurasi EJS & Public folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// ==============================================================
// EXPERT SEO: GOOGLE SEARCH CONSOLE FILE VERIFICATION ROUTE
// (Otomatis meloloskan metode verifikasi File HTML di Google)
// ==============================================================
app.get('/googlee9821896ca0e6ace.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send('google-site-verification: googlee9821896ca0e6ace.html');
});

const defaultSettings = {
    webTitle: "HMI KomKG-UMI",
    headerLogo: "/img/logo-hmikomkgumi.png",
    footerLogo: "/img/logo-hmikomkgumi.png",
    headerTitle: "KOM",
    headerHighlight: "KGUMI",
    headerSubtitle: "Kedokteran Gigi UMI",
    heroTitle: "Himpunan Mahasiswa Islam Komisariat Kedokteran Gigi UMI",
    footerTitle: "Komisariat Kedokteran Gigi UMI",
    footerDesc: "Tempat berkembang bareng untuk generasi muslim yang progresif, intelektual, dan menjunjung tinggi nilai-nilai keislaman dan keindonesiaan dalam lingkup Kedokteran Gigi.",
    footerCopyright: "© 2026 HMI Komisariat Kedokteran Gigi UMI. All rights reserved.",
    footerProgrammer: "💻 Axa Xyz",
    kohatiActive: "true",
    profilText: `<p>Halaman profil ini berisi deskripsi singkat mengenai sejarah, visi, dan misi Himpunan Mahasiswa Islam Komisariat Kedokteran Gigi Universitas Muslim Indonesia, serta program kerja dan kegiatan yang telah dan akan dilaksanakan oleh organisasi tersebut.</p>`,
    welcomeText: `<p>Selamat datang di website resmi Himpunan Mahasiswa Islam Komisariat Kedokteran Gigi Universitas Muslim Indonesia. Kami adalah sebuah organisasi mahasiswa yang terdiri dari para mahasiswa kedokteran gigi yang memiliki komitmen untuk meningkatkan kualitas diri dan mengembangkan potensi dalam bidang akademik, keislaman, sosial, dan kemanusiaan. Di sini, Anda dapat menemukan informasi terbaru tentang kegiatan kami, program kerja, dan berbagai kegiatan yang telah kami lakukan. Selamat menjelajahi situs web kami!</p>`,
    visiText: `<p>Terbinanya insan akademis, pencipta, pengabdi yang bernafaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT, khususnya dalam mewujudkan dokter gigi muslim yang profesional.</p>`,
    misiText: `<ol><li>Reaktualisasi nilai-nilai ke-Islaman dalam pengembangan kapasitas diri kader.</li><li>Optimalisasi kesadaran kader terkait isu kesehatan gigi dan masyarakat.</li><li>Memelihara dan mengedepankan nilai-nilai kekeluargaan dalam aktivitas organisasi.</li></ol>`,
    kohatiProfilText: `<p>Korps HMI-Wati (KOHATI) adalah badan khusus HMI yang bertugas membina, mengembangkan, dan meningkatkan potensi HMI-Wati dalam wacana dan dinamika gerakan perempuan. KOHATI Komisariat Kedokteran Gigi UMI mewadahi mahasiswi muslimah untuk mencetak generasi insan cita.</p>`,
    kohatiVisiText: `<p>Terbinanya muslimah berkualitas insan cita.</p>`,
    kohatiMisiText: `<ol><li>Membina HMI-Wati untuk menjadi insan akademis yang profesional.</li><li>Meningkatkan peran serta HMI-Wati dalam memajukan perempuan di bidang kesehatan.</li></ol>`,
    mapsEmbed: "",
    bookletPdf: "",
    announceActive: "false",
    announceImage: "",
    announceTitle: "Latihan Kader I 2025",
    announceContent: "<p>Kala dunia tersihir oleh retorika kosong dan pemikiran instan, kami memilih jalan terjal. Berpikir dalam, bertanya kritis, dan membangun gagasan yang hidup. LK I 2025 bukan sekadar awal; ia adalah dentuman pertama dari revolusi intelektual yang tak akan berhenti di ruang diskusi.</p>"
};

const defaultSocialMedia = [
    { id: 1, name: 'Instagram', icon: '', url: 'https://www.instagram.com/hmi_komkgumi' },
    { id: 2, name: 'Facebook', icon: '', url: 'https://www.facebook.com/hmi_komkgumi' }
];

async function getSiteData() {
    try {
        let settings = await kv.get('siteSettings');
        if (!settings) {
            settings = defaultSettings;
            await kv.set('siteSettings', settings);
        } else {
            for (let key in defaultSettings) {
                if (settings[key] === undefined) settings[key] = defaultSettings[key];
            }
        }
        let socialMediaList = await kv.get('socialMediaList');
        if (!socialMediaList || socialMediaList.length === 0) {
            socialMediaList = defaultSocialMedia;
            await kv.set('socialMediaList', socialMediaList);
        }
        return { siteSettings: settings, socialMediaList };
    } catch (e) {
        return { siteSettings: defaultSettings, socialMediaList: defaultSocialMedia };
    }
}

async function initDefaultData() {
    let hasNews = await kv.get('newsList');
    if (!hasNews || hasNews.length === 0) {
        await kv.set('newsList', [
            { id: 1, title: 'Silaturahmi, Penghargaan dan Launching Kaos', category: 'Terbaru', date: '10 May 2025', content: 'Kegiatan silaturahmi kader...', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80', photos: [] }
        ]);
    }
    let hasAlbums = await kv.get('albumsList');
    if (!hasAlbums || hasAlbums.length === 0) {
        await kv.set('albumsList', [
            { id: 1, title: 'Basic Training (LK I) LXIII', date: '12 Maret 2025', cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80', photos: [] }
        ]);
    }
    let hasPengurus = await kv.get('pengurusList');
    if (!hasPengurus || hasPengurus.length === 0) {
        await kv.set('pengurusList', [
            { id: 1, name: 'Muh. Xavier Syafwan', role: 'Ketua Umum', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80' }
        ]);
    }
    let hasBidang = await kv.get('bidangList');
    if (!hasBidang || hasBidang.length === 0) {
        await kv.set('bidangList', [
            { id: 101, name: 'Bidang PPPA', members: [] },
            { id: 102, name: 'Bidang PTKP', members: [] }
        ]);
    }
    let hasKohatiPengurus = await kv.get('kohatiPengurusList');
    if (!hasKohatiPengurus || hasKohatiPengurus.length === 0) {
        await kv.set('kohatiPengurusList', [
            { id: 1, name: 'Andi Nurul Hidayah', role: 'Ketua Umum KOHATI', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' }
        ]);
    }
    let hasKohatiBidang = await kv.get('kohatiBidangList');
    if (!hasKohatiBidang || hasKohatiBidang.length === 0) {
        await kv.set('kohatiBidangList', [
            { id: 201, name: 'Bidang Eksternal', members: [] }
        ]);
    }
    if (!(await kv.get('dataAnggotaList'))) await kv.set('dataAnggotaList', []);
    if (!(await kv.get('shortlinkList'))) await kv.set('shortlinkList', []);
    
    // BIG UPGRADE: Inisialisasi Bio Pages (Banyak Halaman) & Bio Links
    let bioPages = await kv.get('bioPages');
    if (!bioPages || bioPages.length === 0) {
        await kv.set('bioPages', [{
            id: 1, 
            path: 'links', 
            title: '<h2 style="color: #4ade80;">HMI KomKG-UMI</h2>', 
            bio: 'Official Links Himpunan Mahasiswa Islam Komisariat Kedokteran Gigi UMI',
            profileImage: '/img/logo-hmikomkgumi.png',
            bgType: 'gradient',
            bgValue: 'linear-gradient(135deg, #064e3b 0%, #111827 100%)'
        }]);
    }
    let bioLnk = await kv.get('bioLinks');
    if (!bioLnk) await kv.set('bioLinks', []);
}

(async () => {
    try {
        await getSiteData();
        await initDefaultData();
        console.log("Database Redis berhasil terkoneksi & sinkronisasi sukses.");
    } catch (err) {
        console.error("Gagal inisialisasi Redis:", err.message);
    }
})();

const fileHelper = (req, fieldB64) => {
    let str = req.body[fieldB64] || '';
    if (!str && req.files) {
        const found = req.files.find(f => f.fieldname === fieldB64.replace('_b64', ''));
        if (found) str = `data:${found.mimetype};base64,${found.buffer.toString('base64')}`;
    }
    return str;
};

app.get('/favicon.ico', (req, res) => res.redirect('/img/logo-hmikomkgumi.png'));
app.get('/favicon.png', (req, res) => res.redirect('/img/logo-hmikomkgumi.png'));

// --- API ENDPOINT KHUSUS UNTUK RENDER PDF DEARFLIP ---
app.get('/api/booklet.pdf', async (req, res) => {
    try {
        const b64Data = await kv.get('booklet_file_db'); // Ambil dari database terisolasi
        if (!b64Data || !b64Data.includes('base64,')) {
            return res.status(404).send('PDF not found');
        }
        const base64String = b64Data.split('base64,')[1];
        const pdfBuffer = Buffer.from(base64String, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="Buku_Pedoman.pdf"');
        res.send(pdfBuffer);
    } catch (err) {
        console.error("API PDF Error:", err);
        res.status(500).send("Gagal memuat PDF dari database.");
    }
});

// ==============================================================
// SUPER BIG UPGRADE: EXPERT SEO DYNAMIC SITEMAP.XML GENERATOR
// (Otomatis mendaftarkan Beranda, Tentang, Galeri, dan seluruh Berita ke Google)
// ==============================================================
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = 'https://www.hmikomkgumi.xyz';
        const newsList = await kv.get('newsList') || [];
        const albumsList = await kv.get('albumsList') || [];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        // 1. Daftarkan Halaman Utama (Statis)
        const staticPages = ['', '/tentang', '/galeri', '/data-anggota'];
        staticPages.forEach(page => {
            xml += `  <url>\n    <loc>${baseUrl}${page}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
        });

        // 2. Daftarkan Halaman Detail Berita (Dinamis)
        newsList.forEach(news => {
            xml += `  <url>\n    <loc>${baseUrl}/berita/${news.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
        });

        // 3. Daftarkan Halaman Detail Galeri (Dinamis)
        albumsList.forEach(album => {
            xml += `  <url>\n    <loc>${baseUrl}/galeri/${album.id}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error("Sitemap Error:", err);
        res.status(500).end();
    }
});

app.get('/', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        let news = await kv.get('newsList') || [];
        const filter = req.query.filter; 
        if (filter && filter !== 'Semua') {
            news = news.filter(n => n.category.toLowerCase() === filter.toLowerCase());
        }
        res.render('index', { page: 'beranda', news, currentFilter: filter || 'Semua', siteSettings, socialMediaList });
    } catch (err) {
        res.render('index', { page: 'beranda', news: [], currentFilter: 'Semua', siteSettings: defaultSettings, socialMediaList: defaultSocialMedia });
    }
});

app.get('/berita/:id', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const newsList = await kv.get('newsList') || [];
        const berita = newsList.find(n => n.id === parseInt(req.params.id));
        if (!berita) return res.status(404).render('admin-404', { page: '404', siteSettings, socialMediaList });
        res.render('berita-detail', { page: 'beranda', berita, siteSettings, socialMediaList });
    } catch (err) { res.status(500).send("Error Load Detail Berita"); }
});

app.get('/tentang', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const pengurus = await kv.get('pengurusList') || [];
        const bidang = await kv.get('bidangList') || [];
        const kohatiPengurus = await kv.get('kohatiPengurusList') || [];
        const kohatiBidang = await kv.get('kohatiBidangList') || [];
        res.render('tentang', { page: 'tentang', pengurus, bidang, kohatiPengurus, kohatiBidang, siteSettings, socialMediaList });
    } catch (err) { 
        res.render('tentang', { page: 'tentang', pengurus: [], bidang: [], kohatiPengurus: [], kohatiBidang: [], siteSettings: defaultSettings, socialMediaList: defaultSocialMedia }); 
    }
});

app.get('/galeri', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const albums = await kv.get('albumsList') || [];
        res.render('galeri', { page: 'galeri', albums, siteSettings, socialMediaList });
    } catch (err) { 
        res.render('galeri', { page: 'galeri', albums: [], siteSettings: defaultSettings, socialMediaList: defaultSocialMedia }); 
    }
});

app.get('/galeri/:id', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const albums = await kv.get('albumsList') || [];
        const album = albums.find(a => a.id === parseInt(req.params.id));
        if (!album) return res.status(404).render('admin-404', { page: '404', siteSettings, socialMediaList });
        res.render('galeri-detail', { page: 'galeri', album, siteSettings, socialMediaList });
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/data-anggota', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const dataAnggota = await kv.get('dataAnggotaList') || [];
        res.render('data-anggota', { page: 'data-anggota', dataAnggota, siteSettings, socialMediaList });
    } catch (err) { 
        res.render('data-anggota', { page: 'data-anggota', dataAnggota: [], siteSettings: defaultSettings, socialMediaList: defaultSocialMedia }); 
    }
});

// ==============================================================
// BIG UPGRADE: ROUTING CEK URL UNTUK SHORTLINK ATAU LINK-IN-BIO
// ==============================================================
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug.toLowerCase();
    const reserved = ['admin', 'css', 'img', 'js', 'berita', 'galeri', 'tentang', 'data-anggota', 'api'];
    if (reserved.includes(slug)) return next();
    
    try {
        // 1. Cek apakah slug adalah halaman Link in Bio
        let bioPages = await kv.get('bioPages') || [];
        const bioPage = bioPages.find(p => p.path && p.path.toLowerCase() === slug);
        
        if (bioPage) {
            let allBioLinks = await kv.get('bioLinks') || [];
            // Filter link yang hanya milik bio page ini
            let pageLinks = allBioLinks.filter(l => l.bioPageId == bioPage.id);
            return res.render('bio', { bioPage, bioLinks: pageLinks });
        }

        // 2. Jika bukan bio, cek Shortlink biasa
        const shortlinks = await kv.get('shortlinkList') || [];
        const link = shortlinks.find(s => s.path && s.path.toLowerCase() === slug);
        if (link) return res.redirect(link.originalUrl);
        
    } catch (e) {
        console.error("Slug Route Error:", e);
    }
    next();
});

// --- ADMIN SECURITY ---
app.get('/admin', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        if(req.cookies.admin_auth === 'true') return res.redirect('/admin/dashboard');
        res.render('admin-login', { page: 'admin', error: null, siteSettings, socialMediaList });
    } catch (e) { res.send("Admin Load Error"); }
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASS || 'password')) {
        res.cookie('admin_auth', 'true', { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.redirect('/admin/dashboard');
    } else {
        const { siteSettings, socialMediaList } = await getSiteData();
        res.render('admin-login', { page: 'admin', error: 'Username atau Password salah!', siteSettings, socialMediaList });
    }
});

const requireAdmin = (req, res, next) => {
    if (req.cookies.admin_auth !== 'true') return res.redirect('/admin');
    next();
};

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        
        // =========================================================================
        // DATA SANITIZER & AUTO-HEALING (Pencegah Error 500 EJS Render)
        // Menjamin seluruh data database terbaca aman meskipun format lama corrupt
        // =========================================================================
        const safeArr = (arr) => Array.isArray(arr) ? arr : [];
        const safeStr = (val) => typeof val === 'string' ? val : '';

        const news = safeArr(await kv.get('newsList')).map(x => ({...x, title: safeStr(x.title), category: safeStr(x.category), date: safeStr(x.date), content: safeStr(x.content)}));
        const albums = safeArr(await kv.get('albumsList')).map(x => ({...x, title: safeStr(x.title), date: safeStr(x.date)}));
        
        // UPGRADE SANITIZER: Menambahkan proteksi ke properti Social Media (termasuk TikTok)
        const pengurus = safeArr(await kv.get('pengurusList')).map(x => ({...x, name: safeStr(x.name), role: safeStr(x.role), ig: safeStr(x.ig), fb: safeStr(x.fb), twitter: safeStr(x.twitter), linkedin: safeStr(x.linkedin), tiktok: safeStr(x.tiktok)}));
        const bidang = safeArr(await kv.get('bidangList')).map(x => ({...x, name: safeStr(x.name), members: safeArr(x.members).map(m => ({...m, name: safeStr(m.name), role: safeStr(m.role), ig: safeStr(m.ig), fb: safeStr(m.fb), twitter: safeStr(m.twitter), linkedin: safeStr(m.linkedin), tiktok: safeStr(m.tiktok)}))}));
        const kohatiPengurus = safeArr(await kv.get('kohatiPengurusList')).map(x => ({...x, name: safeStr(x.name), role: safeStr(x.role), ig: safeStr(x.ig), fb: safeStr(x.fb), twitter: safeStr(x.twitter), linkedin: safeStr(x.linkedin), tiktok: safeStr(x.tiktok)}));
        const kohatiBidang = safeArr(await kv.get('kohatiBidangList')).map(x => ({...x, name: safeStr(x.name), members: safeArr(x.members).map(m => ({...m, name: safeStr(m.name), role: safeStr(m.role), ig: safeStr(m.ig), fb: safeStr(m.fb), twitter: safeStr(m.twitter), linkedin: safeStr(m.linkedin), tiktok: safeStr(m.tiktok)}))}));
        
        const dataAnggota = safeArr(await kv.get('dataAnggotaList')).map(x => ({...x, title: safeStr(x.title), date: safeStr(x.date)}));
        const shortlinks = safeArr(await kv.get('shortlinkList')).map(x => ({...x, title: safeStr(x.title), path: safeStr(x.path), originalUrl: safeStr(x.originalUrl)}));
        
        // Panggil Data Link in Bio
        let bioPages = safeArr(await kv.get('bioPages')).map(x => ({...x, path: safeStr(x.path), title: safeStr(x.title), bio: safeStr(x.bio), bgType: safeStr(x.bgType), bgValue: safeStr(x.bgValue)}));
        let bioLinks = safeArr(await kv.get('bioLinks')).map(x => ({...x, title: safeStr(x.title), url: safeStr(x.url)}));

        res.render('admin-dashboard', { 
            page: 'admin', news, albums, pengurus, bidang, dataAnggota, 
            kohatiPengurus, kohatiBidang, shortlinks, siteSettings, socialMediaList,
            bioPages, bioLinks
        });
    } catch (err) { 
        console.error("Dashboard Render Error:", err);
        res.status(500).send("Database Error Dashboard."); 
    }
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('admin_auth');
    res.redirect('/admin');
});

// --- API KELOLA BERITA, GALERI, DATA ANGGOTA ---
app.post('/admin/tambah-berita', requireAdmin, upload.any(), async (req, res) => {
    let news = await kv.get('newsList') || [];
    news.unshift({ id: Date.now(), title: req.body.title, category: req.body.category, date: req.body.date || new Date().toLocaleDateString('id-ID'), content: req.body.content, image: fileHelper(req, 'image_b64'), photos: [] });
    await kv.set('newsList', news); res.redirect('/admin/dashboard');
});
app.post('/admin/edit-berita/:id', requireAdmin, upload.any(), async (req, res) => {
    let news = await kv.get('newsList') || []; let i = news.findIndex(n => n.id == req.params.id);
    if (i !== -1) {
        news[i].title = req.body.title; news[i].category = req.body.category; news[i].content = req.body.content;
        if (req.body.date) news[i].date = req.body.date;
        const img = fileHelper(req, 'image_b64'); if (img) news[i].image = img;
        await kv.set('newsList', news);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-berita/:id', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || []; await kv.set('newsList', news.filter(n => n.id != req.params.id)); res.redirect('/admin/dashboard');
});
app.post('/admin/tambah-foto-berita/:id', requireAdmin, upload.any(), async (req, res) => {
    let photosB64 = req.body.photos_b64; let newPhotos = [];
    if (photosB64) { if (!Array.isArray(photosB64)) photosB64 = [photosB64]; photosB64.forEach(b64 => { newPhotos.push({ id: Date.now() + Math.random(), url: b64 }); }); }
    let news = await kv.get('newsList') || []; let index = news.findIndex(n => n.id == req.params.id);
    if (index !== -1) { if (!news[index].photos) news[index].photos = []; news[index].photos = [...news[index].photos, ...newPhotos]; await kv.set('newsList', news); }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-foto-berita/:beritaId/:photoId', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || []; let index = news.findIndex(n => n.id == req.params.beritaId);
    if (index !== -1 && news[index].photos) { news[index].photos = news[index].photos.filter(p => p.id != req.params.photoId); await kv.set('newsList', news); }
    res.redirect('/admin/dashboard');
});

// SETELAN HEADER & FOOTER & KOHATI
app.post('/admin/setelan-header', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.webTitle = req.body.webTitle || siteSettings.webTitle;
        siteSettings.heroTitle = req.body.heroTitle || siteSettings.heroTitle;
        siteSettings.headerTitle = req.body.headerTitle || siteSettings.headerTitle;
        siteSettings.headerHighlight = req.body.headerHighlight || siteSettings.headerHighlight;
        siteSettings.headerSubtitle = req.body.headerSubtitle || siteSettings.headerSubtitle;
        const hLogo = fileHelper(req, 'headerLogo_b64'); if (hLogo) siteSettings.headerLogo = hLogo;
        await kv.set('siteSettings', siteSettings); res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/setelan-footer', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.footerTitle = req.body.footerTitle || siteSettings.footerTitle;
        siteSettings.footerDesc = req.body.footerDesc || siteSettings.footerDesc;
        siteSettings.footerCopyright = req.body.footerCopyright || siteSettings.footerCopyright;
        siteSettings.footerProgrammer = req.body.footerProgrammer || siteSettings.footerProgrammer;
        const fLogo = fileHelper(req, 'footerLogo_b64'); if (fLogo) siteSettings.footerLogo = fLogo;
        await kv.set('siteSettings', siteSettings); res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/setelan-kohati-toggle', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.kohatiActive = req.body.kohatiActive ? 'true' : 'false';
        await kv.set('siteSettings', siteSettings); res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

// SETELAN TENTANG & PDF DEARFLIP
app.post('/admin/setelan-tentang', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        if (req.body.profilText !== undefined) {
            siteSettings.profilText = req.body.profilText;
            siteSettings.welcomeText = req.body.welcomeText;
            siteSettings.visiText = req.body.visiText;
            siteSettings.misiText = req.body.misiText;
            siteSettings.kohatiProfilText = req.body.kohatiProfilText;
            siteSettings.kohatiVisiText = req.body.kohatiVisiText;
            siteSettings.kohatiMisiText = req.body.kohatiMisiText;
            siteSettings.mapsEmbed = req.body.mapsEmbed !== undefined ? req.body.mapsEmbed : siteSettings.mapsEmbed;

            const bPdf = fileHelper(req, 'bookletPdf_b64'); 
            const pdfUrl = req.body.bookletPdfUrl; 

            if (bPdf && bPdf.length > 50) { 
                try {
                    await kv.set('booklet_file_db', bPdf);
                    siteSettings.bookletPdf = '/api/booklet.pdf';
                } catch (dbErr) {}
            } else if (pdfUrl && pdfUrl.length > 5) { 
                let finalUrl = pdfUrl;
                if(pdfUrl.includes('drive.google.com/file/d/')) {
                    const match = pdfUrl.match(/\/d\/(.*?)\//);
                    if(match && match[1]) {
                        finalUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
                    }
                }
                siteSettings.bookletPdf = finalUrl;
            }
        }
        await kv.set('siteSettings', siteSettings);
        res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/setelan-announcement', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.announceActive = req.body.announceActive ? 'true' : 'false';
        siteSettings.announceTitle = req.body.announceTitle || siteSettings.announceTitle;
        siteSettings.announceContent = req.body.announceContent || siteSettings.announceContent;
        const img = fileHelper(req, 'announceImage_b64'); if (img) siteSettings.announceImage = img;
        await kv.set('siteSettings', siteSettings); res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

// --- API SHORTLINK & SOSMED ---
app.post('/admin/tambah-shortlink', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || []; list.unshift({ id: Date.now(), title: req.body.title, path: req.body.path.replace(/\s+/g, '-').toLowerCase(), originalUrl: req.body.originalUrl }); await kv.set('shortlinkList', list); res.redirect('/admin/dashboard');
});
app.post('/admin/edit-shortlink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || []; let i = list.findIndex(l => l.id == req.params.id);
    if(i !== -1) { list[i].title = req.body.title; list[i].path = req.body.path.replace(/\s+/g, '-').toLowerCase(); list[i].originalUrl = req.body.originalUrl; await kv.set('shortlinkList', list); } res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-shortlink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || []; await kv.set('shortlinkList', list.filter(l => l.id != req.params.id)); res.redirect('/admin/dashboard');
});

// SOSMED EDIT UPDATE
app.post('/admin/tambah-sosmed', requireAdmin, upload.any(), async (req, res) => {
    let list = await kv.get('socialMediaList') || []; list.push({ id: Date.now(), name: req.body.name, url: req.body.url, icon: fileHelper(req, 'icon_b64') }); await kv.set('socialMediaList', list); res.redirect('/admin/dashboard');
});
app.post('/admin/edit-sosmed/:id', requireAdmin, upload.any(), async (req, res) => {
    let list = await kv.get('socialMediaList') || []; let i = list.findIndex(l => l.id == req.params.id);
    if(i !== -1) { list[i].name = req.body.name; list[i].url = req.body.url; const newIcon = fileHelper(req, 'icon_b64'); if (newIcon) list[i].icon = newIcon; await kv.set('socialMediaList', list); } res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-sosmed/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('socialMediaList') || []; await kv.set('socialMediaList', list.filter(l => l.id != req.params.id)); res.redirect('/admin/dashboard');
});

// ==============================================================
// BIG UPGRADE: API PENGELOLAAN LINK IN BIO (MULTIPLE PAGES)
// ==============================================================
app.post('/admin/tambah-bio-page', requireAdmin, upload.any(), async (req, res) => {
    try {
        let pages = await kv.get('bioPages') || [];
        
        let bgType = 'gradient';
        let bgValue = req.body.bgGradient || 'linear-gradient(135deg, #000 0%, #333 100%)';
        const bgImg = fileHelper(req, 'bgImage_b64');
        if (bgImg) {
            bgType = 'image';
            bgValue = bgImg;
        }

        pages.push({
            id: Date.now(),
            path: (req.body.path || '').replace(/\s+/g, '-').toLowerCase(),
            title: req.body.title || 'Untitled', // Diisi aman dari Quill
            bio: req.body.bio || '',
            profileImage: fileHelper(req, 'profileImage_b64') || '/img/logo-hmikomkgumi.png',
            bgType: bgType,
            bgValue: bgValue
        });
        await kv.set('bioPages', pages);
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-bio-page/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let pages = await kv.get('bioPages') || [];
        let i = pages.findIndex(p => p.id == req.params.id);
        if (i !== -1) {
            if (req.body.path) pages[i].path = req.body.path.replace(/\s+/g, '-').toLowerCase();
            if (req.body.title) pages[i].title = req.body.title;
            if (req.body.bio) pages[i].bio = req.body.bio;
            
            const pImg = fileHelper(req, 'profileImage_b64');
            if (pImg) pages[i].profileImage = pImg;

            const bgImg = fileHelper(req, 'bgImage_b64');
            if (bgImg) {
                pages[i].bgType = 'image';
                pages[i].bgValue = bgImg;
            } else if (req.body.bgGradient) {
                pages[i].bgType = 'gradient';
                pages[i].bgValue = req.body.bgGradient;
            }
            await kv.set('bioPages', pages);
        }
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-bio-page/:id', requireAdmin, async (req, res) => {
    let pages = await kv.get('bioPages') || [];
    let links = await kv.get('bioLinks') || [];
    await kv.set('bioPages', pages.filter(p => p.id != req.params.id));
    // Hapus juga semua link yang terkait dengan page ini
    await kv.set('bioLinks', links.filter(l => l.bioPageId != req.params.id));
    res.redirect('/admin/dashboard');
});

// KELOLA TOMBOL LINK BIO
app.post('/admin/tambah-biolink', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('bioLinks') || [];
        list.push({ 
            id: Date.now(), 
            bioPageId: req.body.bioPageId, // ID halaman induk
            title: req.body.title || 'Link', // HTML dari Quill
            url: req.body.url || '#', 
            icon: fileHelper(req, 'icon_b64') 
        });
        await kv.set('bioLinks', list);
        res.redirect('/admin/dashboard');
    } catch(e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-biolink/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('bioLinks') || [];
        let i = list.findIndex(l => l.id == req.params.id);
        if (i !== -1) {
            if (req.body.title) list[i].title = req.body.title;
            if (req.body.url) list[i].url = req.body.url;
            if (req.body.bioPageId) list[i].bioPageId = req.body.bioPageId;
            const newIcon = fileHelper(req, 'icon_b64');
            if (newIcon) list[i].icon = newIcon;
            await kv.set('bioLinks', list);
        }
        res.redirect('/admin/dashboard');
    } catch(e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-biolink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('bioLinks') || [];
    await kv.set('bioLinks', list.filter(l => l.id != req.params.id));
    res.redirect('/admin/dashboard');
});


// ==============================================================
// SUPER BIG UPGRADE: API DINAMIS PENGURUS & BIDANG + SOCIAL MEDIA (TIKTOK)
// ==============================================================
const manageTeam = async (req, res, dbKey, action) => {
    try {
        let list = await kv.get(dbKey) || [];
        if (action === 'add') { 
            list.push({ 
                id: Date.now(), 
                name: req.body.name, 
                role: req.body.role || '', 
                image: fileHelper(req, 'image_b64'),
                ig: req.body.ig || '',
                fb: req.body.fb || '',
                twitter: req.body.twitter || '',
                linkedin: req.body.linkedin || '',
                tiktok: req.body.tiktok || ''
            }); 
        }
        else if (action === 'edit') { 
            let i = list.findIndex(x => x.id == req.params.id); 
            if (i !== -1) { 
                if(req.body.name) list[i].name = req.body.name; 
                if(req.body.role !== undefined) list[i].role = req.body.role; 
                let img = fileHelper(req, 'image_b64'); if (img) list[i].image = img; 
                if(req.body.bidang_name) list[i].name = req.body.bidang_name; 
                if(req.body.ig !== undefined) list[i].ig = req.body.ig;
                if(req.body.fb !== undefined) list[i].fb = req.body.fb;
                if(req.body.twitter !== undefined) list[i].twitter = req.body.twitter;
                if(req.body.linkedin !== undefined) list[i].linkedin = req.body.linkedin;
                if(req.body.tiktok !== undefined) list[i].tiktok = req.body.tiktok;
            } 
        }
        else if (action === 'delete') { list = list.filter(x => x.id != req.params.id); }
        await kv.set(dbKey, list); res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
};

const manageBidangMember = async (req, res, dbKey, action) => {
    try {
        let list = await kv.get(dbKey) || []; let bIndex = list.findIndex(b => b.id == req.params.bidangId);
        if (bIndex !== -1) {
            if (!list[bIndex].members) list[bIndex].members = [];
            if (action === 'add') { 
                list[bIndex].members.push({ 
                    id: Date.now(), 
                    name: req.body.name, 
                    role: req.body.role || '', 
                    image: fileHelper(req, 'image_b64'),
                    ig: req.body.ig || '',
                    fb: req.body.fb || '',
                    twitter: req.body.twitter || '',
                    linkedin: req.body.linkedin || '',
                    tiktok: req.body.tiktok || ''
                }); 
            }
            else if (action === 'edit') { 
                let mIndex = list[bIndex].members.findIndex(m => m.id == req.params.memberId); 
                if (mIndex !== -1) { 
                    if(req.body.name) list[bIndex].members[mIndex].name = req.body.name; 
                    if(req.body.role !== undefined) list[bIndex].members[mIndex].role = req.body.role; 
                    let img = fileHelper(req, 'image_b64'); if (img) list[bIndex].members[mIndex].image = img; 
                    if(req.body.ig !== undefined) list[bIndex].members[mIndex].ig = req.body.ig;
                    if(req.body.fb !== undefined) list[bIndex].members[mIndex].fb = req.body.fb;
                    if(req.body.twitter !== undefined) list[bIndex].members[mIndex].twitter = req.body.twitter;
                    if(req.body.linkedin !== undefined) list[bIndex].members[mIndex].linkedin = req.body.linkedin;
                    if(req.body.tiktok !== undefined) list[bIndex].members[mIndex].tiktok = req.body.tiktok;
                } 
            }
            else if (action === 'delete') { list[bIndex].members = list[bIndex].members.filter(m => m.id != req.params.memberId); }
            await kv.set(dbKey, list);
        }
        res.redirect('/admin/dashboard');
    } catch(e) { res.redirect('/admin/dashboard'); }
};

app.post('/admin/tambah-pengurus', requireAdmin, upload.any(), (req,res) => manageTeam(req,res,'pengurusList','add'));
app.post('/admin/edit-pengurus/:id', requireAdmin, upload.any(), (req,res) => manageTeam(req,res,'pengurusList','edit'));
app.post('/admin/hapus-pengurus/:id', requireAdmin, (req,res) => manageTeam(req,res,'pengurusList','delete'));
app.post('/admin/tambah-bidang', requireAdmin, async (req,res) => { let l = await kv.get('bidangList')||[]; l.push({id:Date.now(), name:req.body.bidang_name, members:[]}); await kv.set('bidangList',l); res.redirect('/admin/dashboard');});
app.post('/admin/edit-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'bidangList','edit'));
app.post('/admin/hapus-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'bidangList','delete'));
app.post('/admin/tambah-anggota-bidang/:bidangId', requireAdmin, upload.any(), (req,res) => manageBidangMember(req,res,'bidangList','add'));
app.post('/admin/edit-anggota-bidang/:bidangId/:memberId', requireAdmin, upload.any(), (req,res) => manageBidangMember(req,res,'bidangList','edit'));
app.post('/admin/hapus-anggota-bidang/:bidangId/:memberId', requireAdmin, (req,res) => manageBidangMember(req,res,'bidangList','delete'));

app.post('/admin/tambah-kohati-pengurus', requireAdmin, upload.any(), (req,res) => manageTeam(req,res,'kohatiPengurusList','add'));
app.post('/admin/edit-kohati-pengurus/:id', requireAdmin, upload.any(), (req,res) => manageTeam(req,res,'kohatiPengurusList','edit'));
app.post('/admin/hapus-kohati-pengurus/:id', requireAdmin, (req,res) => manageTeam(req,res,'kohatiPengurusList','delete'));
app.post('/admin/tambah-kohati-bidang', requireAdmin, async (req,res) => { let l = await kv.get('kohatiBidangList')||[]; l.push({id:Date.now(), name:req.body.bidang_name, members:[]}); await kv.set('kohatiBidangList',l); res.redirect('/admin/dashboard');});
app.post('/admin/edit-kohati-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'kohatiBidangList','edit'));
app.post('/admin/hapus-kohati-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'kohatiBidangList','delete'));
app.post('/admin/tambah-anggota-kohati-bidang/:bidangId', requireAdmin, upload.any(), (req,res) => manageBidangMember(req,res,'kohatiBidangList','add'));
app.post('/admin/edit-anggota-kohati-bidang/:bidangId/:memberId', requireAdmin, upload.any(), (req,res) => manageBidangMember(req,res,'kohatiBidangList','edit'));
app.post('/admin/hapus-anggota-kohati-bidang/:bidangId/:memberId', requireAdmin, (req,res) => manageBidangMember(req,res,'kohatiBidangList','delete'));

// GALERI & PDF DATA ANGGOTA
app.post('/admin/tambah-album', requireAdmin, upload.any(), async (req, res) => { try { let coverStr = fileHelper(req, 'cover_b64'); let albums = await kv.get('albumsList') || []; albums.unshift({ id: Date.now(), title: req.body.title, date: new Date().toLocaleDateString('id-ID'), cover: coverStr, photos: [] }); await kv.set('albumsList', albums); res.redirect('/admin/dashboard'); } catch(e){ res.redirect('/admin/dashboard'); }});
app.post('/admin/edit-album/:id', requireAdmin, upload.any(), async (req, res) => { try { let albums = await kv.get('albumsList') || []; let index = albums.findIndex(a => a.id == req.params.id); if (index !== -1) { albums[index].title = req.body.title; if (req.body.date) albums[index].date = req.body.date; let coverStr = fileHelper(req, 'cover_b64'); if (coverStr) albums[index].cover = coverStr; await kv.set('albumsList', albums); } res.redirect('/admin/dashboard'); } catch(e){ res.redirect('/admin/dashboard'); }});
app.post('/admin/hapus-album/:id', requireAdmin, async (req, res) => { let albums = await kv.get('albumsList') || []; await kv.set('albumsList', albums.filter(a => a.id != req.params.id)); res.redirect('/admin/dashboard'); });
app.post('/admin/tambah-foto-album/:id', requireAdmin, upload.any(), async (req, res) => { try { let photosB64 = req.body.photos_b64; let newPhotos = []; if (photosB64) { if (!Array.isArray(photosB64)) photosB64 = [photosB64]; photosB64.forEach(b64 => { newPhotos.push({ id: Date.now() + Math.random(), url: b64 }); }); } let albums = await kv.get('albumsList') || []; let index = albums.findIndex(a => a.id == req.params.id); if (index !== -1) { if (!albums[index].photos) albums[index].photos = []; albums[index].photos = [...albums[index].photos, ...newPhotos]; await kv.set('albumsList', albums); } res.redirect('/admin/dashboard'); } catch(e){ res.redirect('/admin/dashboard'); }});
app.post('/admin/hapus-foto-album/:albumId/:photoId', requireAdmin, async (req, res) => { let albums = await kv.get('albumsList') || []; let index = albums.findIndex(a => a.id == req.params.albumId); if (index !== -1 && albums[index].photos) { albums[index].photos = albums[index].photos.filter(p => p.id != req.params.photoId); await kv.set('albumsList', albums); } res.redirect('/admin/dashboard'); });

app.post('/admin/tambah-data-anggota', requireAdmin, upload.any(), async (req, res) => { try { let fileStr = fileHelper(req, 'file_b64'); let dataAnggota = await kv.get('dataAnggotaList') || []; dataAnggota.unshift({ id: Date.now(), title: req.body.title, date: req.body.date || new Date().toLocaleDateString('id-ID'), file: fileStr }); await kv.set('dataAnggotaList', dataAnggota); res.redirect('/admin/dashboard'); } catch(e){ res.redirect('/admin/dashboard'); }});
app.post('/admin/edit-data-anggota/:id', requireAdmin, upload.any(), async (req, res) => { try { let dataAnggota = await kv.get('dataAnggotaList') || []; let index = dataAnggota.findIndex(d => d.id == req.params.id); if (index !== -1) { dataAnggota[index].title = req.body.title; if (req.body.date) dataAnggota[index].date = req.body.date; let fileStr = fileHelper(req, 'file_b64'); if (fileStr) dataAnggota[index].file = fileStr; await kv.set('dataAnggotaList', dataAnggota); } res.redirect('/admin/dashboard'); } catch(e){ res.redirect('/admin/dashboard'); }});
app.post('/admin/hapus-data-anggota/:id', requireAdmin, async (req, res) => { let dataAnggota = await kv.get('dataAnggotaList') || []; await kv.set('dataAnggotaList', dataAnggota.filter(d => d.id != req.params.id)); res.redirect('/admin/dashboard'); });

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Terjadi Kesalahan Internal di Server.');
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
module.exports = app;
