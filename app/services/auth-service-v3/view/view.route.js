const express = require("express");

const router = express.Router();

router.get('/login', (_, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = router;
