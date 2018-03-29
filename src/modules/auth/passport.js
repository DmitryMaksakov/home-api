require('dotenv').config();

const passport = require('passport'),
  db = require('../db/db');

module.exports = () => {

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    db.oneOrNone(`select * from users where id=${Number(id)}`)
      .then(user => {
        done(null, user);
      })
      .catch(err => {
        done(err, null);
      });
  });

};