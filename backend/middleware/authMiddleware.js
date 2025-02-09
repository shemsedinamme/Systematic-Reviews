// backend/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('./database');
const { handleError } = require('./utils')

const authenticateToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return handleError(res, null, 401, 'Access token missing.');

    try {
        const [blacklisted] = await pool.query('SELECT * FROM blacklisted_tokens WHERE token = ?', [token]);
        if (blacklisted.length > 0) return handleError(res, null, 403, 'Token is invalid.');

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return handleError(res, err, 403, 'Token verification failed.');
            req.user = user;
            next();
        });
    } catch (error) {
       return  handleError(res, error, 500, 'Authentication failed.');
    }
};

module.exports = authenticateToken;

