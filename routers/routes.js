const router = require('express').Router();

// Yeni oluşturduğumuz controller dosyalarını buraya import ediyoruz
const authController = require("../controllers/authController");
const bolumController = require("../controllers/bolumController");
const personelController = require("../controllers/personelController");
const ekipmanController = require("../controllers/ekipmanController");
const tahminController = require("../controllers/tahminController");

// --- Auth Rotaları ---
router.post('/auth/login', authController.kullanici_login);
router.post('/auth/register', authController.kullanici_ekle);

// --- Bölüm & Yatak Rotaları ---
router.get('/bolumler', bolumController.bolumleri_getir);
router.get('/bolumler/yogunluk', bolumController.bolum_yogunluk_hesapla);
router.post('/bolumler/hasta-kabulu', bolumController.hasta_ekle_kontrol); // Yatak kapasite kontrolü burada
router.get('/bolumler/verimlilik', bolumController.verimlilik_analizi); // Düşük kapasiteli bölümler
router.put('/bolumler/:id', bolumController.bolum_guncelle);
router.delete('/bolumler/:id', bolumController.bolum_sil);

// --- Personel Rotaları ---
router.get('/personeller', personelController.personelleri_getir);
router.post('/personeller/yuk-analizi', personelController.personel_yuk_kontrol); // Hemşire/Doktor yükü
router.get('/personeller/karneler', personelController.personel_verimlilik_karnesi); // Şube bazlı kadro analizi
router.post('/personeller', personelController.personel_ekle);
router.put('/personeller', personelController.personel_guncelle);
router.put('/personeller/:id', personelController.personel_guncelle);
router.delete('/personeller', personelController.personel_sil);

// --- Ekipman Rotaları ---
router.get('/ekipmanlar', ekipmanController.ekipmanlari_getir);
router.get('/ekipmanlar/verimlilik', ekipmanController.ekipman_verimlilik_analizi);
router.post('/ekipmanlar', ekipmanController.ekipman_ekle);
router.delete('/ekipmanlar/:id', ekipmanController.ekipman_sil);

// --- Tahmin (Forecasting) Rotaları ---
router.get('/analiz/tahmin', tahminController.gelecek_tahmini_yap);

module.exports = router;
