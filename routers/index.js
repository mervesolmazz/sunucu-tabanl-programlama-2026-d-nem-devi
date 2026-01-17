const router = require('express').Router();
const routes = require('./routes');

// Tüm API rotalarını ana router'a bağlıyoruz
router.use(routes);

module.exports = router;
