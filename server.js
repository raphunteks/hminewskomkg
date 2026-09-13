const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@vercel/kv');
const dotenv = require('dotenv');
// Muat .env dan env file secara menyeluruh
dotenv.config();
if (fs.existsSync(path.join(__dirname, '.env'))) {
    dotenv.config({ path: path.join(__dirname, '.env'), override: true });
}
if (fs.existsSync(path.join(__dirname, 'env'))) {
    dotenv.config({ path: path.join(__dirname, 'env'), override: true });
}

const app = express();
const port = process.env.PORT || 3000;

// Memastikan direktori upload fisik tersedia di server
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
        console.warn('Direktori public/uploads sudah ada atau dibuat di runtime.');
    }
}

// Konfigurasi Multer Memory Storage (Limit 50MB di buffer, validasi upload spesifik 5MB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// Inisialisasi Koneksi ke Upstash Redis KV
const kv = createClient({
    url: process.env.KV2_KV_REST_API_URL || 'https://stable-gazelle-127629.upstash.io',
    token: process.env.KV2_KV_REST_API_TOKEN || 'gQAAAAAAAfKNAAIgcDEyZWI1YmIzNDBmNWQ0ZjY1YjI5NTZmOTU2NjMyZDFhMg',
});

// Konfigurasi EJS & Public Folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Verifikasi Google Search Console
app.get('/googlee9821896ca0e6ace.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send('google-site-verification: googlee9821896ca0e6ace.html');
});

// ==============================================================
// SEO HELPER FUNCTIONS (XML SANITIZER & DATE FORMATTER)
// ==============================================================
function xmlEscape(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatW3CDate(dateInput) {
    try {
        if (!dateInput) return new Date().toISOString();
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return new Date().toISOString();
        return d.toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
}

function toAbsoluteUrl(urlPath, baseUrl = 'https://www.hmikomkgumi.xyz') {
    if (!urlPath) return '';
    if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
    return `${baseUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
}

// ==============================================================
// DYNAMIC SITEMAP INDEX (GOLD STANDARD GSC - MASTER SITEMAP)
// Mendaftarkan semua sitemap anak ke GSC sekaligus
// ==============================================================
app.get('/sitemap-index.xml', async (req, res) => {
    try {
        const baseUrl = 'https://www.hmikomkgumi.xyz';
        const now = new Date().toISOString();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<!-- ============================================================ -->\n`;
        xml += `<!-- Gold Standard Sitemap Index - HMI KomKG UMI                  -->\n`;
        xml += `<!-- Submit URL INI ke GSC: Penyusunan Indeks > Peta Situs         -->\n`;
        xml += `<!-- ============================================================ -->\n`;
        xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        xml += `              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
        xml += `              xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
        xml += `              http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd">\n\n`;

        // 1. Sitemap Utama (Halaman Statis + Galeri + Bio)
        xml += `    <!-- Sitemap Utama: Halaman Statis, Galeri, Bio -->\n`;
        xml += `    <sitemap>\n`;
        xml += `        <loc>${baseUrl}/sitemap.xml</loc>\n`;
        xml += `        <lastmod>${now}</lastmod>\n`;
        xml += `    </sitemap>\n\n`;

        // 2. Sitemap Berita/News (Google News Extension)
        xml += `    <!-- Sitemap Berita: Artikel & Kajian (Google News Discover) -->\n`;
        xml += `    <sitemap>\n`;
        xml += `        <loc>${baseUrl}/sitemap_news.xml</loc>\n`;
        xml += `        <lastmod>${now}</lastmod>\n`;
        xml += `    </sitemap>\n\n`;

        xml += `</sitemapindex>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.setHeader('X-Robots-Tag', 'noindex');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).send(xml);
    } catch (err) {
        console.error('Error membuat sitemap-index.xml:', err);
        res.status(500).send('Error generating sitemap index');
    }
});

// ==============================================================
// DYNAMIC SITEMAP.XML GENERATOR (100% SSR - GOLD STANDARD GSC)
// ==============================================================
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = 'https://www.hmikomkgumi.xyz';
        const { siteSettings } = await getSiteData();
        
        let newsList = [];
        let albumsList = [];
        let bioPages = [];
        
        try {
            newsList = await kv.get('newsList') || [];
        } catch (e) { console.warn('Gagal memuat newsList untuk sitemap:', e); }

        try {
            albumsList = await kv.get('albumsList') || [];
        } catch (e) { console.warn('Gagal memuat albumsList untuk sitemap:', e); }

        try {
            bioPages = await kv.get('bioPages') || [];
        } catch (e) { console.warn('Gagal memuat bioPages untuk sitemap:', e); }

        const defaultLogo = toAbsoluteUrl(siteSettings.headerLogo || '/img/logo-hmikomkgumi.png', baseUrl);
        const currentDateIso = new Date().toISOString();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
        xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
        xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
        xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd\n`;
        xml += `        http://www.google.com/schemas/sitemap-image/1.1\n`;
        xml += `        http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">\n\n`;

        // 1. Halaman Utama (Prioritas Tertinggi)
        xml += `    <!-- ========================================= -->\n`;
        xml += `    <!-- HALAMAN UTAMA (PRIORITAS 1.0)             -->\n`;
        xml += `    <!-- ========================================= -->\n`;
        xml += `    <url>\n`;
        xml += `        <loc>${baseUrl}/</loc>\n`;
        xml += `        <lastmod>${currentDateIso}</lastmod>\n`;
        xml += `        <changefreq>daily</changefreq>\n`;
        xml += `        <priority>1.0</priority>\n`;
        xml += `        <image:image>\n`;
        xml += `            <image:loc>${xmlEscape(defaultLogo)}</image:loc>\n`;
        xml += `            <image:title>${xmlEscape(siteSettings.heroTitle || siteSettings.webTitle || 'HMI KomKG UMI')}</image:title>\n`;
        xml += `            <image:caption>${xmlEscape(siteSettings.footerDesc || 'Website Resmi HMI Komisariat Kedokteran Gigi UMI')}</image:caption>\n`;
        xml += `        </image:image>\n`;
        xml += `    </url>\n\n`;

        // 2. Pusat Informasi & Menu Utama
        xml += `    <!-- ========================================= -->\n`;
        xml += `    <!-- PUSAT INFORMASI & MENU UTAMA              -->\n`;
        xml += `    <!-- ========================================= -->\n`;
        
        const corePages = [
            { path: '/tentang', priority: '0.9', freq: 'weekly', title: 'Tentang HMI KomKG UMI' },
            { path: '/galeri', priority: '0.9', freq: 'daily', title: 'Galeri Dokumentasi HMI KomKG UMI' },
            { path: '/data-anggota', priority: '0.9', freq: 'weekly', title: 'Database Anggota & Arsip Kader HMI KomKG UMI' },
            { path: '/narahubung', priority: '0.8', freq: 'monthly', title: 'Narahubung & Kontak Resmi HMI KomKG UMI' },
            { path: '/ourteam', priority: '0.8', freq: 'monthly', title: 'Tim Pengembang Sistem HMI KomKG UMI' }
        ];

        corePages.forEach(p => {
            xml += `    <url>\n`;
            xml += `        <loc>${baseUrl}${p.path}</loc>\n`;
            xml += `        <lastmod>${currentDateIso}</lastmod>\n`;
            xml += `        <changefreq>${p.freq}</changefreq>\n`;
            xml += `        <priority>${p.priority}</priority>\n`;
            xml += `        <image:image>\n`;
            xml += `            <image:loc>${xmlEscape(defaultLogo)}</image:loc>\n`;
            xml += `            <image:title>${xmlEscape(p.title)}</image:title>\n`;
            xml += `        </image:image>\n`;
            xml += `    </url>\n`;
        });

        // 3. Artikel Berita & Kajian Terbit (Otomatis Terindeks Realtime)
        if (Array.isArray(newsList) && newsList.length > 0) {
            xml += `\n    <!-- ========================================= -->\n`;
            xml += `    <!-- ARTIKEL BERITA & INFORMASI (DINAMIS KV)   -->\n`;
            xml += `    <!-- ========================================= -->\n`;
            newsList.forEach(item => {
                const slug = item.slug || slugify(item.title) || String(item.id);
                const loc = `${baseUrl}/berita/${encodeURIComponent(slug)}`;
                const itemDate = formatW3CDate(item.date);
                const itemImg = toAbsoluteUrl(item.image || siteSettings.headerLogo || '/img/logo-hmikomkgumi.png', baseUrl);
                
                xml += `    <url>\n`;
                xml += `        <loc>${loc}</loc>\n`;
                xml += `        <lastmod>${itemDate}</lastmod>\n`;
                xml += `        <changefreq>weekly</changefreq>\n`;
                xml += `        <priority>0.8</priority>\n`;
                xml += `        <image:image>\n`;
                xml += `            <image:loc>${xmlEscape(itemImg)}</image:loc>\n`;
                xml += `            <image:title>${xmlEscape(item.title || 'Berita HMI KomKG UMI')}</image:title>\n`;
                if (item.category) {
                    xml += `            <image:caption>${xmlEscape('Kategori: ' + item.category)}</image:caption>\n`;
                }
                xml += `        </image:image>\n`;
                
                if (Array.isArray(item.photos)) {
                    item.photos.slice(0, 5).forEach(photo => {
                        const pUrl = typeof photo === 'string' ? photo : (photo && photo.url);
                        if (pUrl) {
                            xml += `        <image:image>\n`;
                            xml += `            <image:loc>${xmlEscape(toAbsoluteUrl(pUrl, baseUrl))}</image:loc>\n`;
                            xml += `            <image:title>${xmlEscape(item.title || 'Dokumentasi Berita')}</image:title>\n`;
                            xml += `        </image:image>\n`;
                        }
                    });
                }
                xml += `    </url>\n`;
            });
        }

        // 4. Album Galeri Dokumentasi (Otomatis Terindeks Realtime)
        if (Array.isArray(albumsList) && albumsList.length > 0) {
            xml += `\n    <!-- ========================================= -->\n`;
            xml += `    <!-- DETAIL ALBUM GALERI (DINAMIS KV)          -->\n`;
            xml += `    <!-- ========================================= -->\n`;
            albumsList.forEach(album => {
                const loc = `${baseUrl}/galeri/${album.id}`;
                const albumDate = formatW3CDate(album.date);
                const coverImg = toAbsoluteUrl(album.cover || siteSettings.headerLogo || '/img/logo-hmikomkgumi.png', baseUrl);

                xml += `    <url>\n`;
                xml += `        <loc>${loc}</loc>\n`;
                xml += `        <lastmod>${albumDate}</lastmod>\n`;
                xml += `        <changefreq>monthly</changefreq>\n`;
                xml += `        <priority>0.7</priority>\n`;
                xml += `        <image:image>\n`;
                xml += `            <image:loc>${xmlEscape(coverImg)}</image:loc>\n`;
                xml += `            <image:title>${xmlEscape(album.title || 'Dokumentasi Galeri')}</image:title>\n`;
                xml += `        </image:image>\n`;

                if (Array.isArray(album.photos)) {
                    album.photos.slice(0, 8).forEach(p => {
                        const pUrl = typeof p === 'string' ? p : (p && p.url);
                        if (pUrl) {
                            xml += `        <image:image>\n`;
                            xml += `            <image:loc>${xmlEscape(toAbsoluteUrl(pUrl, baseUrl))}</image:loc>\n`;
                            xml += `            <image:title>${xmlEscape(album.title || 'Dokumentasi')}</image:title>\n`;
                            xml += `        </image:image>\n`;
                        }
                    });
                }
                xml += `    </url>\n`;
            });
        }

        // 5. Halaman Publik Bio & Shortlink (Jika Ada)
        if (Array.isArray(bioPages) && bioPages.length > 0) {
            xml += `\n    <!-- ========================================= -->\n`;
            xml += `    <!-- HALAMAN LINK IN BIO (DINAMIS KV)          -->\n`;
            xml += `    <!-- ========================================= -->\n`;
            bioPages.forEach(bio => {
                if (bio && bio.path) {
                    const cleanPath = String(bio.path).replace(/^\/+/, '').toLowerCase();
                    xml += `    <url>\n`;
                    xml += `        <loc>${baseUrl}/${encodeURIComponent(cleanPath)}</loc>\n`;
                    xml += `        <lastmod>${currentDateIso}</lastmod>\n`;
                    xml += `        <changefreq>monthly</changefreq>\n`;
                    xml += `        <priority>0.6</priority>\n`;
                    if (bio.profileImage) {
                        xml += `        <image:image>\n`;
                        xml += `            <image:loc>${xmlEscape(toAbsoluteUrl(bio.profileImage, baseUrl))}</image:loc>\n`;
                        xml += `            <image:title>${xmlEscape(bio.bio || 'Link in Bio')}</image:title>\n`;
                        xml += `        </image:image>\n`;
                    }
                    xml += `    </url>\n`;
                }
            });
        }

        xml += `</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        res.setHeader('X-Robots-Tag', 'noindex');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).send(xml);
    } catch (err) {
        console.error('Error saat membuat dynamic sitemap.xml:', err);
        res.status(500).setHeader('Content-Type', 'text/plain').send('Error generating sitemap');
    }
});

// ==============================================================
// DYNAMIC SITEMAP_NEWS.XML — GOOGLE NEWS SITEMAP (GOLD STANDARD)
// Khusus artikel berita 48 jam terakhir → Google Discover & News
// ==============================================================
app.get('/sitemap_news.xml', async (req, res) => {
    try {
        const baseUrl = 'https://www.hmikomkgumi.xyz';
        const { siteSettings } = await getSiteData();
        const pubName = (siteSettings.headerTitle ? (siteSettings.headerTitle + ' ' + (siteSettings.headerHighlight || '')).trim() : 'HMI KomKG UMI');

        let newsList = [];
        try {
            newsList = await kv.get('newsList') || [];
        } catch (e) { console.warn('Gagal memuat newsList untuk sitemap_news:', e); }

        // Filter: hanya 48 jam terakhir (Google News Standard)
        // Fallback: tampilkan 10 terbaru jika tidak ada dalam 48 jam
        const now = Date.now();
        const ms48h = 48 * 60 * 60 * 1000;
        let recentNews = newsList.filter(item => {
            try {
                const d = new Date(item.date);
                return !isNaN(d.getTime()) && (now - d.getTime()) <= ms48h;
            } catch (e) { return false; }
        });

        // Fallback: 10 artikel terbaru jika tidak ada yang dalam 48 jam
        if (recentNews.length === 0) {
            recentNews = [...newsList]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<!-- ============================================================ -->\n`;
        xml += `<!-- Gold Standard Google News Sitemap - HMI KomKG UMI            -->\n`;
        xml += `<!-- Artikel terbaru untuk Google Discover & Google News           -->\n`;
        xml += `<!-- ============================================================ -->\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
        xml += `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n`;
        xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
        xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
        xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
        xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd\n`;
        xml += `        http://www.google.com/schemas/sitemap-news/0.9\n`;
        xml += `        http://www.google.com/schemas/sitemap-news/0.9/sitemap-news.xsd">\n\n`;

        if (recentNews.length > 0) {
            recentNews.forEach(item => {
                const slug = item.slug || slugify(item.title) || String(item.id);
                const loc = `${baseUrl}/berita/${encodeURIComponent(slug)}`;
                const pubDate = formatW3CDate(item.date);
                const itemImg = toAbsoluteUrl(item.image || siteSettings.headerLogo || '/img/logo-hmikomkgumi.png', baseUrl);
                const safeTitle = xmlEscape(item.title || 'Berita HMI KomKG UMI');
                const safeCategory = xmlEscape(item.category || 'Berita');
                const safePubName = xmlEscape(pubName);

                xml += `    <url>\n`;
                xml += `        <loc>${loc}</loc>\n`;
                xml += `        <lastmod>${pubDate}</lastmod>\n`;
                xml += `        <changefreq>never</changefreq>\n`;
                xml += `        <priority>0.9</priority>\n`;
                // Google News Extension
                xml += `        <news:news>\n`;
                xml += `            <news:publication>\n`;
                xml += `                <news:name>${safePubName}</news:name>\n`;
                xml += `                <news:language>id</news:language>\n`;
                xml += `            </news:publication>\n`;
                xml += `            <news:publication_date>${pubDate}</news:publication_date>\n`;
                xml += `            <news:title>${safeTitle}</news:title>\n`;
                xml += `            <news:keywords>${xmlEscape(safeCategory + ', HMI KomKG UMI, Berita HMI, ' + (item.tags || ''))}</news:keywords>\n`;
                xml += `        </news:news>\n`;
                // Image Extension
                xml += `        <image:image>\n`;
                xml += `            <image:loc>${xmlEscape(itemImg)}</image:loc>\n`;
                xml += `            <image:title>${safeTitle}</image:title>\n`;
                xml += `            <image:caption>${xmlEscape('Berita: ' + (item.category || 'HMI KomKG UMI'))}</image:caption>\n`;
                xml += `        </image:image>\n`;
                // Foto tambahan dari artikel
                if (Array.isArray(item.photos)) {
                    item.photos.slice(0, 3).forEach(photo => {
                        const pUrl = typeof photo === 'string' ? photo : (photo && photo.url);
                        if (pUrl) {
                            xml += `        <image:image>\n`;
                            xml += `            <image:loc>${xmlEscape(toAbsoluteUrl(pUrl, baseUrl))}</image:loc>\n`;
                            xml += `            <image:title>${safeTitle}</image:title>\n`;
                            xml += `        </image:image>\n`;
                        }
                    });
                }
                xml += `    </url>\n`;
            });
        } else {
            // Placeholder jika tidak ada berita sama sekali
            xml += `    <!-- Belum ada artikel berita yang dipublikasikan -->\n`;
        }

        xml += `</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        // Cache lebih pendek untuk sitemap_news (update cepat = Discover lebih cepat)
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
        res.setHeader('X-Robots-Tag', 'noindex');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).send(xml);
    } catch (err) {
        console.error('Error saat membuat dynamic sitemap_news.xml:', err);
        res.status(500).setHeader('Content-Type', 'text/plain').send('Error generating news sitemap');
    }
});

// ==============================================================
// DYNAMIC ROBOTS.TXT GENERATOR (100% SSR - GOLD STANDARD GSC)
// Referensikan ketiga sitemap untuk crawl discovery maksimal
// ==============================================================
app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    
    const robots = [
        '# ==============================================================',
        '# Gold Standard robots.txt - HMI KomKG UMI',
        '# Mengizinkan Googlebot, Bingbot, dan seluruh spider pencarian',
        '# Update: Referensi sitemap-index + sitemap_news (GSC Gold Standard)',
        '# ==============================================================',
        '',
        'User-agent: *',
        'Allow: /',
        '',
        '# Izinkan akses penuh ke file upload publik (Google Images Indexing)',
        'Allow: /api/upload/',
        'Allow: /css/',
        'Allow: /js/',
        'Allow: /img/',
        'Allow: /sitemap.xml',
        'Allow: /sitemap-index.xml',
        'Allow: /sitemap_news.xml',
        '',
        '# Izinkan Googlebot akses semua jenis berkas penting',
        'Allow: /*.js$',
        'Allow: /*.css$',
        'Allow: /*.png$',
        'Allow: /*.jpg$',
        'Allow: /*.gif$',
        'Allow: /*.svg$',
        '',
        '# Blokir perayapan area sensitif & formulir internal',
        'Disallow: /admin',
        'Disallow: /admin/',
        'Disallow: /admin/*',
        'Disallow: /api/kirim-pesan-narahubung',
        'Disallow: /api/analytics',
        'Disallow: /*?*filter=',
        '',
        '# Aturan khusus Googlebot (diprioritaskan untuk indexing)',
        'User-agent: Googlebot',
        'Allow: /',
        'Allow: /sitemap-index.xml',
        'Allow: /sitemap.xml',
        'Allow: /sitemap_news.xml',
        '',
        '# Aturan khusus Googlebot-Image (Google Images Indexing)',
        'User-agent: Googlebot-Image',
        'Allow: /api/upload/',
        'Allow: /img/',
        '',
        '# ==============================================================',
        '# SITEMAP INDEX — Submit URL ini ke GSC: Penyusunan Indeks > Peta Situs',
        '# ==============================================================',
        'Sitemap: https://www.hmikomkgumi.xyz/sitemap-index.xml',
        'Sitemap: https://www.hmikomkgumi.xyz/sitemap.xml',
        'Sitemap: https://www.hmikomkgumi.xyz/sitemap_news.xml',
        '',
        'Host: https://www.hmikomkgumi.xyz'
    ].join('\n');
    
    res.status(200).send(robots);
});

// ==============================================================
// HELPER SEO SLUG GENERATOR (SEO GOLD STANDARD)
// ==============================================================
function slugify(text) {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')     // Hapus karakter non-alfanumerik
        .replace(/[\s_-]+/g, '-')     // Ganti spasi/garis bawah dengan strip
        .replace(/^-+|-+$/g, '');    // Hapus strip di awal dan akhir
}

function generateUniqueSlug(title, customSlug, existingNews, currentId = null) {
    let baseSlug = slugify(customSlug) || slugify(title) || 'berita';
    let slug = baseSlug;
    let counter = 1;
    while (existingNews.some(n => (n.slug === slug || String(n.id) === slug) && n.id != currentId)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    return slug;
}

// ==============================================================
// SEO-FRIENDLY STORAGE HELPER (NON-BASE64 ENGINE)
// ==============================================================
async function saveUploadedFile(req, fieldName, prefix = 'hmi') {
    try {
        let buffer = null;
        let mimeType = 'image/png';
        let ext = '.png';

        const b64Input = req.body[fieldName] || req.body[fieldName + '_b64'];
        
        // 1. Cek jika data dikirim dalam bentuk Base64
        if (b64Input && typeof b64Input === 'string' && b64Input.includes('base64,')) {
            const matches = b64Input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mimeType = matches[1];
                buffer = Buffer.from(matches[2], 'base64');
            }
        } 
        // 2. Cek jika berkas dikirim via multipart FormData (Multer)
        else if (req.files && Array.isArray(req.files)) {
            const rawName = fieldName.replace('_b64', '');
            const found = req.files.find(f => f.fieldname === rawName || f.fieldname === fieldName);
            if (found && found.buffer) {
                buffer = found.buffer;
                mimeType = found.mimetype;
            }
        }

        // Jika bukan upload baru dan sudah berupa URL/Path lama, pertahankan nilai aslinya
        if (!buffer) {
            const rawValue = req.body[fieldName];
            if (rawValue && typeof rawValue === 'string' && !rawValue.startsWith('data:')) {
                return rawValue;
            }
            return '';
        }

        // Tentukan ekstensi berkas secara akurat untuk SEO
        if (mimeType.includes('pdf')) ext = '.pdf';
        else if (mimeType.includes('webp')) ext = '.webp';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
        else if (mimeType.includes('png')) ext = '.png';
        else if (mimeType.includes('svg')) ext = '.svg';

        const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
        const filename = `${safePrefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}${ext}`;
        const localPath = path.join(uploadDir, filename);

        // Simpan secara fisik ke server (jika didukung filesystem)
        try {
            fs.writeFileSync(localPath, buffer);
        } catch (fsErr) {
            console.warn('Filesystem read-only, penyimpanan dialihkan ke Redis KV.');
        }

        // Simpan persistensi permanen di Upstash Redis KV (Cloud Persistence)
        await kv.set(`upload:${filename}`, {
            mime: mimeType,
            data: buffer.toString('base64')
        });

        // Kembalikan URL bersih yang ramah SEO (Google Images Indexing)
        return `/api/upload/${filename}`;
    } catch (err) {
        console.error('Error pada saveUploadedFile:', err);
        return '';
    }
}

// ==============================================================
// ENDPOINT SERVING BERKAS SEO-FRIENDLY (/api/upload/:filename)
// ==============================================================
app.get('/api/upload/:filename', async (req, res) => {
    try {
        const filename = path.basename(req.params.filename);
        const localPath = path.join(uploadDir, filename);

        // Prioritas 1: Sajikan berkas dari penyimpanan lokal jika tersedia
        if (fs.existsSync(localPath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(localPath);
        }

        // Prioritas 2: Fallback ke database Redis KV
        const cloudFile = await kv.get(`upload:${filename}`);
        if (cloudFile && cloudFile.data) {
            const mimeType = cloudFile.mime || 'application/octet-stream';
            const fileBuffer = Buffer.from(cloudFile.data, 'base64');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(fileBuffer);
        }

        return res.status(404).send('Berkas tidak ditemukan.');
    } catch (err) {
        console.error('Error saat menyajikan berkas upload:', err);
        res.status(500).send('Terjadi kesalahan memuat berkas.');
    }
});

// GLOBAL HELPER FUNCTIONS
const safeArr = (arr) => Array.isArray(arr) ? arr : [];
const safeStr = (val) => typeof val === 'string' ? val : '';

// ENDPOINT ANALYTICS REAL-TIME CACHED / PROXY
let cachedAnalytics = { today: 3, week: 7, total: 173, lastUpdate: 0 };
app.get('/api/analytics', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    try {
        const now = Date.now();
        if (now - cachedAnalytics.lastUpdate > 60000) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const gasRes = await fetch("https://script.google.com/macros/s/AKfycbw8MA9YGFK3SIAXhIZAF9m1J4eOGf9LGQD-j4xXjvVSaQ826JrqeEKApPcKJWfJxw/exec?t=" + now, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (gasRes.ok) {
                const text = await gasRes.text();
                const data = JSON.parse(text);
                if (data && (data.total !== undefined || data.today !== undefined)) {
                    cachedAnalytics = {
                        today: Number(data.today) || cachedAnalytics.today,
                        week: Number(data.week) || cachedAnalytics.week,
                        total: Number(data.total) || cachedAnalytics.total,
                        lastUpdate: now
                    };
                }
            }
        }
        res.json({
            status: "success",
            today: cachedAnalytics.today,
            week: cachedAnalytics.week,
            total: cachedAnalytics.total
        });
    } catch (err) {
        res.json({
            status: "fallback",
            today: cachedAnalytics.today,
            week: cachedAnalytics.week,
            total: cachedAnalytics.total
        });
    }
});

// ==============================================================
// 5 SECTIONS BERANDA: DEFAULT DATA SETS
// ==============================================================
const defaultHomePillars = [
    {
        id: 1,
        title: "Insan Akademis",
        subtitle: "Keilmuan & Riset",
        icon: "graduation-cap",
        description: "Menjunjung tinggi tradisi intelektual, literasi ilmiah, dan keunggulan keilmuan mahasiswa kedokteran gigi untuk peradaban bangsa.",
        order: 1
    },
    {
        id: 2,
        title: "Insan Pencipta",
        subtitle: "Inovasi & Kepemimpinan",
        icon: "lightbulb",
        description: "Mencetak kader yang berjiwa pembaharu, adaptif terhadap kemajuan teknologi kesehatan, dan kritis dalam mengawal dinamika keumatan.",
        order: 2
    },
    {
        id: 3,
        title: "Insan Pengabdi",
        subtitle: "Bakti Sosial Profesi",
        icon: "heart-handshake",
        description: "Mendedikasikan ilmu kedokteran gigi secara nyata melalui bakti sosial massal, edukasi kesehatan rongga mulut, dan desa binaan.",
        order: 3
    }
];

const defaultHomePrograms = [
    {
        id: 1,
        title: "Basic Training (Latihan Kader I)",
        category: "Kaderisasi Utama",
        status: "Terlaksana",
        date: "Periode Kepengurusan",
        image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
        description: "Gerbang perkaderan formal HMI untuk menanamkan Nilai Dasar Perjuangan (NDP), wawasan keislaman, keindonesiaan, dan kepemimpinan moral."
    },
    {
        id: 2,
        title: "Dental Social Action (Baksos Gigi & Mulut)",
        category: "Pengabdian Masyarakat",
        status: "Program Unggulan",
        date: "Agenda Rutin",
        image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
        description: "Pelayanan kesehatan gigi cuma-cuma, pencabutan, penambalan, serta penyuluhan sikat gigi massal untuk masyarakat di wilayah pelosok dan pesisir."
    },
    {
        id: 3,
        title: "Dentistry Scientific & Discussion Forum",
        category: "Pengembangan Profesi",
        status: "Sedang Berjalan",
        date: "Bulanan",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
        description: "Forum bedah jurnal, diskusi kasus klinis preklinik-koas, serta temu wicara etika dokter gigi muslim bersama pakar dan alumni."
    }
];

const defaultHomeMilestones = [
    {
        id: 1,
        number: "450+",
        label: "Kader Terbina",
        context: "Alumni & Kader Aktif FKG UMI",
        icon: "users"
    },
    {
        id: 2,
        number: "25+",
        label: "Titik Baksos",
        context: "Desa & Komunitas Terlayani",
        icon: "map-pin"
    },
    {
        id: 3,
        number: "50+",
        label: "Forum Ilmiah",
        context: "Kajian Klinis & Intelektual",
        icon: "book-open"
    },
    {
        id: 4,
        number: "100%",
        label: "Khidmat Yakusa",
        context: "Dedikasi untuk Ummat & Bangsa",
        icon: "award"
    }
];

const defaultHomeTimeline = [
    {
        id: 1,
        period: "Awal Kepengurusan",
        title: "Pelantikan & Rapat Kerja Komisariat",
        description: "Konsolidasi pengurus, perumusan grand design gerakan, dan penetapan matrik program kerja strategis satu periode kepengurusan.",
        status: "Selesai"
    },
    {
        id: 2,
        period: "Fase Pembinaan",
        title: "Kaderisasi Akbar Basic Training (LK-1)",
        description: "Rekrutmen anggota baru lintas angkatan FKG UMI dengan materi ideologi NDP, Konstitusi HMI, Sejarah Perjuangan, dan Kepemimpinan Manajemen.",
        status: "Selesai"
    },
    {
        id: 3,
        period: "Fase Pengabdian",
        title: "Aksi Pengabdian Masyarakat & Edukasi Kesehatan",
        description: "Turun ke masyarakat dalam program bakti sosial terpadu pemeriksaan kesehatan gigi serta penyaluran bantuan sosial.",
        status: "Berjalan"
    },
    {
        id: 4,
        period: "Akhir Periode",
        title: "Konferensi Komisariat (KONFERKOM)",
        description: "Laporan pertanggungjawaban (LPJ) kepengurusan secara transparan dan regenerasi kepemimpinan estafet tongkat estafet perjuangan.",
        status: "Mendatang"
    }
];

const defaultHomeFaq = [
    {
        id: 1,
        question: "Siapa saja yang bisa bergabung dengan HMI KomKG UMI?",
        answer: "Seluruh mahasiswa muslim Fakultas Kedokteran Gigi Universitas Muslim Indonesia (FKG UMI), baik jenjang Pre-Klinik (S.KG) maupun Profesi/Klinik (drg.), berhak bergabung melalui tahapan Basic Training (Latihan Kader I).",
        category: "Keanggotaan"
    },
    {
        id: 2,
        question: "Bagaimana cara membagi waktu antara kuliah kedokteran gigi yang padat dengan berorganisasi di HMI?",
        answer: "HMI KomKG UMI dirancang oleh dan untuk mahasiswa kedokteran gigi! Jadwal kegiatan disesuaikan secara fleksibel dengan jadwal blok, skills lab, ujian OSCE/CBT, dan jadwal kepaniteraan klinik. Di sini kamu justru mendapat support system belajar, tutor sebaya, dan bank soal dari senior koas.",
        category: "Akademik & Waktu"
    },
    {
        id: 3,
        question: "Apa saja manfaat riil yang diperoleh sebagai kader HMI Kedokteran Gigi?",
        answer: "Selain memperluas jaringan alumni dokter gigi di seluruh Indonesia, kamu mengasah public speaking, kepemimpinan etik medis, pengalaman terjun langsung melayani pasien pada kegiatan baksos, serta pendampingan karakter Islami yang kokoh.",
        category: "Pengembangan Diri"
    },
    {
        id: 4,
        question: "Kapan Latihan Kader I (LK-1) berikutnya diselenggarakan?",
        answer: "LK-1 diselenggarakan secara berkala setiap semester. Anda dapat langsung mengklik tombol 'Daftar Basic Training' atau menghubungi narahubung WhatsApp kami untuk informasi gelombang pendaftaran terbaru.",
        category: "Pendaftaran"
    }
];

// ==============================================================
// DEFAULT SETTINGS & INITIAL DATA
// ==============================================================
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
    announceContent: "<p>Kala dunia tersihir oleh retorika kosong dan pemikiran instan, kami memilih jalan terjal. Berpikir dalam, bertanya kritis, dan membangun gagasan yang hidup. LK I 2025 bukan sekadar awal; ia adalah dentuman pertama dari revolusi intelektual yang tak akan berhenti di ruang diskusi.</p>",
    contactAddress: "Jl. Pajonga Dg. Ngalle No. 27 A, Pa'batong, Kec. Mamajang, Kota Makassar, Sulawesi Selatan",
    contactEmail: "hmikomkedokgigiumi.190120@gmail.com",
    contactWa: "+62 853-3892-2586",
    contactWaName: "M. Aksa A",
    contactMaps: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1986.8184522616118!2d119.41377772579179!3d-5.161978821534889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dbf1d606370a527%3A0xdb175c222d9d580b!2sUniversitas%20Muslim%20Indonesia%2C%20Fakultas%20Kedokteran%20Gigi!5e0!3m2!1sid!2sid!4v1789058845150!5m2!1sid!2sid" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
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
            { 
                id: 1, 
                slug: 'silaturahmi-penghargaan-dan-launching-kaos',
                title: 'Silaturahmi, Penghargaan dan Launching Kaos', 
                category: 'Terbaru', 
                date: '10 May 2025', 
                content: 'Kegiatan silaturahmi kader...', 
                image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80', 
                photos: [] 
            }
        ]);
    }
    
    // Inisialisasi Database Bersih Tanpa Dummy (Data murni dari Admin Dashboard)
    if (!(await kv.get('kaderQuotesList'))) {
        await kv.set('kaderQuotesList', []);
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
            { id: 1, name: 'Muh. Xavier Syafwan', role: 'Ketua Umum', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80', ig: '', fb: '', twitter: '', linkedin: '', tiktok: '' }
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
            { id: 1, name: 'Andi Nurul Hidayah', role: 'Ketua Umum KOHATI', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', ig: '', fb: '', twitter: '', linkedin: '', tiktok: '' }
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
    if (!(await kv.get('contactMessagesList'))) await kv.set('contactMessagesList', []);
    
    let bioPages = await kv.get('bioPages');
    if (!bioPages || bioPages.length === 0) {
        await kv.set('bioPages', [{
            id: 1, 
            path: 'links', 
            title: 'HMI KomKG-UMI', 
            bio: 'Official Links Himpunan Mahasiswa Islam Komisariat Kedokteran Gigi UMI', 
            profileImage: '/img/logo-hmikomkgumi.png', 
            bgType: 'gradient', 
            bgValue: 'linear-gradient(135deg, #064e3b 0%, #111827 100%)' 
        }]);
    }
    let bioLnk = await kv.get('bioLinks');
    if (!bioLnk) await kv.set('bioLinks', []);

    let hasDevTeam = await kv.get('devTeamList');
    if (!hasDevTeam || hasDevTeam.length === 0) {
        await kv.set('devTeamList', [
            { id: 1, name: 'M. Aksa Arsyad, drg., S.KG', role: 'Lead Developer', dept: 'Demisioner Dept. Penerangan', category: 'FullStack Development', image: '/img/logo-hmikomkgumi.png', ig: 'https://www.instagram.com/axaaxyz_01' },
            { id: 2, name: 'Ibnu Rusyd, S.KG', role: 'Backend Development', dept: 'Demisioner Dept. Penerangan', category: 'Backend Development', image: '/img/logo-hmikomkgumi.png', ig: 'https://www.instagram.com/_ibnurusyd' },
            { id: 3, name: 'Riswandani AR, S.KG', role: 'Frontend Development', dept: 'Demisioner Dept. Kepemudaan', category: 'Frontend Development', image: '/img/logo-hmikomkgumi.png', ig: 'https://www.instagram.com/riswandani_ar' },
            { id: 4, name: 'Tasya Awaliyah Arsyad, drg., S.KG', role: 'UI/UX Design (CSS)', dept: 'Demisioner Dept. Pengembangan Profesi', category: 'UI/UX Design (CSS)', image: '/img/logo-hmikomkgumi.png', ig: 'https://www.instagram.com/tasyaawlyhh.arsyad' }
        ]);
    }

    // Inisialisasi 5 Section Modern Beranda jika belum ada
    if (!(await kv.get('homePillarsList'))) await kv.set('homePillarsList', defaultHomePillars);
    if (!(await kv.get('homeProgramsList'))) await kv.set('homeProgramsList', defaultHomePrograms);
    if (!(await kv.get('homeMilestonesList'))) await kv.set('homeMilestonesList', defaultHomeMilestones);
    if (!(await kv.get('homeTimelineList'))) await kv.set('homeTimelineList', defaultHomeTimeline);
    if (!(await kv.get('homeFaqList'))) await kv.set('homeFaqList', defaultHomeFaq);
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

// Favicon Direct Serving (Langsung kirim file dengan HTTP 200 OK agar browser/Chrome langsung render icon tab)
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});
app.get('/favicon.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'public', 'favicon-32x32.png'));
});
app.get('/apple-touch-icon.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'public', 'apple-touch-icon.png'));
});

// ==============================================================
// PUBLIC ROUTES
// ==============================================================
app.get('/', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        let news = await kv.get('newsList') || [];
        
        // Memastikan seluruh item berita memiliki slug murni
        news = news.map(n => ({
            ...n,
            slug: n.slug || slugify(n.title) || String(n.id)
        }));

        let kaderQuotes = await kv.get('kaderQuotesList') || [];

        // 5 Modern Sections Data
        let homePillars = safeArr(await kv.get('homePillarsList'));
        if (homePillars.length === 0) homePillars = defaultHomePillars;

        let homePrograms = safeArr(await kv.get('homeProgramsList'));
        if (homePrograms.length === 0) homePrograms = defaultHomePrograms;

        let homeMilestones = safeArr(await kv.get('homeMilestonesList'));
        if (homeMilestones.length === 0) homeMilestones = defaultHomeMilestones;

        let homeTimeline = safeArr(await kv.get('homeTimelineList'));
        if (homeTimeline.length === 0) homeTimeline = defaultHomeTimeline;

        let homeFaq = safeArr(await kv.get('homeFaqList'));
        if (homeFaq.length === 0) homeFaq = defaultHomeFaq;

        const filter = req.query.filter; 
        if (filter && filter !== 'Semua') {
            news = news.filter(n => n.category.toLowerCase() === filter.toLowerCase());
        }
        res.render('index', { 
            page: 'beranda', 
            news, 
            kaderQuotes, 
            currentFilter: filter || 'Semua', 
            siteSettings, 
            socialMediaList,
            homePillars,
            homePrograms,
            homeMilestones,
            homeTimeline,
            homeFaq
        });
    } catch (err) {
        res.render('index', { 
            page: 'beranda', 
            news: [], 
            kaderQuotes: [], 
            currentFilter: 'Semua', 
            siteSettings: defaultSettings, 
            socialMediaList: defaultSocialMedia,
            homePillars: defaultHomePillars,
            homePrograms: defaultHomePrograms,
            homeMilestones: defaultHomeMilestones,
            homeTimeline: defaultHomeTimeline,
            homeFaq: defaultHomeFaq
        });
    }
});

// ROUTE DETAIL BERITA (MENDUKUNG PENCARIAN SLUG DAN ID ANGKA LAMA)
app.get('/berita/:slugOrId', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const newsList = await kv.get('newsList') || [];
        const param = req.params.slugOrId.toString().trim().toLowerCase();
        
        // Cari berita berdasarkan slug atau id lama
        let berita = newsList.find(n => (n.slug && n.slug.toLowerCase() === param) || String(n.id) === param);
        if (!berita) {
            return res.status(404).render('admin-404', { page: '404', noIndex: true, siteSettings, socialMediaList });
        }

        if (!berita.slug) {
            berita.slug = slugify(berita.title) || String(berita.id);
        }

        const seoBaseUrl = 'https://www.hmikomkgumi.xyz';
        const canonicalUrl = `${seoBaseUrl}/berita/${berita.slug}`;

        res.render('berita-detail', { 
            page: 'berita', 
            berita, 
            siteSettings, 
            socialMediaList,
            canonicalUrl,
            seoBaseUrl
        });
    } catch (err) { 
        res.status(500).send("Error Load Detail Berita: " + err.message); 
    }
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
        if (!album) return res.status(404).render('admin-404', { page: '404', noIndex: true, siteSettings, socialMediaList });
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

// ROUTE HALAMAN NARAHUBUNG
app.get('/narahubung', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        res.render('narahubung', { page: 'narahubung', siteSettings, socialMediaList });
    } catch (err) {
        res.render('narahubung', { page: 'narahubung', siteSettings: defaultSettings, socialMediaList: defaultSocialMedia });
    }
});

// ENDPOINT PENERIMA PESAN FORMULIR NARAHUBUNG
app.post('/api/kirim-pesan-narahubung', upload.any(), async (req, res) => {
    try {
        let messages = await kv.get('contactMessagesList') || [];
        
        let docFileUrl = '';
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            docFileUrl = await saveUploadedFile(req, 'supportDoc', 'lampiran-pesan');
        }

        const newMessage = {
            id: Date.now(),
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            name: req.body.name || 'Anonim',
            method: req.body.method || 'wa',
            contact: req.body.contact || '-',
            subject: req.body.subject || 'Umum',
            message: req.body.message || '-',
            docUrl: docFileUrl
        };

        messages.unshift(newMessage);
        await kv.set('contactMessagesList', messages);

        res.json({ status: 'success', message: 'Pesan berhasil tercatat di database.' });
    } catch (err) {
        console.error("Error kirim pesan narahubung:", err);
        res.status(500).json({ status: 'error', message: 'Gagal mencatat pesan.' });
    }
});

app.get('/ourteam', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        const devTeam = await kv.get('devTeamList') || [];
        res.render('ourteam', { page: 'ourteam', devTeam, siteSettings, socialMediaList });
    } catch (err) { 
        res.render('ourteam', { page: 'ourteam', devTeam: [], siteSettings: defaultSettings, socialMediaList: defaultSocialMedia }); 
    }
});

// ROUTE SHORTLINK & LINK IN BIO
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug.toLowerCase();
    const reserved = ['admin', 'css', 'img', 'js', 'berita', 'galeri', 'tentang', 'data-anggota', 'narahubung', 'ourteam', 'api', 'uploads'];
    if (reserved.includes(slug)) return next();
    
    try {
        let bioPages = await kv.get('bioPages') || [];
        const bioPage = bioPages.find(p => p.path && p.path.toLowerCase() === slug);
        
        if (bioPage) {
            let allBioLinks = await kv.get('bioLinks') || [];
            let pageLinks = allBioLinks.filter(l => l.bioPageId == bioPage.id);
            return res.render('bio', { bioPage, bioLinks: pageLinks });
        }

        const shortlinks = await kv.get('shortlinkList') || [];
        const link = shortlinks.find(s => s.path && s.path.toLowerCase() === slug);
        if (link) return res.redirect(link.originalUrl);
        
    } catch (e) {
        console.error("Slug Route Error:", e);
    }
    next();
});

// ==============================================================
// ADMIN AUTHENTICATION
// ==============================================================
app.get('/admin', async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        if(req.cookies.admin_auth === 'true') return res.redirect('/admin/dashboard');
        res.render('admin-login', { page: 'admin', noIndex: true, error: null, siteSettings, socialMediaList });
    } catch (e) { res.send("Admin Load Error"); }
});

app.post('/admin/login', async (req, res) => {
    try {
        const inputUser = (req.body.username || '').trim();
        const inputPass = (req.body.password || '').trim();

        // Kredensial dinamis: baca dari process.env, .env, atau env
        let envUser = process.env.ADMIN_USER;
        let envPass = process.env.ADMIN_PASS;

        // Runtime fallback jika file .env / env baru saja diubah tanpa restart server
        if (!envUser || !envPass) {
            const envFile = fs.existsSync(path.join(__dirname, '.env')) 
                ? path.join(__dirname, '.env') 
                : (fs.existsSync(path.join(__dirname, 'env')) ? path.join(__dirname, 'env') : null);
            if (envFile) {
                try {
                    const parsed = dotenv.parse(fs.readFileSync(envFile));
                    if (parsed.ADMIN_USER) envUser = parsed.ADMIN_USER;
                    if (parsed.ADMIN_PASS) envPass = parsed.ADMIN_PASS;
                } catch (e) {}
            }
        }

        const validUser = (envUser || 'hmikomkgumi').trim();
        const validPass = (envPass || 'komkgumi123').trim();

        // Validasi: Dukung kredensial resmi (.env), serta fallback darurat
        const isMatch = (inputUser === validUser && inputPass === validPass) ||
                        (inputUser === 'hmikomkgumi' && inputPass === 'komkgumi123') ||
                        (inputUser === 'admin' && inputPass === (envPass || 'password'));

        if (isMatch) {
            res.cookie('admin_auth', 'true', { 
                maxAge: 7 * 24 * 60 * 60 * 1000, 
                httpOnly: true,
                sameSite: 'lax',
                path: '/'
            });
            return res.redirect('/admin/dashboard');
        } else {
            const { siteSettings, socialMediaList } = await getSiteData();
            return res.render('admin-login', { 
                page: 'admin', 
                noIndex: true, 
                error: 'Username atau Password salah! Periksa kembali username dan password Anda.', 
                siteSettings, 
                socialMediaList 
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        return res.redirect('/admin');
    }
});

const requireAdmin = (req, res, next) => {
    if (req.cookies.admin_auth !== 'true') return res.redirect('/admin');
    next();
};

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        
        const safeArr = (arr) => Array.isArray(arr) ? arr : [];
        const safeStr = (val) => typeof val === 'string' ? val : '';

        const news = safeArr(await kv.get('newsList')).map(x => ({
            ...x, 
            slug: safeStr(x.slug || slugify(x.title)),
            title: safeStr(x.title), 
            category: safeStr(x.category), 
            date: safeStr(x.date), 
            content: safeStr(x.content)
        }));
        const albums = safeArr(await kv.get('albumsList')).map(x => ({...x, title: safeStr(x.title), date: safeStr(x.date)}));
        
        const pengurus = safeArr(await kv.get('pengurusList')).map(x => ({...x, name: safeStr(x.name), role: safeStr(x.role), ig: safeStr(x.ig), fb: safeStr(x.fb), twitter: safeStr(x.twitter), linkedin: safeStr(x.linkedin), tiktok: safeStr(x.tiktok)}));
        const bidang = safeArr(await kv.get('bidangList')).map(x => ({...x, name: safeStr(x.name), members: safeArr(x.members).map(m => ({...m, name: safeStr(m.name), role: safeStr(m.role), ig: safeStr(m.ig), fb: safeStr(m.fb), twitter: safeStr(m.twitter), linkedin: safeStr(m.linkedin), tiktok: safeStr(m.tiktok)}))}));
        const kohatiPengurus = safeArr(await kv.get('kohatiPengurusList')).map(x => ({...x, name: safeStr(x.name), role: safeStr(x.role), ig: safeStr(x.ig), fb: safeStr(x.fb), twitter: safeStr(m => safeStr(m.twitter)), linkedin: safeStr(x.linkedin), tiktok: safeStr(x.tiktok)}));
        const kohatiBidang = safeArr(await kv.get('kohatiBidangList')).map(x => ({...x, name: safeStr(x.name), members: safeArr(x.members).map(m => ({...m, name: safeStr(m.name), role: safeStr(m.role), ig: safeStr(m.ig), fb: safeStr(m.fb), twitter: safeStr(m.twitter), linkedin: safeStr(m.linkedin), tiktok: safeStr(m.tiktok)}))}));
        
        const dataAnggota = safeArr(await kv.get('dataAnggotaList')).map(x => ({...x, title: safeStr(x.title), date: safeStr(x.date)}));
        const shortlinks = safeArr(await kv.get('shortlinkList')).map(x => ({...x, title: safeStr(x.title), path: safeStr(x.path), originalUrl: safeStr(x.originalUrl)}));
        
        let bioPages = safeArr(await kv.get('bioPages')).map(x => ({...x, path: safeStr(x.path), title: safeStr(x.title), bio: safeStr(x.bio), bgType: safeStr(x.bgType), bgValue: safeStr(x.bgValue)}));
        let bioLinks = safeArr(await kv.get('bioLinks')).map(x => ({...x, title: safeStr(x.title), url: safeStr(x.url)}));

        let devTeam = safeArr(await kv.get('devTeamList')).map(x => ({...x, name: safeStr(x.name), role: safeStr(x.role), dept: safeStr(x.dept), category: safeStr(x.category), ig: safeStr(x.ig)}));

        // Data Pesan Masuk Narahubung
        const contactMessages = safeArr(await kv.get('contactMessagesList'));

        // Data Kutipan Kader (Apa Kata Kader?) - Khusus Instagram Tanpa Email
        const kaderQuotes = safeArr(await kv.get('kaderQuotesList')).map(x => ({
            ...x,
            name: safeStr(x.name),
            role: safeStr(x.role),
            quote: safeStr(x.quote),
            image: safeStr(x.image),
            ig: safeStr(x.ig)
        }));

        // 5 Modern Sections Beranda
        let homePillars = safeArr(await kv.get('homePillarsList'));
        if (homePillars.length === 0) homePillars = defaultHomePillars;

        let homePrograms = safeArr(await kv.get('homeProgramsList'));
        if (homePrograms.length === 0) homePrograms = defaultHomePrograms;

        let homeMilestones = safeArr(await kv.get('homeMilestonesList'));
        if (homeMilestones.length === 0) homeMilestones = defaultHomeMilestones;

        let homeTimeline = safeArr(await kv.get('homeTimelineList'));
        if (homeTimeline.length === 0) homeTimeline = defaultHomeTimeline;

        let homeFaq = safeArr(await kv.get('homeFaqList'));
        if (homeFaq.length === 0) homeFaq = defaultHomeFaq;

        res.render('admin-dashboard', { 
            page: 'admin', news, albums, pengurus, bidang, dataAnggota, 
            kohatiPengurus, kohatiBidang, shortlinks, siteSettings, socialMediaList,
            bioPages, bioLinks, devTeam, contactMessages, kaderQuotes,
            homePillars, homePrograms, homeMilestones, homeTimeline, homeFaq
        });
    } catch (err) { 
        console.error("Dashboard Render Error:", err);
        res.status(500).send("Database Error Dashboard."); 
    }
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('admin_auth', { path: '/' });
    res.redirect('/admin');
});

// ==============================================================
// ADMIN ACTIONS (SEO-FRIENDLY MULTIMEDIA CRUD)
// ==============================================================

// KELOLA PESAN NARAHUBUNG
app.post('/admin/hapus-pesan/:id', requireAdmin, async (req, res) => {
    try {
        let messages = await kv.get('contactMessagesList') || [];
        await kv.set('contactMessagesList', messages.filter(m => m.id != req.params.id));
        res.redirect('/admin/dashboard');
    } catch (e) {
        res.redirect('/admin/dashboard');
    }
});

// KELOLA BERITA (AUTO SLUG & CUSTOM SLUG SUPPORT)
app.post('/admin/tambah-berita', requireAdmin, upload.any(), async (req, res) => {
    try {
        let news = await kv.get('newsList') || [];
        const uploadedCover = await saveUploadedFile(req, 'image', 'berita');
        
        const title = req.body.title ? req.body.title.trim() : 'Berita Baru';
        const customSlug = req.body.slug ? req.body.slug.trim() : '';
        const uniqueSlug = generateUniqueSlug(title, customSlug, news);

        news.unshift({ 
            id: Date.now(), 
            slug: uniqueSlug,
            title: title, 
            category: req.body.category, 
            date: req.body.date || new Date().toLocaleDateString('id-ID'), 
            content: req.body.content, 
            image: uploadedCover || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80', 
            photos: [] 
        });
        await kv.set('newsList', news); 
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-berita/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let news = await kv.get('newsList') || []; 
        let i = news.findIndex(n => n.id == req.params.id);
        if (i !== -1) {
            const title = req.body.title ? req.body.title.trim() : news[i].title;
            const customSlug = req.body.slug !== undefined ? req.body.slug.trim() : '';
            news[i].slug = generateUniqueSlug(title, customSlug || news[i].slug, news, news[i].id);

            news[i].title = title; 
            news[i].category = req.body.category; 
            news[i].content = req.body.content;
            if (req.body.date) news[i].date = req.body.date;
            
            const uploadedCover = await saveUploadedFile(req, 'image', 'berita');
            if (uploadedCover) news[i].image = uploadedCover;
            
            await kv.set('newsList', news);
        }
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-berita/:id', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || []; 
    await kv.set('newsList', news.filter(n => n.id != req.params.id)); 
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-foto-berita/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let newPhotos = [];
        if (req.files && Array.isArray(req.files)) {
            const files = req.files.filter(f => f.fieldname === 'photos' || f.fieldname === 'photos[]');
            for (const file of files) {
                const fakeReq = { files: [file], body: {} };
                const fileUrl = await saveUploadedFile(fakeReq, 'photos', 'berita-doc');
                if (fileUrl) newPhotos.push({ id: Date.now() + Math.random(), url: fileUrl });
            }
        }

        let news = await kv.get('newsList') || []; 
        let index = news.findIndex(n => n.id == req.params.id);
        if (index !== -1) { 
            if (!news[index].photos) news[index].photos = []; 
            news[index].photos = [...news[index].photos, ...newPhotos]; 
            await kv.set('newsList', news); 
        }
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-foto-berita/:beritaId/:photoId', requireAdmin, async (req, res) => {
    let news = await kv.get('newsList') || []; 
    let index = news.findIndex(n => n.id == req.params.beritaId);
    if (index !== -1 && news[index].photos) { 
        news[index].photos = news[index].photos.filter(p => p.id != req.params.photoId); 
        await kv.set('newsList', news); 
    }
    res.redirect('/admin/dashboard');
});

// KELOLA KUTIPAN KADER (APA KATA KADER?) - KHUSUS INSTAGRAM TANPA EMAIL
app.post('/admin/tambah-kader-quote', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('kaderQuotesList') || [];
        const img = await saveUploadedFile(req, 'image', 'kader-quote') || '/img/logo-hmikomkgumi.png';
        list.unshift({
            id: Date.now(),
            name: (req.body.name || '').trim(),
            role: (req.body.role || '').trim(),
            quote: (req.body.quote || '').trim(),
            image: img,
            ig: (req.body.ig || '').trim()
        });
        await kv.set('kaderQuotesList', list);
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-kader-quote/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('kaderQuotesList') || [];
        let i = list.findIndex(q => q.id == req.params.id);
        if (i !== -1) {
            if (req.body.name) list[i].name = req.body.name.trim();
            if (req.body.role) list[i].role = req.body.role.trim();
            if (req.body.quote) list[i].quote = req.body.quote.trim();
            if (req.body.ig !== undefined) list[i].ig = req.body.ig.trim();
            delete list[i].email; // Menghapus field email pada data lama

            const newImg = await saveUploadedFile(req, 'image', 'kader-quote');
            if (newImg) list[i].image = newImg;

            await kv.set('kaderQuotesList', list);
        }
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-kader-quote/:id', requireAdmin, async (req, res) => {
    try {
        let list = await kv.get('kaderQuotesList') || [];
        await kv.set('kaderQuotesList', list.filter(q => q.id != req.params.id));
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

// ==============================================================
// CRUD 5 SECTION MODERN BERANDA (INDEX.EJS)
// ==============================================================

// 1. PILAR NILAI GERAKAN
app.post('/admin/tambah-home-pillar', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homePillarsList'));
        if (list.length === 0) list = [...defaultHomePillars];
        list.push({
            id: Date.now(),
            title: (req.body.title || '').trim(),
            subtitle: (req.body.subtitle || '').trim(),
            icon: (req.body.icon || 'star').trim(),
            description: (req.body.description || '').trim(),
            order: Number(req.body.order) || list.length + 1
        });
        await kv.set('homePillarsList', list);
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/edit-home-pillar/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homePillarsList'));
        if (list.length === 0) list = [...defaultHomePillars];
        let i = list.findIndex(p => p.id == req.params.id);
        if (i !== -1) {
            if (req.body.title) list[i].title = req.body.title.trim();
            if (req.body.subtitle !== undefined) list[i].subtitle = req.body.subtitle.trim();
            if (req.body.icon) list[i].icon = req.body.icon.trim();
            if (req.body.description) list[i].description = req.body.description.trim();
            if (req.body.order !== undefined) list[i].order = Number(req.body.order) || list[i].order;
            await kv.set('homePillarsList', list);
        }
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/hapus-home-pillar/:id', requireAdmin, async (req, res) => {
    try {
        let list = safeArr(await kv.get('homePillarsList'));
        if (list.length === 0) list = [...defaultHomePillars];
        await kv.set('homePillarsList', list.filter(p => p.id != req.params.id));
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

// 2. PROGRAM KERJA UNGGULAN
app.post('/admin/tambah-home-program', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeProgramsList'));
        if (list.length === 0) list = [...defaultHomePrograms];
        const img = await saveUploadedFile(req, 'image', 'home-proker') || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80';
        list.unshift({
            id: Date.now(),
            title: (req.body.title || '').trim(),
            category: (req.body.category || 'Program Unggulan').trim(),
            status: (req.body.status || 'Aktif').trim(),
            date: (req.body.date || 'Agenda Rutin').trim(),
            image: img,
            description: (req.body.description || '').trim()
        });
        await kv.set('homeProgramsList', list);
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/edit-home-program/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeProgramsList'));
        if (list.length === 0) list = [...defaultHomePrograms];
        let i = list.findIndex(p => p.id == req.params.id);
        if (i !== -1) {
            if (req.body.title) list[i].title = req.body.title.trim();
            if (req.body.category) list[i].category = req.body.category.trim();
            if (req.body.status) list[i].status = req.body.status.trim();
            if (req.body.date) list[i].date = req.body.date.trim();
            if (req.body.description) list[i].description = req.body.description.trim();
            const newImg = await saveUploadedFile(req, 'image', 'home-proker');
            if (newImg) list[i].image = newImg;
            await kv.set('homeProgramsList', list);
        }
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/hapus-home-program/:id', requireAdmin, async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeProgramsList'));
        if (list.length === 0) list = [...defaultHomePrograms];
        await kv.set('homeProgramsList', list.filter(p => p.id != req.params.id));
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

// 3. STATISTIK PRESTASI & MILESTONES
app.post('/admin/tambah-home-milestone', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeMilestonesList'));
        if (list.length === 0) list = [...defaultHomeMilestones];
        list.push({
            id: Date.now(),
            number: (req.body.number || '100+').trim(),
            label: (req.body.label || '').trim(),
            context: (req.body.context || '').trim(),
            icon: (req.body.icon || 'award').trim()
        });
        await kv.set('homeMilestonesList', list);
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/edit-home-milestone/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeMilestonesList'));
        if (list.length === 0) list = [...defaultHomeMilestones];
        let i = list.findIndex(m => m.id == req.params.id);
        if (i !== -1) {
            if (req.body.number) list[i].number = req.body.number.trim();
            if (req.body.label) list[i].label = req.body.label.trim();
            if (req.body.context) list[i].context = req.body.context.trim();
            if (req.body.icon) list[i].icon = req.body.icon.trim();
            await kv.set('homeMilestonesList', list);
        }
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/hapus-home-milestone/:id', requireAdmin, async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeMilestonesList'));
        if (list.length === 0) list = [...defaultHomeMilestones];
        await kv.set('homeMilestonesList', list.filter(m => m.id != req.params.id));
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

// 4. TIMELINE JEJAK PERJALANAN GERAKAN
app.post('/admin/tambah-home-timeline', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeTimelineList'));
        if (list.length === 0) list = [...defaultHomeTimeline];
        list.push({
            id: Date.now(),
            period: (req.body.period || '').trim(),
            title: (req.body.title || '').trim(),
            description: (req.body.description || '').trim(),
            status: (req.body.status || 'Berjalan').trim()
        });
        await kv.set('homeTimelineList', list);
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/edit-home-timeline/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeTimelineList'));
        if (list.length === 0) list = [...defaultHomeTimeline];
        let i = list.findIndex(t => t.id == req.params.id);
        if (i !== -1) {
            if (req.body.period) list[i].period = req.body.period.trim();
            if (req.body.title) list[i].title = req.body.title.trim();
            if (req.body.description) list[i].description = req.body.description.trim();
            if (req.body.status) list[i].status = req.body.status.trim();
            await kv.set('homeTimelineList', list);
        }
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/hapus-home-timeline/:id', requireAdmin, async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeTimelineList'));
        if (list.length === 0) list = [...defaultHomeTimeline];
        await kv.set('homeTimelineList', list.filter(t => t.id != req.params.id));
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

// 5. F.A.Q CALON KADER & PUSAT BANTUAN
app.post('/admin/tambah-home-faq', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeFaqList'));
        if (list.length === 0) list = [...defaultHomeFaq];
        list.push({
            id: Date.now(),
            question: (req.body.question || '').trim(),
            answer: (req.body.answer || '').trim(),
            category: (req.body.category || 'Umum').trim()
        });
        await kv.set('homeFaqList', list);
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/edit-home-faq/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeFaqList'));
        if (list.length === 0) list = [...defaultHomeFaq];
        let i = list.findIndex(f => f.id == req.params.id);
        if (i !== -1) {
            if (req.body.question) list[i].question = req.body.question.trim();
            if (req.body.answer) list[i].answer = req.body.answer.trim();
            if (req.body.category) list[i].category = req.body.category.trim();
            await kv.set('homeFaqList', list);
        }
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

app.post('/admin/hapus-home-faq/:id', requireAdmin, async (req, res) => {
    try {
        let list = safeArr(await kv.get('homeFaqList'));
        if (list.length === 0) list = [...defaultHomeFaq];
        await kv.set('homeFaqList', list.filter(f => f.id != req.params.id));
        res.redirect('/admin/dashboard?tab=adm-beranda-sections');
    } catch (e) { res.redirect('/admin/dashboard?tab=adm-beranda-sections'); }
});

// SETELAN HEADER & FOOTER
app.post('/admin/setelan-header', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.webTitle = req.body.webTitle || siteSettings.webTitle;
        siteSettings.heroTitle = req.body.heroTitle || siteSettings.heroTitle;
        siteSettings.headerTitle = req.body.headerTitle || siteSettings.headerTitle;
        siteSettings.headerHighlight = req.body.headerHighlight || siteSettings.headerHighlight;
        siteSettings.headerSubtitle = req.body.headerSubtitle || siteSettings.headerSubtitle;
        siteSettings.seoDescription = req.body.seoDescription || siteSettings.seoDescription;
        siteSettings.seoKeywords = req.body.seoKeywords || siteSettings.seoKeywords;
        
        const hLogo = await saveUploadedFile(req, 'headerLogo', 'logo');
        if (hLogo) siteSettings.headerLogo = hLogo;
        
        const sImg = await saveUploadedFile(req, 'seoImage', 'og-cover');
        if (sImg) siteSettings.seoImage = sImg;

        await kv.set('siteSettings', siteSettings); 
        res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/setelan-footer', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.footerTitle = req.body.footerTitle || siteSettings.footerTitle;
        siteSettings.footerDesc = req.body.footerDesc || siteSettings.footerDesc;
        siteSettings.footerCopyright = req.body.footerCopyright || siteSettings.footerCopyright;
        siteSettings.footerProgrammer = req.body.footerProgrammer || siteSettings.footerProgrammer;
        
        const fLogo = await saveUploadedFile(req, 'footerLogo', 'footer-logo');
        if (fLogo) siteSettings.footerLogo = fLogo;
        
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

// SETELAN TENTANG KAMI
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

            const bPdf = await saveUploadedFile(req, 'bookletPdf', 'booklet');
            const pdfUrl = req.body.bookletPdfUrl; 

            if (bPdf) { 
                siteSettings.bookletPdf = bPdf;
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

// SETELAN NARAHUBUNG & KONTAK RESMI
app.post('/admin/setelan-narahubung', requireAdmin, async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.contactAddress = req.body.contactAddress || siteSettings.contactAddress;
        siteSettings.contactEmail = req.body.contactEmail || siteSettings.contactEmail;
        siteSettings.contactWa = req.body.contactWa || siteSettings.contactWa;
        siteSettings.contactWaName = req.body.contactWaName || siteSettings.contactWaName;
        siteSettings.contactMaps = req.body.contactMaps || siteSettings.contactMaps;
        
        await kv.set('siteSettings', siteSettings);
        res.redirect('/admin/dashboard');
    } catch (err) { 
        res.redirect('/admin/dashboard'); 
    }
});

// SETELAN ANNOUNCEMENT POPUP
app.post('/admin/setelan-announcement', requireAdmin, upload.any(), async (req, res) => {
    try {
        const { siteSettings } = await getSiteData();
        siteSettings.announceActive = req.body.announceActive ? 'true' : 'false';
        siteSettings.announceTitle = req.body.announceTitle || siteSettings.announceTitle;
        siteSettings.announceContent = req.body.announceContent || siteSettings.announceContent;
        
        const img = await saveUploadedFile(req, 'announceImage', 'announcement');
        if (img) siteSettings.announceImage = img;
        
        await kv.set('siteSettings', siteSettings); 
        res.redirect('/admin/dashboard');
    } catch (err) { res.redirect('/admin/dashboard'); }
});

// SHORTLINK
app.post('/admin/tambah-shortlink', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || []; 
    list.unshift({ id: Date.now(), title: req.body.title, path: req.body.path.replace(/\s+/g, '-').toLowerCase(), originalUrl: req.body.originalUrl }); 
    await kv.set('shortlinkList', list); 
    res.redirect('/admin/dashboard');
});

app.post('/admin/edit-shortlink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || []; 
    let i = list.findIndex(l => l.id == req.params.id);
    if(i !== -1) { 
        list[i].title = req.body.title; 
        list[i].path = req.body.path.replace(/\s+/g, '-').toLowerCase(); 
        list[i].originalUrl = req.body.originalUrl; 
        await kv.set('shortlinkList', list); 
    } 
    res.redirect('/admin/dashboard');
});

app.post('/admin/hapus-shortlink/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('shortlinkList') || []; 
    await kv.set('shortlinkList', list.filter(l => l.id != req.params.id)); 
    res.redirect('/admin/dashboard');
});

// SOSIAL MEDIA MANAGEMENT (TAB KHUSUS)
app.post('/admin/tambah-sosmed', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('socialMediaList') || []; 
        const iconUrl = await saveUploadedFile(req, 'icon', 'sosmed');
        list.push({ id: Date.now(), name: req.body.name, url: req.body.url, icon: iconUrl }); 
        await kv.set('socialMediaList', list); 
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-sosmed/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('socialMediaList') || []; 
        let i = list.findIndex(l => l.id == req.params.id);
        if(i !== -1) { 
            list[i].name = req.body.name; 
            list[i].url = req.body.url; 
            const newIcon = await saveUploadedFile(req, 'icon', 'sosmed');
            if (newIcon) list[i].icon = newIcon; 
            await kv.set('socialMediaList', list); 
        } 
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-sosmed/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('socialMediaList') || []; 
    await kv.set('socialMediaList', list.filter(l => l.id != req.params.id)); 
    res.redirect('/admin/dashboard');
});

// LINK IN BIO
app.post('/admin/tambah-bio-page', requireAdmin, upload.any(), async (req, res) => {
    try {
        let pages = await kv.get('bioPages') || [];
        let bgType = 'gradient';
        let bgValue = req.body.bgGradient || 'linear-gradient(135deg, #064e3b 0%, #111827 100%)';
        const bgImg = await saveUploadedFile(req, 'bgImage', 'bio-bg');
        if (bgImg) {
            bgType = 'image';
            bgValue = bgImg;
        }

        const pImg = await saveUploadedFile(req, 'profileImage', 'bio-profile') || '/img/logo-hmikomkgumi.png';

        pages.push({
            id: Date.now(),
            path: (req.body.path || '').replace(/\s+/g, '-').toLowerCase(),
            title: req.body.title || 'Untitled',
            bio: req.body.bio || '',
            profileImage: pImg,
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
            
            const pImg = await saveUploadedFile(req, 'profileImage', 'bio-profile');
            if (pImg) pages[i].profileImage = pImg;

            const bgImg = await saveUploadedFile(req, 'bgImage', 'bio-bg');
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
    await kv.set('bioLinks', links.filter(l => l.bioPageId != req.params.id));
    res.redirect('/admin/dashboard');
});

app.post('/admin/tambah-biolink', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('bioLinks') || [];
        const iconUrl = await saveUploadedFile(req, 'icon', 'biolink');
        list.push({ 
            id: Date.now(), 
            bioPageId: req.body.bioPageId,
            title: req.body.title || 'Link',
            url: req.body.url || '#', 
            icon: iconUrl 
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
            const newIcon = await saveUploadedFile(req, 'icon', 'biolink');
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

// DEVELOPER TEAM
app.post('/admin/tambah-devteam', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('devTeamList') || [];
        const img = await saveUploadedFile(req, 'image', 'devteam') || '/img/logo-hmikomkgumi.png';
        list.push({
            id: Date.now(),
            name: req.body.name,
            role: req.body.role,
            dept: req.body.dept || '',
            category: req.body.category,
            ig: req.body.ig || '',
            image: img
        });
        await kv.set('devTeamList', list);
        res.redirect('/admin/dashboard');
    } catch(e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-devteam/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        let list = await kv.get('devTeamList') || [];
        let i = list.findIndex(l => l.id == req.params.id);
        if (i !== -1) {
            if (list[i].id == 1 || list[i].name.includes('Aksa Arsyad')) {
                if (req.body.pin !== '999') {
                    return res.send("<script>alert('AKSES DITOLAK! PIN Rahasia Salah. Anda tidak berhak mengubah data Lead Developer.'); window.location.href='/admin/dashboard';</script>");
                }
            }

            if (req.body.name) list[i].name = req.body.name;
            if (req.body.role) list[i].role = req.body.role;
            if (req.body.dept !== undefined) list[i].dept = req.body.dept;
            if (req.body.category) list[i].category = req.body.category;
            if (req.body.ig !== undefined) list[i].ig = req.body.ig;
            
            const newImg = await saveUploadedFile(req, 'image', 'devteam');
            if (newImg) list[i].image = newImg;
            
            await kv.set('devTeamList', list);
        }
        res.redirect('/admin/dashboard');
    } catch(e) { res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-devteam/:id', requireAdmin, async (req, res) => {
    let list = await kv.get('devTeamList') || [];
    let i = list.findIndex(l => l.id == req.params.id);
    if (i !== -1) {
        if (list[i].id == 1 || list[i].name.includes('Aksa Arsyad')) {
            if (req.body.pin !== '999') {
                return res.send("<script>alert('AKSES DITOLAK! PIN Rahasia Salah. Anda tidak berhak menghapus data Lead Developer.'); window.location.href='/admin/dashboard';</script>");
            }
        }
    }
    await kv.set('devTeamList', list.filter(l => l.id != req.params.id));
    res.redirect('/admin/dashboard');
});

// PENGURUS & BIDANG DINAMIS (UMUM & KOHATI)
const manageTeam = async (req, res, dbKey, action) => {
    try {
        let list = await kv.get(dbKey) || [];
        if (action === 'add') { 
            const img = await saveUploadedFile(req, 'image', 'pengurus') || '/img/logo-hmikomkgumi.png';
            list.push({ 
                id: Date.now(), 
                name: req.body.name, 
                role: req.body.role || '', 
                image: img,
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
                
                const img = await saveUploadedFile(req, 'image', 'pengurus');
                if (img) list[i].image = img; 
                
                if(req.body.bidang_name) list[i].name = req.body.bidang_name; 
                if(req.body.ig !== undefined) list[i].ig = req.body.ig;
                if(req.body.fb !== undefined) list[i].fb = req.body.fb;
                if(req.body.twitter !== undefined) list[i].twitter = req.body.twitter;
                if(req.body.linkedin !== undefined) list[i].linkedin = req.body.linkedin;
                if(req.body.tiktok !== undefined) list[i].tiktok = req.body.tiktok;
            } 
        }
        else if (action === 'delete') { list = list.filter(x => x.id != req.params.id); }
        await kv.set(dbKey, list); 
        res.redirect('/admin/dashboard');
    } catch (e) { res.redirect('/admin/dashboard'); }
};

const manageBidangMember = async (req, res, dbKey, action) => {
    try {
        let list = await kv.get(dbKey) || []; 
        let bIndex = list.findIndex(b => b.id == req.params.bidangId);
        if (bIndex !== -1) {
            if (!list[bIndex].members) list[bIndex].members = [];
            if (action === 'add') { 
                const img = await saveUploadedFile(req, 'image', 'anggota') || '/img/logo-hmikomkgumi.png';
                list[bIndex].members.push({ 
                    id: Date.now(), 
                    name: req.body.name, 
                    role: req.body.role || '', 
                    image: img,
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
                    
                    const img = await saveUploadedFile(req, 'image', 'anggota');
                    if (img) list[bIndex].members[mIndex].image = img; 
                    
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

// GALERI ALBUM
app.post('/admin/tambah-album', requireAdmin, upload.any(), async (req, res) => { 
    try { 
        const coverStr = await saveUploadedFile(req, 'cover', 'album-cover');
        let albums = await kv.get('albumsList') || []; 
        albums.unshift({ id: Date.now(), title: req.body.title, date: new Date().toLocaleDateString('id-ID'), cover: coverStr, photos: [] }); 
        await kv.set('albumsList', albums); 
        res.redirect('/admin/dashboard'); 
    } catch(e){ res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-album/:id', requireAdmin, upload.any(), async (req, res) => { 
    try { 
        let albums = await kv.get('albumsList') || []; 
        let index = albums.findIndex(a => a.id == req.params.id); 
        if (index !== -1) { 
            albums[index].title = req.body.title; 
            if (req.body.date) albums[index].date = req.body.date; 
            const coverStr = await saveUploadedFile(req, 'cover', 'album-cover');
            if (coverStr) albums[index].cover = coverStr; 
            await kv.set('albumsList', albums); 
        } 
        res.redirect('/admin/dashboard'); 
    } catch(e){ res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-album/:id', requireAdmin, async (req, res) => { 
    let albums = await kv.get('albumsList') || []; 
    await kv.set('albumsList', albums.filter(a => a.id != req.params.id)); 
    res.redirect('/admin/dashboard'); 
});

app.post('/admin/tambah-foto-album/:id', requireAdmin, upload.any(), async (req, res) => { 
    try { 
        let newPhotos = []; 
        if (req.files && Array.isArray(req.files)) {
            const files = req.files.filter(f => f.fieldname === 'photos' || f.fieldname === 'photos[]');
            for (const file of files) {
                const fakeReq = { files: [file], body: {} };
                const fileUrl = await saveUploadedFile(fakeReq, 'photos', 'galeri-doc');
                if (fileUrl) newPhotos.push({ id: Date.now() + Math.random(), url: fileUrl });
            }
        }

        let albums = await kv.get('albumsList') || []; 
        let index = albums.findIndex(a => a.id == req.params.id); 
        if (index !== -1) { 
            if (!albums[index].photos) albums[index].photos = []; 
            albums[index].photos = [...albums[index].photos, ...newPhotos]; 
            await kv.set('albumsList', albums); 
        } 
        res.redirect('/admin/dashboard'); 
    } catch(e){ res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-foto-album/:albumId/:photoId', requireAdmin, async (req, res) => { 
    let albums = await kv.get('albumsList') || []; 
    let index = albums.findIndex(a => a.id == req.params.albumId); 
    if (index !== -1 && albums[index].photos) { 
        albums[index].photos = albums[index].photos.filter(p => p.id != req.params.photoId); 
        await kv.set('albumsList', albums); 
    } 
    res.redirect('/admin/dashboard'); 
});

// PDF DATA ANGGOTA
app.post('/admin/tambah-data-anggota', requireAdmin, upload.any(), async (req, res) => { 
    try { 
        const fileStr = await saveUploadedFile(req, 'file', 'data-anggota');
        let dataAnggota = await kv.get('dataAnggotaList') || []; 
        dataAnggota.unshift({ id: Date.now(), title: req.body.title, date: req.body.date || new Date().toLocaleDateString('id-ID'), file: fileStr || '/data-anggota.pdf' }); 
        await kv.set('dataAnggotaList', dataAnggota); 
        res.redirect('/admin/dashboard'); 
    } catch(e){ res.redirect('/admin/dashboard'); }
});

app.post('/admin/edit-data-anggota/:id', requireAdmin, upload.any(), async (req, res) => { 
    try { 
        let dataAnggota = await kv.get('dataAnggotaList') || []; 
        let index = dataAnggota.findIndex(d => d.id == req.params.id); 
        if (index !== -1) { 
            dataAnggota[index].title = req.body.title; 
            if (req.body.date) dataAnggota[index].date = req.body.date; 
            const fileStr = await saveUploadedFile(req, 'file', 'data-anggota');
            if (fileStr) dataAnggota[index].file = fileStr; 
            await kv.set('dataAnggotaList', dataAnggota); 
        } 
        res.redirect('/admin/dashboard'); 
    } catch(e){ res.redirect('/admin/dashboard'); }
});

app.post('/admin/hapus-data-anggota/:id', requireAdmin, async (req, res) => { 
    let dataAnggota = await kv.get('dataAnggotaList') || []; 
    await kv.set('dataAnggotaList', dataAnggota.filter(d => d.id != req.params.id)); 
    res.redirect('/admin/dashboard'); 
});

// ==============================================================
// 404 NOT FOUND HANDLER (MENCEGAH INDEXING GOOGLEBOT)
// ==============================================================
app.use(async (req, res) => {
    try {
        const { siteSettings, socialMediaList } = await getSiteData();
        res.status(404).render('admin-404', { 
            page: '404', 
            noIndex: true, 
            siteSettings, 
            socialMediaList 
        });
    } catch (e) {
        res.status(404).send('404 - Halaman Tidak Ditemukan');
    }
});

// ERROR HANDLING
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Terjadi Kesalahan Internal di Server.');
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
module.exports = app;
