const db = require("../db/mysql_connect");

const ekipmanlari_getir = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM ekipmanlar");
        return res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const ekipman_verimlilik_analizi = async (req, res) => {
    try {
        // İş Kuralı: Ekipman Verimliliği = Toplam Kapasite / Kullanılan Miktar
        // 1'in altındaysa YETERSİZ, 1'in üzerindeye YETERLİ/ATIL
        const [rows] = await db.query(`
            SELECT 
                b.bolum_adi,
                et.ekipman_turu_adi,
                COALESCE(ek.aylik_kapasite, 10) as ekipman_kapasite, -- Kapasite yoksa varsayılan 10
                aek.kullanim_sayisi as kullanilan_miktar,
                (COALESCE(ek.aylik_kapasite, 10) / NULLIF(aek.kullanim_sayisi, 0)) as verimlilik_skoru,
                CASE 
                    WHEN (COALESCE(ek.aylik_kapasite, 10) / NULLIF(aek.kullanim_sayisi, 0)) < 1 THEN 'YETERSİZ - KRİTİK'
                    ELSE 'YETERLİ'
                END as durum
            FROM aylik_ekipman_kullanim aek
            LEFT JOIN ekipmanlar e ON aek.ekipman_id = e.ekipman_id
            LEFT JOIN bolumler b ON e.bolum_id = b.bolum_id
            LEFT JOIN ekipman_turleri et ON e.ekipman_turu_id = et.ekipman_turu_id
            LEFT JOIN ekipman_kapasite ek ON aek.ekipman_id = ek.ekipman_id
            ORDER BY verimlilik_skoru ASC
        `);
        return res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const ekipman_ekle = async (req, res) => {
    try {
        const { ekipman_adi, bolum_id, ekipman_turu_id } = req.body;
        // Ekipman tablosunda ekipman_adi var mı bilmiyoruz, DESCRIBE çalışmadı. Genelde olur.
        await db.query(
            "INSERT INTO ekipmanlar (ekipman_adi, bolum_id, ekipman_turu_id) VALUES (?, ?, ?)",
            [ekipman_adi, bolum_id, ekipman_turu_id]
        );
        return res.status(201).json({ message: "Ekipman başarıyla eklendi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const ekipman_sil = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM ekipmanlar WHERE ekipman_id = ?", [id]);
        return res.status(200).json({ message: "Ekipman silindi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = { ekipmanlari_getir, ekipman_verimlilik_analizi, ekipman_ekle, ekipman_sil };
