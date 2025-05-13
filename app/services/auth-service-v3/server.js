require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./shared-middleware/error.handler.js")
const passport = require("./oauth/google/config/passport/oauth.google.strategy.js")


const local = {
  email: require("./local/routes/local.email.routes.js"),
  token: require("./local/routes/local.token.routes.js"),
  user: require("./local/routes/local.user.routes.js")
}

const oauth = {
  google: require("./oauth/google/routes/oauth.google.routes.js")
}

const app = express();

app.use(express.json());
app.use(passport.initialize());
app.use(morgan("dev"));

app.use("/local/email", local.email);
app.use("/local/token", local.token);
app.use("/local/user", local.user);

app.use("/oauth", oauth.google);

(() => {
  if (process.env.NODE_ENV === "development") {
    app.use('/test', express.static(require("path").join(__dirname, 'view')));
    app.use("/test", require("./view/view.route.js"));
  }
})()

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

module.exports = app;
