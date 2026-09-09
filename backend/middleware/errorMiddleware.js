const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // If status was already set (e.g. res.status(400) before throwing), use it.
  // Otherwise default to 500.
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    err.message = "Resource not found";
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    err.message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    err.message = `Duplicate value for field: ${field}`;
  }

  // 🔴 Always log the real error server-side, regardless of environment
  console.error("─────────────────────────────");
  console.error(`❌ ${req.method} ${req.originalUrl} → ${statusCode}`);
  console.error(err.stack || err.message);
  console.error("─────────────────────────────");

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export { notFound, errorHandler };