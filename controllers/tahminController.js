const db = require("../db/mysql_connect");

// Basit Doğrusal Regresyon Algoritması (Linear Regression)
// Gelecek değeri tahmin etmek için: y = mx + b
function linearRegression(y) {
    const n = y.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
        const val = Number(y[i] || 0); // Güvenli çevirim
        sumX += i;
        sumY += val;
        sumXY += i * val;
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Bir sonraki adımı tahmin et (x = n)
    const nextValue = slope * n + intercept;
    return { nextValue, slope };
}

const gelecek_tahmini_yap = async (req, res) => {
    try {
        // Her bölümün son 6 aylık verisini çek
        // (GROUP BY bolum_id ile ayırıp analiz edeceğiz)
        const [rows] = await db.query(`
            SELECT 
                b.bolum_adi,
                b.bolum_id,
                abv.yatan_hasta_sayisi,
                abv.aylik_baslangic
            FROM aylik_bolum_verisi abv
            JOIN bolumler b ON abv.bolum_id = b.bolum_id
            ORDER BY b.bolum_id, abv.aylik_baslangic ASC
        `);

        // Veriyi JS tarafında gruplayıp analize sokuyoruz (SQL'de karmaşık window function yerine)
        const bolumVerileri = {};
        rows.forEach(row => {
            if (!bolumVerileri[row.bolum_id]) {
                bolumVerileri[row.bolum_id] = { adi: row.bolum_adi, veriler: [] };
            }
            bolumVerileri[row.bolum_id].veriler.push(row.yatan_hasta_sayisi);
        });

        // Tahminleri Hesapla
        const tahminler = [];
        for (const id in bolumVerileri) {
            const bolum = bolumVerileri[id];
            // En az 3 veri noktası varsa tahmin yap
            if (bolum.veriler.length >= 3) {
                const analiz = linearRegression(bolum.veriler);
                const sonDeger = bolum.veriler[bolum.veriler.length - 1];
                const beklenenArtis = analiz.nextValue - sonDeger;

                tahminler.push({
                    bolum_adi: bolum.adi,
                    mevcut_hasta: sonDeger,
                    tahmini_hasta: Math.round(analiz.nextValue),
                    egilim: analiz.slope > 0 ? 'ARTIS' : 'AZALIS', // Trend yönü
                    degisim_orani: ((beklenenArtis / sonDeger) * 100).toFixed(1)
                });
            }
        }

        return res.status(200).json(tahminler);

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = { gelecek_tahmini_yap };
