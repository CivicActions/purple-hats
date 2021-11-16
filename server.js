'use strict';

const express = require('express');

// Commented out as Port/Host shouldn't be needed
// Constants
// const PORT = 8080;
// const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Commented out as Port/Host shouldn't be needed
// app.listen(PORT, HOST);
// console.log(`Running on http://${HOST}:${PORT}`);
