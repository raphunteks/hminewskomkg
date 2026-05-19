const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@vercel/kv');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi Multer (Limit besar untuk PDF Base64)
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

app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug.toLowerCase();
    const reserved = ['admin', 'css', 'img', 'js', 'berita', 'galeri', 'tentang', 'data-anggota'];
    if (reserved.includes(slug)) return next();
    try {
        const shortlinks = await kv.get('shortlinkList') || [];
        const link = shortlinks.find(s => s.path.toLowerCase() === slug);
        if (link) return res.redirect(link.originalUrl);
    } catch (e) {}
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
        const news = await kv.get('newsList') || [];
        const albums = await kv.get('albumsList') || [];
        const pengurus = await kv.get('pengurusList') || [];
        const bidang = await kv.get('bidangList') || [];
        const dataAnggota = await kv.get('dataAnggotaList') || [];
        const kohatiPengurus = await kv.get('kohatiPengurusList') || [];
        const kohatiBidang = await kv.get('kohatiBidangList') || [];
        const shortlinks = await kv.get('shortlinkList') || [];
        res.render('admin-dashboard', { page: 'admin', news, albums, pengurus, bidang, dataAnggota, kohatiPengurus, kohatiBidang, shortlinks, siteSettings, socialMediaList });
    } catch (err) { res.status(500).send("Database Error Dashboard."); }
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

// --- API SETELAN WEB (AMAN DARI OVERWRITE) ---
app.post('/admin/setelan-web', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        if (req.body.webTitle !== undefined) {
            siteSettings.webTitle = req.body.webTitle;
            siteSettings.heroTitle = req.body.heroTitle || siteSettings.heroTitle;
            siteSettings.headerTitle = req.body.headerTitle || siteSettings.headerTitle;
            siteSettings.headerHighlight = req.body.headerHighlight || siteSettings.headerHighlight;
            siteSettings.headerSubtitle = req.body.headerSubtitle || siteSettings.headerSubtitle;
            siteSettings.footerTitle = req.body.footerTitle || siteSettings.footerTitle;
            siteSettings.footerDesc = req.body.footerDesc || siteSettings.footerDesc;
            siteSettings.footerCopyright = req.body.footerCopyright || siteSettings.footerCopyright;
            siteSettings.footerProgrammer = req.body.footerProgrammer || siteSettings.footerProgrammer;

            const hLogo = fileHelper(req, 'headerLogo_b64'); if (hLogo) siteSettings.headerLogo = hLogo;
            const fLogo = fileHelper(req, 'footerLogo_b64'); if (fLogo) siteSettings.footerLogo = fLogo;
        } 
        await kv.set('siteSettings', siteSettings);
        res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/setelan-kohati-toggle', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.kohatiActive = req.body.kohatiActive ? 'true' : 'false';
        await kv.set('siteSettings', siteSettings);
        res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/setelan-tentang', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        if (req.body.profilText !== undefined) {
            siteSettings.profilText = req.body.profilText;
            siteSettings.welcomeText = req.body.welcomeText || siteSettings.welcomeText;
            siteSettings.visiText = req.body.visiText || siteSettings.visiText;
            siteSettings.misiText = req.body.misiText || siteSettings.misiText;
            
            siteSettings.kohatiProfilText = req.body.kohatiProfilText || siteSettings.kohatiProfilText;
            siteSettings.kohatiVisiText = req.body.kohatiVisiText || siteSettings.kohatiVisiText;
            siteSettings.kohatiMisiText = req.body.kohatiMisiText || siteSettings.kohatiMisiText;
            
            siteSettings.mapsEmbed = req.body.mapsEmbed !== undefined ? req.body.mapsEmbed : siteSettings.mapsEmbed;

            const bPdf = fileHelper(req, 'bookletPdf_b64'); if (bPdf) siteSettings.bookletPdf = bPdf;
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
        await kv.set('siteSettings', siteSettings);
        res.redirect('/admin/dashboard');
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

app.post('/admin/tambah-sosmed', requireAdmin, upload.any(), async (req, res) => {
    let list = await kv.get('socialMediaList') || []; list.push({ id: Date.now(), name: req.body.name, url: req.body.url, icon: fileHelper(req, 'icon_b64') }); await kv.set('socialMediaList', list); res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-sosmed/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('socialMediaList') || []; await kv.set('socialMediaList', list.filter(l => l.id != req.params.id)); res.redirect('/admin/dashboard');
});

// --- API DINAMIS PENGURUS & BIDANG ---
const manageTeam = async (req, res, dbKey, action) => {
    try {
        let list = await kv.get(dbKey) || [];
        if (action === 'add') { list.push({ id: Date.now(), name: req.body.name, role: req.body.role || '', image: fileHelper(req, 'image_b64') }); }
        else if (action === 'edit') { let i = list.findIndex(x => x.id == req.params.id); if (i !== -1) { if(req.body.name) list[i].name = req.body.name; if(req.body.role) list[i].role = req.body.role; let img = fileHelper(req, 'image_b64'); if (img) list[i].image = img; if(req.body.bidang_name) list[i].name = req.body.bidang_name; } }
        else if (action === 'delete') { list = list.filter(x => x.id != req.params.id); }
        await kv.set(dbKey, list); res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
};

const manageBidangMember = async (req, res, dbKey, action) => {
    try {
        let list = await kv.get(dbKey) || []; let bIndex = list.findIndex(b => b.id == req.params.bidangId);
        if (bIndex !== -1) {
            if (!list[bIndex].members) list[bIndex].members = [];
            if (action === 'add') { list[bIndex].members.push({ id: Date.now(), name: req.body.name, role: req.body.role || '', image: fileHelper(req, 'image_b64') }); }
            else if (action === 'edit') { let mIndex = list[bIndex].members.findIndex(m => m.id == req.params.memberId); if (mIndex !== -1) { list[bIndex].members[mIndex].name = req.body.name; list[bIndex].members[mIndex].role = req.body.role || ''; let img = fileHelper(req, 'image_b64'); if (img) list[bIndex].members[mIndex].image = img; } }
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

// GALERI & PDF
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
