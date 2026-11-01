function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Lỗi hệ thống nội bộ.';

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
}

module.exports = errorHandler;
