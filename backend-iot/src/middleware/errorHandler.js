function errorHandler(error, _req, res, _next) {
  console.error(error);
  res.status(error.status || 500).json({ error: error.publicMessage || 'Error interno' });
}

module.exports = errorHandler;
