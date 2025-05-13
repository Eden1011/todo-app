const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../utils/token.util');
const convertTimeToMilliseconds = require('../utils/time.util');

const prisma = new PrismaClient();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.APP_URL}/auth/google/callback`,
  passReqToCallback: true
},
  async function(_req, _googleAccessToken, _googleRefreshToken, profile, cb) {
    try {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: profile.emails[0].value,
            email: profile.emails[0].value,
            googleId: profile.id,
            isVerified: true
          }
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.id,
            isVerified: true // user must first be logged in 
          }
        });
      }

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      const expirationMs = convertTimeToMilliseconds(process.env.REFRESH_TOKEN_EXPIRATION || "1h");
      const expiresAt = new Date(Date.now() + expirationMs);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt
        }
      });

      user.accessToken = accessToken;
      user.refreshToken = refreshToken;

      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }
));

module.exports = passport;
