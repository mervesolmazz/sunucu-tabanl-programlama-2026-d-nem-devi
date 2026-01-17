const db = require("../db/mysql_connect");

const personelleri_getir = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.sube_adi,
                b.bolum_adi,
                pt.personel_turu_adi,
                pk.personel_toplam
            FROM personel_kapasite pk
            JOIN subeler s ON pk.sube_id = s.sube_id
            JOIN bolumler b ON pk.bolum_id = b.bolum_id
            JOIN personel_turleri pt ON pk.personel_turu_id = pt.personel_turu_id
        `);
        return res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const personel_yuk_kontrol = async (req, res) => {
    // İş Kuralı 3: Personel/Hasta Yük Dengesi
    try {
        const { sube_id, bolum_id } = req.body;

        // Hemşire ve Doktor sayılarını çek
        const [personel] = await db.query(
            "SELECT personel_turu_id, personel_toplam FROM personel_kapasite WHERE sube_id = ? AND bolum_id = ?",
            [sube_id, bolum_id]
        );

        // Son ayın hasta istatistiklerini çek
        const [hasta] = await db.query(
            "SELECT yatan_hasta_sayisi, ayaktan_hasta_sayisi FROM aylik_bolum_verisi WHERE sube_id = ? AND bolum_id = ? ORDER BY aylik_baslangic DESC LIMIT 1",
            [sube_id, bolum_id]
        );

        if (personel.length > 0 && hasta.length > 0) {
            const hastaVerisi = hasta[0];
            const hemsire = personel.find(p => p.personel_turu_id === 2); // 2: Hemşire
            const doktor = personel.find(p => p.personel_turu_id === 1);  // 1: Doktor

            let analizSonucu = { durum: "NORMAL", mesajlar: [] };

            // Kural 3.1: Hemşire başına düşen yatan hasta sayısı (Max 10)
            if (hemsire && (hastaVerisi.yatan_hasta_sayisi / hemsire.personel_toplam > 10)) {
                analizSonucu.durum = "YUKSEK_RISK";
                analizSonucu.mesajlar.push("Hemşire yetersiz! Bir hemşireye 10'dan fazla hasta düşüyor.");
            }

            // Kural 3.2: Doktor başına düşen toplam hasta yükü (Max 50)
            // (Ayaktan + Yatan) / Doktor Sayısı
            if (doktor) {
                const toplamHasta = hastaVerisi.yatan_hasta_sayisi + hastaVerisi.ayaktan_hasta_sayisi;
                if (toplamHasta / doktor.personel_toplam > 50) {
                    analizSonucu.durum = "YUKSEK_RISK";
                    analizSonucu.mesajlar.push("Doktor yoğunluğu kritik! Doktor başına 50'den fazla hasta düşüyor.");
                }
            }

            return res.status(200).json(analizSonucu);
        }

        return res.status(200).json({ durum: "VERI_YOK", mesaj: "Yeterli veri bulunamadı." });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const personel_verimlilik_karnesi = async (req, res) => {
    // İş Kuralı 4: İdeal Kadro Analizi
    // Bir şubedeki toplam personelin, toplam hasta sayısına oranı %5'in altındaysa "Personel Takviyesi Gerekli" uyarısı ver.
    try {
        const [genelAnaliz] = await db.query(`
            SELECT 
                s.sube_adi,
                SUM(pk.personel_toplam) as toplam_personel,
                (SELECT SUM(ayaktan_hasta_sayisi + yatan_hasta_sayisi) 
                 FROM aylik_bolum_verisi abv 
                 WHERE abv.sube_id = s.sube_id 
                 AND abv.aylik_baslangic = '2025-10-01') as son_ay_toplam_hasta
            FROM personel_kapasite pk
            JOIN subeler s ON pk.sube_id = s.sube_id
            GROUP BY s.sube_id
        `);

        // Analiz sonuçlarını işle
        const sonuc = genelAnaliz.map(sube => {
            const oran = (sube.toplam_personel / sube.son_ay_toplam_hasta) * 100;
            return {
                sube: sube.sube_adi,
                oran: oran.toFixed(2),
                karar: oran < 1 ? "ACİL PERSONEL ALIMI GEREKLİ (%1 Altı)" :
                    oran < 5 ? "Personel Takviyesi Önerilir" : "Kadro Yeterli"
            };
        });

        return res.status(200).json(sonuc);

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
}

const personel_ekle = async (req, res) => {
    try {
        const { sube_id, bolum_id, personel_turu_id, personel_toplam } = req.body;
        await db.query(
            "INSERT INTO personel_kapasite (sube_id, bolum_id, personel_turu_id, personel_toplam) VALUES (?, ?, ?, ?)",
            [sube_id, bolum_id, personel_turu_id, personel_toplam]
        );
        return res.status(201).json({ message: "Personel kapasitesi eklendi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const personel_guncelle = async (req, res) => {
    try {
        // ID yerine composite key (sube, bolum, tur) kullanıyoruz veya req.params.id varsa ona göre.
        // Veritabanında 'personel_kapasite_id' varsa onu kullanmak daha doğru olur.
        // Mevcut kodda ID görmedik, composite varsayalım ya da parametre olarak ID bekleyelim.
        // Senaryo gereği ID üzerinden güncelleme yapalım:
        const { id } = req.params;
        const { personel_toplam } = req.body;

        // Eğer ID yoksa (Composite Key):
        if (!id) {
            const { sube_id, bolum_id, personel_turu_id } = req.body;
            await db.query(
                "UPDATE personel_kapasite SET personel_toplam = ? WHERE sube_id = ? AND bolum_id = ? AND personel_turu_id = ?",
                [personel_toplam, sube_id, bolum_id, personel_turu_id]
            );
        } else {
            // Tabloda ID varsa:
            // await db.query("UPDATE personel_kapasite SET personel_toplam = ? WHERE id = ?", [personel_toplam, id]);
            // ID yapısını bilmediğimiz için composite varsayımıyla devam edelim veya hata dönelim.
            // Hoca'nın senaryosunda ID olması muhtemel. Şimdilik query'i body'den alalım.
            return res.status(400).json({ error: "ID ile güncelleme desteklenmiyor, lütfen filtreleri body'de gönderin (sube_id vb.)" });
        }

        return res.status(200).json({ message: "Personel sayısı güncellendi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const personel_sil = async (req, res) => {
    try {
        const { sube_id, bolum_id, personel_turu_id } = req.body; // Silme için parametreleri body'den alalım
        await db.query(
            "DELETE FROM personel_kapasite WHERE sube_id = ? AND bolum_id = ? AND personel_turu_id = ?",
            [sube_id, bolum_id, personel_turu_id]
        );
        return res.status(200).json({ message: "Personel kaydı silindi" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = { personelleri_getir, personel_yuk_kontrol, personel_verimlilik_karnesi, personel_ekle, personel_guncelle, personel_sil };
