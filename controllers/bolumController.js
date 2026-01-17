const db = require("../db/mysql_connect");

const bolumleri_getir = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM bolumler");
        return res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const bolum_yogunluk_hesapla = async (req, res) => {
    try {
        // Aylık bölüm verilerini ve yatak kullanım oranlarını detaylı hesapla
        const [rows] = await db.query(`
            SELECT 
                b.bolum_adi, 
                s.sube_adi,
                abv.aylik_baslangic, 
                abv.yatak_kullanilan,
                abv.yatan_hasta_sayisi,
                -- Yatak verimlilik oranı: (Kapasite / Yatan Hasta)
                -- Kapasite varsayılan 50 kabul edildi.
                (50 / NULLIF(abv.yatan_hasta_sayisi, 0)) as yatak_verimlilik_orani
            FROM aylik_bolum_verisi abv
            JOIN bolumler b ON abv.bolum_id = b.bolum_id
            JOIN subeler s ON abv.sube_id = s.sube_id
            ORDER BY abv.aylik_baslangic DESC, yatak_verimlilik_orani DESC
            LIMIT 100
        `);

        return res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const hasta_ekle_kontrol = async (req, res) => {
    // İş Kuralı 1: Yatak Kapasite Kontrolü
    try {
        const { bolum_id, sube_id, ay } = req.body;

        const [bolumVerisi] = await db.query(
            "SELECT * FROM aylik_bolum_verisi WHERE bolum_id = ? AND sube_id = ? AND aylik_baslangic = ?",
            [bolum_id, sube_id, ay]
        );

        if (bolumVerisi.length > 0) {
            const veri = bolumVerisi[0];
            // Senaryo: Sabit yatak limiti (örneğin her bölüm için 50 yatak)
            const MAX_KAPASITE = 50;

            if (veri.yatak_kullanilan >= MAX_KAPASITE) {
                return res.status(400).json({ error: "KRİTİK UYARI: Bölüm yatak kapasitesi tam dolu! Hasta yatışı yapılamaz." });
            }
            if (veri.yatak_kullanilan >= MAX_KAPASITE * 0.9) {
                // %90 doluluk uyarısı
                return res.status(200).json({ message: "DİKKAT: Yatak doluluk oranı %90'a ulaştı." });
            }
        }

        return res.status(200).json({ message: "Kapasite uygun, işlem yapılabilir." });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const verimlilik_analizi = async (req, res) => {
    // İş Kuralı 2: Düşük Verimlilik Uyarısı
    // Bir bölümün yatak kullanımı %30'un altındaysa "Verimsiz Bölüm" olarak işaretle
    try {
        const [analiz] = await db.query(`
            SELECT 
                b.bolum_adi,
                AVG(abv.yatak_kullanilan) as ortalama_yatak_kullanimi
            FROM aylik_bolum_verisi abv
            JOIN bolumler b ON abv.bolum_id = b.bolum_id
            WHERE abv.aylik_baslangic > DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY b.bolum_id
            HAVING ortalama_yatak_kullanimi < 10
        `);

        return res.status(200).json({
            mesaj: "Son 6 ayda düşük yatak kullanımına sahip bölümler (Verimlilik Analizi)",
            verimsiz_bolumler: analiz
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
}

const bolum_guncelle = async (req, res) => {
    try {
        const { id } = req.params;
        const { bolum_adi } = req.body;
        await db.query("UPDATE bolumler SET bolum_adi = ? WHERE bolum_id = ?", [bolum_adi, id]);
        return res.status(200).json({ message: "Bölüm güncellendi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const bolum_sil = async (req, res) => {
    try {
        const { id } = req.params;
        // Önce ilişkili verileri kontrol etmeliyiz ama şimdilik direkt siliyoruz (Cascade varsa silinir)
        await db.query("DELETE FROM bolumler WHERE bolum_id = ?", [id]);
        return res.status(200).json({ message: "Bölüm silindi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = { bolumleri_getir, bolum_yogunluk_hesapla, hasta_ekle_kontrol, verimlilik_analizi, bolum_guncelle, bolum_sil };
