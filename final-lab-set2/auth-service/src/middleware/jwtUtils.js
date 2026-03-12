const jwt = require('jsonwebtoken');
const SECRET  = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '1h';

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
module.exports = { generateToken, verifyToken };
