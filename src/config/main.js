(function(appConfig) {

  'use strict';

  require('dotenv').config();

  let
    express = require('express'),
    favicon = require('express-favicon'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    pgSession = require('connect-pg-simple')(session),
    path = require('path'),
    helmet = require('helmet'),
    compression = require('compression'),
    passport = require('passport'),
    flash = require('connect-flash'),
    cors = require('cors'),
    db = require('../modules/db/db');

  appConfig.init = function(app, express) {

    app.use(helmet());
    app.use(compression());
    app.use(express.static(path.join(__dirname, '..', '..', "public")));

    app.use(cookieParser()); // read cookies (needed for auth)
    app.use(bodyParser()); // get information from html forms

    app.use(session({
      store: new pgSession({
        pgPromise: db
      }),
      secret: process.env.SECRET_KEY,
      resave: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
    }));

    app.use(passport.initialize());
    app.use(passport.session()); // persistent login sessions
    app.use(flash()); // use connect-flash for flash messages stored in session

    app.use(cors({
      origin: [process.env.SITE_URL, process.env.DEBUG_URL],
      credentials: true,
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }));
  };

})(module.exports);