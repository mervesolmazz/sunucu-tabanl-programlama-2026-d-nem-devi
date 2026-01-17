const { APIError } = require("../../utils/erros");

const authMiddleware = (req, res, next) => {
    // Ödev kapsamında basit bir Auth placeholder'ı.
    // Gerçek projede burada JWT verify işlemi yapılır.
    // Şimdilik sadece "Authorization" header'ı var mı diye basit bir kontrol yapalım veya pas geçelim.

    // Örnek kullanım (token zorunlu ise açılabilir):
    /*
    const token = req.headers.authorization;
    if (!token) {
        return next(new APIError("Yetkisiz erişim! Lütfen giriş yapın.", 401));
    }
    */

    // Şimdilik herkes geçebilir (Passthrough)
    next();
};

module.exports = authMiddleware;
