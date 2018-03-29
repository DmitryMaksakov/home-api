const
  bcrypt = require('bcryptjs');

// Compares password from authentication request and database stored password
function comparePass(password, databasePassword) {
  return bcrypt.compareSync(password, databasePassword);
}

// Returns password hash
function getPasswordHash(password) {
  if (!password) return;

  return bcrypt.hashSync(password, bcrypt.genSaltSync());
}

// Checks if user is authenticated
function loginRequired(req, res, next) {
  if (!req.user) return res.status(401).json({status: 'Please log in'});
  return next();
}

// Checks if user is administrator
function adminRequired(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({status: 'Please log into administrator account'});
  return next();
}

// Checks if user has to be redirected to login
function loginRedirect(req, res, next) {
  if (req.user) return res.status(200).json({status: 'You are already logged in'});
  return next();
}

// Handles errors
function handleErrors(req) {
  return new Promise((resolve, reject) => {
    if (req.body.username.length < 6) {
      reject({
        message: 'Username must be longer than 6 characters'
      });
    }
    else if (req.body.password.length < 6) {
      reject({
        message: 'Password must be longer than 6 characters'
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  getPasswordHash,
  comparePass,
  loginRequired,
  adminRequired,
  loginRedirect,
  handleErrors
};