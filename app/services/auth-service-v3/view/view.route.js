const express = require("express");

const router = express.Router();

router.get('/login', (_, res) => {
  const html = require("./index.html")
  res.send(html);
});

module.exports = router;
