const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi EJS & Public folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk form data & sesi
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// --- MOCK DATABASE (Untuk Demo) ---
const newsList = [
    { id: 1, title: 'Silaturahmi, Penghargaan dan Launching Kaos', category: 'Terbaru', date: '10 May 2025', image: '[https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80)' },
    { id: 2, title: 'Semarak Hari Santri! HMI Gelar Pengajian', category: 'Populer', date: '22 Oct 2024', image: '[https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80)' },
    { id: 3, title: 'Diskusi Pedoman Perkaderan', category: 'Pin', date: '02 Jun 2025', image: '[https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=800&q=80)' }
];

const albumsList = [
    { id: 1, title: 'Basic Training (LK I) LXIII', date: '12 Maret 2025', cover: '[https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80)' },
    { id: 2, title: 'Kajian Ramadhan dan Buka Bersama', date: '20 Maret 2025', cover: '[https://images.unsplash.com/photo-1519671482749-fd09813f26b7?auto=format&fit=crop&w=800&q=80](https://images.unsplash.com/photo-1519671482749-fd09813f26b7?auto=format&fit=crop&w=800&q=80)' }
];

// --- ROUTES HALAMAN UTAMA ---
app.get('/', (req, res) => res.render('index', { page: 'beranda', news: newsList }));
app.get('/tentang', (req, res) => res.render('tentang', { page: 'tentang' }));
app.get('/galeri', (req, res) => res.render('galeri', { page: 'galeri', albums: albumsList }));
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

app.get('/admin/dashboard', (req, res) => {
    if(!req.session.loggedIn) return res.redirect('/admin');
    res.render('admin-dashboard', { page: 'admin', news: newsList, albums: albumsList });
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
});

// Middleware 404 (Harus di paling bawah)
app.use((req, res) => {
    res.status(404).render('admin-404', { page: '404' });
});

// Export untuk Vercel Serverless
app.listen(port, () => console.log(`Server running on port ${port}`));
module.exports = app;