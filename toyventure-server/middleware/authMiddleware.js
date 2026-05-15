const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('Missing JWT_SECRET environment variable');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        if (user.isBanned) {
            // #region agent log
            fetch('http://127.0.0.1:7940/ingest/b612bf23-5ec8-4332-a873-59b574d24a82',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7f50'},body:JSON.stringify({sessionId:'6e7f50',hypothesisId:'H-E',location:'authMiddleware.js:protect',message:'banned user blocked',data:{userId:String(user._id)},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
            // #endregion
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// NEW: Admin Middleware to block regular users
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
