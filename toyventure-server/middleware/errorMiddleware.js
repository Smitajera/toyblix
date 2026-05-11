const sendEmail = require('../utils/sendEmail');

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // 1. Determine the Status Code
  let statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  // Handle Mongoose Validation Errors automatically as 400 Bad Request
  if (err.name === 'ValidationError') {
    statusCode = 400;
  }
  
  // Handle Mongoose bad ObjectId (e.g., product not found) as 404
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    err.message = 'Resource not found';
  }

  // ==========================================
  // 2. CLIENT ERRORS (400 - 499)
  // Expected validation failures. Show the real message, DO NOT send an email.
  // ==========================================
  if (statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      message: err.message || 'Invalid request',
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  }

  // ==========================================
  // 3. SERVER CRASHES (500+)
  // Real bugs. Send the email and hide the ugly code from the user.
  // ==========================================
  const errorPayload = {
    level: 'error',
    type: 'request_error',
    requestId: req.requestId || 'N/A',
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message || 'Internal Server Error',
    stack: err.stack,
    time: new Date().toISOString()
  };

  // Log locally
  console.error(`[CRITICAL ERROR] ${statusCode} - ${req.originalUrl} - ${err.message}`);

  // Fire-and-forget: Send detailed crash report to developer email
  sendEmail({
    email: 'dhameliyaavadh592@gmail.com', 
    subject: `🚨 Urgent: ToyBlix Server Error (${statusCode})`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #fee2e2; padding-bottom: 10px;">🚨 ToyBlix Backend Exception</h2>
        <p><strong>Time:</strong> ${errorPayload.time}</p>
        <p><strong>Endpoint:</strong> <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${errorPayload.method}</span> ${errorPayload.path}</p>
        <p><strong>Status Code:</strong> ${errorPayload.statusCode}</p>
        <p><strong>Error Message:</strong> ${errorPayload.message}</p>
        <hr style="border: 0; height: 1px; background: #e5e7eb; margin: 20px 0;" />
        <h3 style="color: #374151;">Stack Trace:</h3>
        <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${errorPayload.stack}</pre>
      </div>
    `
  }).catch(e => console.error("Failed to send crash report email:", e));

  // Show fixed, user-friendly template to the client for genuine crashes
  res.status(statusCode).json({
    message: 'Oops! Something went wrong. Our engineering team has been automatically notified and is looking into it.',
    errorId: errorPayload.requestId
  });
};

module.exports = { notFound, errorHandler };