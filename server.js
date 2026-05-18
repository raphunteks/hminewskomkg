const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@vercel/kv');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

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
app.use(require('express-session')({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// --- STRUKTUR SETTINGS DEFAULT ---
const defaultSettings = {
    webTitle: "HMI KomKG-UMI",
    headerTitle: "KOM",
    headerHighlight: "KGUMI",
    headerSubtitle: "Kedokteran Gigi UMI",
    footerDesc: "Tempat berkembang bareng untuk generasi muslim yang progresif, intelektual, dan menjunjung tinggi nilai-nilai keislaman dan keindonesiaan dalam lingkup Kedokteran Gigi.",
    copyright: "© 2026 HMI Komisariat Kedokteran Gigi UMI. All rights reserved.",
    programmer: "💻 Axa Xyz",
    kohatiActive: "true",
    logo: "/img/logo-hmikomkgumi.png",
    aboutProfil: "Halaman profil ini berisi...",
    aboutVisi: "Terbinanya insan akademis...",
    aboutMisi: "<ul><li>Reaktualisasi nilai ke-Islaman...</li></ul>",
    mapsUrl: "",
    bookletPdf: ""
};

// --- FUNGSI GLOBAL DATA & INISIALISASI ---
async function getGlobalData() {
    let settings = await kv.get('siteSettings');
    if (!settings) { await kv.set('siteSettings', defaultSettings); settings = defaultSettings; }
    
    let social = await kv.get('socialMediaList');
    if (!social) { 
        social = [
            { id: 1, name: 'Instagram', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg', url: 'https://www.instagram.com/hmi_komkgumi' },
            { id: 2, name: 'Facebook', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg', url: 'https://www.facebook.com/hmi_komkgumi' }
        ];
        await kv.set('socialMediaList', social); 
    }
    
    let announcement = await kv.get('announcementSettings');
    if (!announcement) { announcement = { active: 'false', title: '', content: '', image: '' }; await kv.set('announcementSettings', announcement); }
    
    return { settings, social, announcement };
}

// Inisialisasi Database (Auto-Run)
(async () => {
    try {
        await getGlobalData();
        const d_pengurus = await kv.get('pengurusList'); if(!d_pengurus) await kv.set('pengurusList', []);
        const d_bidang = await kv.get('bidangList'); if(!d_bidang) await kv.set('bidangList', []);
        const d_ko_pengurus = await kv.get('kohatiPengurusList'); if(!d_ko_pengurus) await kv.set('kohatiPengurusList', []);
        const d_ko_bidang = await kv.get('kohatiBidangList'); if(!d_ko_bidang) await kv.set('kohatiBidangList', []);
        const d_shortlink = await kv.get('shortlinkList'); if(!d_shortlink) await kv.set('shortlinkList', []);
        console.log("Database Redis Tersinkronisasi.");
    } catch (err) { console.error("Redis Init Error:", err.message); }
})();

// --- ROUTES HALAMAN PUBLIK ---
app.get('/', async (req, res) => {
    try {
        const globalData = await getGlobalData();
        let news = await kv.get('newsList') || [];
        const filter = req.query.filter; 
        if (filter && filter !== 'Semua') news = news.filter(n => n.category.toLowerCase() === filter.toLowerCase());
        res.render('index', { page: 'beranda', news, currentFilter: filter || 'Semua', globalData });
    } catch (err) { res.status(500).send("Error Load Page"); }
});

app.get('/berita/:id', async (req, res) => {
    try {
        const globalData = await getGlobalData();
        const newsList = await kv.get('newsList') || [];
        const berita = newsList.find(n => n.id === parseInt(req.params.id));
        if (!berita) return res.render('admin-404', { page: '404', globalData });
        res.render('berita-detail', { page: 'beranda', berita, globalData });
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/tentang', async (req, res) => {
    try {
        const globalData = await getGlobalData();
        const pengurus = await kv.get('pengurusList') || [];
        const bidang = await kv.get('bidangList') || [];
        const kohatiPengurus = await kv.get('kohatiPengurusList') || [];
        const kohatiBidang = await kv.get('kohatiBidangList') || [];
        res.render('tentang', { page: 'tentang', pengurus, bidang, kohatiPengurus, kohatiBidang, globalData });
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/galeri', async (req, res) => {
    try {
        const globalData = await getGlobalData();
        const albums = await kv.get('albumsList') || [];
        res.render('galeri', { page: 'galeri', albums, globalData });
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/galeri/:id', async (req, res) => {
    try {
        const globalData = await getGlobalData();
        const albums = await kv.get('albumsList') || [];
        const album = albums.find(a => a.id === parseInt(req.params.id));
        if (!album) return res.render('admin-404', { page: '404', globalData });
        res.render('galeri-detail', { page: 'galeri', album, globalData });
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/data-anggota', async (req, res) => {
    try {
        const globalData = await getGlobalData();
        const dataAnggota = await kv.get('dataAnggotaList') || [];
        res.render('data-anggota', { page: 'data-anggota', dataAnggota, globalData });
    } catch (err) { res.status(500).send("Error"); }
});

// --- SHORTLINK CUSTOM HANDLER ---
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug.toLowerCase();
    const reserved = ['admin', 'css', 'img', 'js', 'berita', 'galeri', 'tentang', 'data-anggota'];
    if(reserved.includes(slug)) return next();

    try {
        const shortlinks = await kv.get('shortlinkList') || [];
        const link = shortlinks.find(s => s.slug.toLowerCase() === slug);
        if (link) return res.redirect(link.target);
    } catch (e) {}
    next();
});

// --- ROUTES ADMIN ---
app.get('/admin', async (req, res) => {
    if(req.cookies.admin_auth === 'true') return res.redirect('/admin/dashboard');
    const globalData = await getGlobalData();
    res.render('admin-login', { page: 'admin', error: null, globalData });
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if(username === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASS || 'password')) {
        res.cookie('admin_auth', 'true', { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.redirect('/admin/dashboard');
    } else {
        const globalData = await getGlobalData();
        res.render('admin-login', { page: 'admin', error: 'Username atau Password salah!', globalData });
    }
});

const requireAdmin = (req, res, next) => {
    if (req.cookies.admin_auth !== 'true') return res.redirect('/admin');
    next();
};

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const globalData = await getGlobalData();
        const news = await kv.get('newsList') || [];
        const albums = await kv.get('albumsList') || [];
        const pengurus = await kv.get('pengurusList') || [];
        const bidang = await kv.get('bidangList') || [];
        const dataAnggota = await kv.get('dataAnggotaList') || [];
        const kohatiPengurus = await kv.get('kohatiPengurusList') || [];
        const kohatiBidang = await kv.get('kohatiBidangList') || [];
        const shortlinks = await kv.get('shortlinkList') || [];
        res.render('admin-dashboard', { page: 'admin', news, albums, pengurus, bidang, dataAnggota, kohatiPengurus, kohatiBidang, shortlinks, globalData });
    } catch (err) { res.send("Error Database Admin."); }
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('admin_auth');
    res.redirect('/admin');
});

// --- API ACTIONS (UMUM) ---
const fileHelper = (req, fieldB64) => {
    let str = req.body[fieldB64] || '';
    if (!str && req.file) str = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    return str;
};

// --- API KELOLA BERITA, GALERI, ANGGOTA (DIPERSINGKAT UNTUK SPACE, LOGIC TETAP SAMA) ---
app.post('/admin/tambah-berita', requireAdmin, upload.single('image'), async (req, res) => {
    let news = await kv.get('newsList') || [];
    news.unshift({ id: Date.now(), title: req.body.title, category: req.body.category, date: new Date().toLocaleDateString('id-ID'), content: req.body.content, image: fileHelper(req, 'image_b64'), photos: [] });
    await kv.set('newsList', news); res.redirect('/admin/dashboard');
});
app.post('/admin/edit-berita/:id', requireAdmin, upload.single('image'), async (req, res) => {
    let news = await kv.get('newsList') || [];
    let i = news.findIndex(n => n.id == req.params.id);
    if (i !== -1) {
        news[i].title = req.body.title; news[i].category = req.body.category; news[i].content = req.body.content;
        if (req.body.date) news[i].date = req.body.date; 
        const img = fileHelper(req, 'image_b64'); if (img) news[i].image = img; 
        await kv.set('newsList', news);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-berita/:id', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || [];
    await kv.set('newsList', news.filter(n => n.id != req.params.id)); res.redirect('/admin/dashboard');
});
app.post('/admin/tambah-foto-berita/:id', requireAdmin, upload.array('photos', 20), async (req, res) => {
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

// --- API SETTINGS / TABS BARU ---
app.post('/admin/update-settings', requireAdmin, upload.single('logo'), async (req, res) => {
    const g = await getGlobalData();
    g.settings.webTitle = req.body.webTitle;
    g.settings.headerTitle = req.body.headerTitle;
    g.settings.headerHighlight = req.body.headerHighlight;
    g.settings.headerSubtitle = req.body.headerSubtitle;
    g.settings.footerDesc = req.body.footerDesc;
    g.settings.copyright = req.body.copyright;
    g.settings.programmer = req.body.programmer;
    g.settings.kohatiActive = req.body.kohatiActive === 'on' ? 'true' : 'false';
    const logoImg = fileHelper(req, 'logo_b64');
    if (logoImg) g.settings.logo = logoImg;
    await kv.set('siteSettings', g.settings);
    res.redirect('/admin/dashboard');
});

app.post('/admin/update-about', requireAdmin, upload.single('bookletPdf'), async (req, res) => {
    const g = await getGlobalData();
    g.settings.aboutProfil = req.body.aboutProfil;
    g.settings.aboutVisi = req.body.aboutVisi;
    g.settings.aboutMisi = req.body.aboutMisi;
    g.settings.mapsUrl = req.body.mapsUrl;
    const pdf = fileHelper(req, 'pdf_b64');
    if (pdf) g.settings.bookletPdf = pdf;
    await kv.set('siteSettings', g.settings);
    res.redirect('/admin/dashboard');
});

app.post('/admin/update-announcement', requireAdmin, upload.single('image'), async (req, res) => {
    let img = fileHelper(req, 'image_b64');
    const ann = {
        active: req.body.active === 'on' ? 'true' : 'false',
        title: req.body.title,
        content: req.body.content,
        image: img || req.body.old_image // Keep old if not uploaded
    };
    await kv.set('announcementSettings', ann);
    res.redirect('/admin/dashboard');
});

// --- API SHORTLINK ---
app.post('/admin/tambah-shortlink', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || [];
    list.unshift({ id: Date.now(), title: req.body.title, slug: req.body.slug.replace(/\s+/g, '-').toLowerCase(), target: req.body.target });
    await kv.set('shortlinkList', list); res.redirect('/admin/dashboard');
});
app.post('/admin/edit-shortlink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || [];
    let i = list.findIndex(l => l.id == req.params.id);
    if(i !== -1) {
        list[i].title = req.body.title; list[i].slug = req.body.slug.replace(/\s+/g, '-').toLowerCase(); list[i].target = req.body.target;
        await kv.set('shortlinkList', list);
    }
    res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-shortlink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || [];
    await kv.set('shortlinkList', list.filter(l => l.id != req.params.id)); res.redirect('/admin/dashboard');
});

// --- API SOSIAL MEDIA ---
app.post('/admin/tambah-sosmed', requireAdmin, upload.single('logo'), async (req, res) => {
    let list = await kv.get('socialMediaList') || [];
    list.push({ id: Date.now(), name: req.body.name, url: req.body.url, logo: fileHelper(req, 'logo_b64') });
    await kv.set('socialMediaList', list); res.redirect('/admin/dashboard');
});
app.post('/admin/hapus-sosmed/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('socialMediaList') || [];
    await kv.set('socialMediaList', list.filter(l => l.id != req.params.id)); res.redirect('/admin/dashboard');
});

// --- API PENGURUS & BIDANG EDIT (UMUM & KOHATI) ---
const manageTeam = async (req, res, dbKey, action, isImageRequired = false) => {
    let list = await kv.get(dbKey) || [];
    if (action === 'add') {
        let img = fileHelper(req, 'image_b64');
        list.push({ id: Date.now(), name: req.body.name, role: req.body.role || '', image: img });
    } else if (action === 'edit') {
        let i = list.findIndex(x => x.id == req.params.id);
        if(i !== -1) {
            if(req.body.name) list[i].name = req.body.name;
            if(req.body.role) list[i].role = req.body.role;
            let img = fileHelper(req, 'image_b64'); if (img) list[i].image = img;
            if(req.body.bidang_name) list[i].name = req.body.bidang_name; 
        }
    } else if (action === 'delete') {
        list = list.filter(x => x.id != req.params.id);
    }
    await kv.set(dbKey, list);
    res.redirect('/admin/dashboard');
};

const manageBidangMember = async (req, res, dbKey, action) => {
    let list = await kv.get(dbKey) || [];
    let bIndex = list.findIndex(b => b.id == req.params.bidangId);
    if(bIndex !== -1) {
        if(!list[bIndex].members) list[bIndex].members = [];
        if(action === 'add') {
            list[bIndex].members.push({ id: Date.now(), name: req.body.name, image: fileHelper(req, 'image_b64') });
        } else if(action === 'edit') {
            let mIndex = list[bIndex].members.findIndex(m => m.id == req.params.memberId);
            if(mIndex !== -1) {
                list[bIndex].members[mIndex].name = req.body.name;
                let img = fileHelper(req, 'image_b64'); if(img) list[bIndex].members[mIndex].image = img;
            }
        } else if(action === 'delete') {
            list[bIndex].members = list[bIndex].members.filter(m => m.id != req.params.memberId);
        }
        await kv.set(dbKey, list);
    }
    res.redirect('/admin/dashboard');
}

// Router Mappings untuk Dinamis Management
app.post('/admin/tambah-pengurus', requireAdmin, upload.single('image'), (req,res) => manageTeam(req,res,'pengurusList','add',true));
app.post('/admin/edit-pengurus/:id', requireAdmin, upload.single('image'), (req,res) => manageTeam(req,res,'pengurusList','edit'));
app.post('/admin/hapus-pengurus/:id', requireAdmin, (req,res) => manageTeam(req,res,'pengurusList','delete'));
app.post('/admin/tambah-bidang', requireAdmin, async (req,res) => { let l = await kv.get('bidangList')||[]; l.push({id:Date.now(), name:req.body.bidang_name, members:[]}); await kv.set('bidangList',l); res.redirect('/admin/dashboard');});
app.post('/admin/edit-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'bidangList','edit'));
app.post('/admin/hapus-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'bidangList','delete'));
app.post('/admin/tambah-anggota-bidang/:bidangId', requireAdmin, upload.single('image'), (req,res) => manageBidangMember(req,res,'bidangList','add'));
app.post('/admin/edit-anggota-bidang/:bidangId/:memberId', requireAdmin, upload.single('image'), (req,res) => manageBidangMember(req,res,'bidangList','edit'));
app.post('/admin/hapus-anggota-bidang/:bidangId/:memberId', requireAdmin, (req,res) => manageBidangMember(req,res,'bidangList','delete'));

// KOHATI
app.post('/admin/tambah-kohati-pengurus', requireAdmin, upload.single('image'), (req,res) => manageTeam(req,res,'kohatiPengurusList','add',true));
app.post('/admin/edit-kohati-pengurus/:id', requireAdmin, upload.single('image'), (req,res) => manageTeam(req,res,'kohatiPengurusList','edit'));
app.post('/admin/hapus-kohati-pengurus/:id', requireAdmin, (req,res) => manageTeam(req,res,'kohatiPengurusList','delete'));
app.post('/admin/tambah-kohati-bidang', requireAdmin, async (req,res) => { let l = await kv.get('kohatiBidangList')||[]; l.push({id:Date.now(), name:req.body.bidang_name, members:[]}); await kv.set('kohatiBidangList',l); res.redirect('/admin/dashboard');});
app.post('/admin/edit-kohati-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'kohatiBidangList','edit'));
app.post('/admin/hapus-kohati-bidang/:id', requireAdmin, (req,res) => manageTeam(req,res,'kohatiBidangList','delete'));
app.post('/admin/tambah-anggota-kohati-bidang/:bidangId', requireAdmin, upload.single('image'), (req,res) => manageBidangMember(req,res,'kohatiBidangList','add'));
app.post('/admin/edit-anggota-kohati-bidang/:bidangId/:memberId', requireAdmin, upload.single('image'), (req,res) => manageBidangMember(req,res,'kohatiBidangList','edit'));
app.post('/admin/hapus-anggota-kohati-bidang/:bidangId/:memberId', requireAdmin, (req,res) => manageBidangMember(req,res,'kohatiBidangList','delete'));

// ALL THE REST FOR GALLERY AND PDF 
app.post('/admin/tambah-album', requireAdmin, upload.single('cover'), async (req, res) => { let coverStr = fileHelper(req, 'cover_b64'); let albums = await kv.get('albumsList') || []; albums.unshift({ id: Date.now(), title: req.body.title, date: new Date().toLocaleDateString('id-ID'), cover: coverStr, photos: [] }); await kv.set('albumsList', albums); res.redirect('/admin/dashboard'); });
app.post('/admin/edit-album/:id', requireAdmin, upload.single('cover'), async (req, res) => { let albums = await kv.get('albumsList') || []; let index = albums.findIndex(a => a.id == req.params.id); if (index !== -1) { albums[index].title = req.body.title; if (req.body.date) albums[index].date = req.body.date; let coverStr = fileHelper(req, 'cover_b64'); if (coverStr) albums[index].cover = coverStr; await kv.set('albumsList', albums); } res.redirect('/admin/dashboard'); });
app.post('/admin/hapus-album/:id', requireAdmin, async (req, res) => { let albums = await kv.get('albumsList') || []; await kv.set('albumsList', albums.filter(a => a.id != req.params.id)); res.redirect('/admin/dashboard'); });
app.post('/admin/tambah-foto-album/:id', requireAdmin, upload.array('photos', 20), async (req, res) => { let photosB64 = req.body.photos_b64; let newPhotos = []; if (photosB64) { if (!Array.isArray(photosB64)) photosB64 = [photosB64]; photosB64.forEach(b64 => { newPhotos.push({ id: Date.now() + Math.random(), url: b64 }); }); } let albums = await kv.get('albumsList') || []; let index = albums.findIndex(a => a.id == req.params.id); if (index !== -1) { if (!albums[index].photos) albums[index].photos = []; albums[index].photos = [...albums[index].photos, ...newPhotos]; await kv.set('albumsList', albums); } res.redirect('/admin/dashboard'); });
app.post('/admin/hapus-foto-album/:albumId/:photoId', requireAdmin, async (req, res) => { let albums = await kv.get('albumsList') || []; let index = albums.findIndex(a => a.id == req.params.albumId); if (index !== -1 && albums[index].photos) { albums[index].photos = albums[index].photos.filter(p => p.id != req.params.photoId); await kv.set('albumsList', albums); } res.redirect('/admin/dashboard'); });

app.post('/admin/tambah-data-anggota', requireAdmin, upload.single('file'), async (req, res) => { let fileStr = fileHelper(req, 'file_b64'); let dataAnggota = await kv.get('dataAnggotaList') || []; dataAnggota.unshift({ id: Date.now(), title: req.body.title, date: req.body.date || new Date().toLocaleDateString('id-ID'), file: fileStr }); await kv.set('dataAnggotaList', dataAnggota); res.redirect('/admin/dashboard'); });
app.post('/admin/edit-data-anggota/:id', requireAdmin, upload.single('file'), async (req, res) => { let dataAnggota = await kv.get('dataAnggotaList') || []; let index = dataAnggota.findIndex(d => d.id == req.params.id); if (index !== -1) { dataAnggota[index].title = req.body.title; if (req.body.date) dataAnggota[index].date = req.body.date; let fileStr = fileHelper(req, 'file_b64'); if (fileStr) dataAnggota[index].file = fileStr; await kv.set('dataAnggotaList', dataAnggota); } res.redirect('/admin/dashboard'); });
app.post('/admin/hapus-data-anggota/:id', requireAdmin, async (req, res) => { let dataAnggota = await kv.get('dataAnggotaList') || []; await kv.set('dataAnggotaList', dataAnggota.filter(d => d.id != req.params.id)); res.redirect('/admin/dashboard'); });

app.use(async (req, res) => {
    const globalData = await getGlobalData();
    res.status(404).render('admin-404', { page: '404', globalData });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
module.exports = app;
