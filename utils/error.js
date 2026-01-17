// Async fonksiyonlardaki hataları otomatik yakalayan wrapper
const catchError = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchError;
