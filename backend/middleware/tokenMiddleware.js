// middlewares/tokenMiddleware.js
const pool = require('../database'); // Adjust the path as necessary

const checkBlacklist = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return handleError(res, null, 401, 'No token provided.');

    try {
        const [blacklistedToken] = await pool.query('SELECT * FROM blacklisted_tokens WHERE token = ?', [token]);
        if (blacklistedToken.length > 0) {
            return handleError(res, null, 401, 'Token is blacklisted.');
        }
        next();
    } catch (error) {
        handleError(res, error, 500, 'Token validation failed.');
    }
};

module.exports = checkBlacklist;
