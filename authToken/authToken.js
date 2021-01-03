const jwt = require('jsonwebtoken');
const keys = require('../config/keys')
const User = require('../database/models').user
var secureRandom = require('secure-random');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const tokenFromHeader = authHeader && authHeader.split(' ')[1]
  if (tokenFromHeader == null) {
    return res.sendStatus(401);
  }
  jwt.verify(tokenFromHeader, keys.access_token_secret.tokenKey, (err, userClaims) => {
    if (err) {
      return res.sendStatus(401);
    }
    User.findOne({
      where: {
        email: userClaims.email
      },
    }).then(user => {
      if (user.authToken == tokenFromHeader) {
        if (user.email == user.email) {
          req.user = user;
          next();
        } else {
          res.json({
            success: false,
            code: 401,
            // userLogged: req.isAuthenticated(),
            message: 'Authentication token is wrong or expire.'
          });
        }
      } else {
        res.json({
          success: false,
          code: 401,
          // userLogged: req.isAuthenticated(),
          message: 'Authentication token is wrong or expire.'
        });
      }
    })
  })
}

module.exports = authenticateToken