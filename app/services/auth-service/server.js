require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware.js")
const passport = require("./config/passport.config.js")


const app = express();


app.use(express.json());

app.use(passport.initialize());
app.use(morgan("dev"));

app.use("/auth", authRoutes);

app.use(notFound)
app.use(errorHandler)

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

module.exports = app;
