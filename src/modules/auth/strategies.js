const
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  escape = require('sql-escape'),
  authHelpers = require('../../helpers/auth'),
  db = require('../db/db'),
  init = require('./passport'),
  caseMapper = require('../../helpers/caseMapper');

const AUTH_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  INCORRECT_PASSWORD: 'INCORRECT_PASSWORD',
  BANNED: 'BANNED',
  OK: 'OK'
};

const options = {};

init();

passport.use(new LocalStrategy(options, async (username, password, done) => {

  try {
    const user = caseMapper(await db.oneOrNone(`select * from users where username='${escape(username.toLowerCase())}'`));

    if (!user) return done(null, false, { code: AUTH_CODES.NOT_FOUND });

    if (!authHelpers.comparePass(password, user.password)) {
      return done(null, false, { code: AUTH_CODES.INCORRECT_PASSWORD });
    } else {
      if (user.isBanned) {
        return done(null, false, { code: AUTH_CODES.BANNED });
      }

      return done(null, user);
    }
  } catch(e) {
    return done(e);
  }
}));

module.exports = {passport, AUTH_CODES};
