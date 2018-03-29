const
  express = require('express'),
  request = require('request'),
  router = express.Router(),
  moment = require('moment'),
  authHelpers = require('../helpers/auth'),
  {passport, AUTH_CODES} = require('../modules/auth/strategies'),
  {wait} = require('../helpers/wait');

const WAIT_TIMEOUT = 5000;

// Login attempts {count, moment, busy} dictionary by username
let loggingAttemptsByUsername = {};

// Login
router.post('/login', authHelpers.loginRedirect, async (req, res, next) => {
  let username = req.body.username;

  if (loggingAttemptsByUsername[username]) {
    if (moment().utc().isAfter(loggingAttemptsByUsername[username].moment.add(1, 'h'))) {
      loggingAttemptsByUsername[username] = {
        timestamp: moment().utc(),
        count: 0
      };
    }

    loggingAttemptsByUsername[username].count++;
  } else {
    loggingAttemptsByUsername[username] = {
      timestamp: moment().utc(),
      count: 1
    };
  }

  // Limiting maximum count of login attempts per hour
  if (loggingAttemptsByUsername[username].count > process.env.MAX_LOGIN_ATTEMPTS_PER_HOUR) {
    if (loggingAttemptsByUsername[username].busy) {
      return res.status(429).send('Requests limit reached');
    } else {
      loggingAttemptsByUsername[username].busy = true;
      await wait(WAIT_TIMEOUT);
    }
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      handleResponse(res, 500, 'error: ' + err.toString());
    }

    if (!user) {
      if (info.code === AUTH_CODES.NOT_FOUND || info.code === AUTH_CODES.INCORRECT_PASSWORD) {
        handleResponse(res, 400, 'Incorrect user name or password');
      }
      else if (info.code === AUTH_CODES.BANNED) {
        handleResponse(res, 403, 'User is banned');
      }
    }
    else {
      req.logIn(user, function (err) {
        if (err) {
          handleResponse(res, 500, 'User was found but can`t login');
        }

        handleResponse(res, 200);
      });
    }

    loggingAttemptsByUsername[username].busy = false;
  })(req, res, next);
});

// Logout
router.get('/logout', authHelpers.loginRequired, (req, res, next) => {
  req.logout();
  handleResponse(res, 200, 'success');
});

// Returns info about current authenticated user
router.get('/info', authHelpers.loginRequired, (req, res, next) => {
  res.send({
    username: req.user.username,
    id: req.user.id
  });
});

function handleResponse(res, code, statusMsg) {
  res.status(code).json({status: statusMsg});
}

module.exports = router;