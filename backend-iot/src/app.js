const express = require('express');

const app = express();

app.use(express.static('public'));
app.use(express.json());

app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes'));
app.use('/api/predios', require('./modules/predios/predios.routes'));
app.use('/api/accesos', require('./modules/accesos/accesos.routes'));
app.use('/api/paneles', require('./modules/paneles/paneles.routes'));
app.use('/api/dispositivos', require('./modules/dispositivos/dispositivos.routes'));
app.use('/api/circuitos', require('./modules/circuitos/circuitos.routes'));
app.use('/api/mediciones', require('./modules/mediciones/mediciones.routes'));
app.use('/api/analitica', require('./modules/analitica/analitica.routes'));
app.use('/api/alertas', require('./modules/alertas/alertas.routes'));

app.use(require('./middleware/errorHandler'));

module.exports = app;
