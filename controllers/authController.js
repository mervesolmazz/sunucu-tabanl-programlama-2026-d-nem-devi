const db = require("../db/mysql_connect");
const bcrypt = require("bcrypt");

const kullanici_login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Hocanın 'musteriler' tablosu yerine projedeki 'users' tablosunu kullanıyoruz
        const [existingUser] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

        if (existingUser.length === 0) {
            return res.status(401).json({ error: "Geçersiz kullanıcı adı veya şifre" });
        }

        const user = existingUser[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Geçersiz kullanıcı adı veya şifre" });
        }

        // Basit bir session veya token mantığı eklenebilir ama şu anlık sadece başarılı yanıt dönüyoruz
        return res.status(200).json({ message: "Giriş başarılı", role: user.role });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

const kullanici_ekle = async (req, res) => {
    try {
        const { username, password, name, email, role } = req.body;

        const [existingUser] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [insertResult] = await db.query(
            "INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)",
            [username, hashedPassword, name, email, role || 'user']
        );

        return res.status(201).json({ message: "Kullanıcı başarıyla eklendi", user_id: insertResult.insertId });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = { kullanici_login, kullanici_ekle };
