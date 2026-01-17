const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const routers = require('./routers/index');
const log = require('./middlewares/loggers/log');
const errorHandler = require('./middlewares/validations/errorHandler');

// Ortam değişkenlerini yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(express.json()); // JSON veri okuma desteği
app.use(express.urlencoded({ extended: true })); // Form veri okuma desteği
app.use(log); // Loglama middleware'i

// Statik Dosyalar (HTML, CSS, JS Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// API Rotaları
// app.use('/api', routers); // Prefix kullanmıyoruz çünkü frontend direkt /login atıyor
app.use(routers);

// Hata Yakalama Middleware (En sonda olmalı)
app.use(errorHandler);

// Ana Sayfa Yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});
