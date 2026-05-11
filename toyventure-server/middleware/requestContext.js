const crypto = require('crypto');

const assignRequestId = (req, res, next) => {
  const headerRequestId = req.get('x-request-id');
  req.requestId = headerRequestId || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};

const requestLogger = (req, res, next) => {
  // Commented out to prevent unnecessary console printing and reduce server load
  /*
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const forwardedFor = req.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;

    console.log(
      JSON.stringify({
        level: 'info',
        type: 'request',
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip,
        userAgent: req.get('user-agent'),
        userId: req.user?._id || null,
      })
    );
  });
  */

  next();
};

module.exports = { assignRequestId, requestLogger };