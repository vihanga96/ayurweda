const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Public registration route - only for patients
router.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Only allow patient registration
    const role = 'patient';

    // Check for existing user
    db.query('SELECT email FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const newUser = { name, email, password, role };

        // Hash password
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        db.query('INSERT INTO users SET ?', newUser, (err, result) => {
            if (err) throw err;
            res.json({ msg: 'Patient registered successfully' });
        });
    });
});

// Admin-only route to register students and doctors
router.post('/admin/register', verifyAdmin, (req, res) => {
    const { name, email, password, role } = req.body;

    // Simple validation
    if (!name || !email || !password || !role) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Only allow admin to register students and doctors
    const validRoles = ['student', 'doctor'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ msg: 'Invalid role. Admin can only register students and doctors.' });
    }

    // Check for existing user
    db.query('SELECT email FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const newUser = { name, email, password, role };

        // Hash password
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        db.query('INSERT INTO users SET ?', newUser, (err, result) => {
            if (err) throw err;
            res.json({ msg: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully` });
        });
    });
});

// Login route
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Check for user
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const user = results[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT payload
        const payload = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: 3600 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    role: user.role,
                    name: user.name
                });
            }
        );
    });
});

// Admin-only route to get all users
router.get('/admin/users', verifyAdmin, (req, res) => {
    db.query('SELECT id, name, email, role FROM users ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ users: results });
    });
});

// Admin-only route to get user by ID
router.get('/admin/users/:id', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ user: results[0] });
    });
});

// Admin-only route to update user
router.put('/admin/users/:id', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    const { name, email, role } = req.body;

    // Validate role
    const validRoles = ['patient', 'student', 'doctor', 'admin'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ msg: 'Invalid role' });
    }

    // Check if email already exists for other users
    if (email) {
        db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
            if (err) {
                console.error('Error checking email:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            if (results.length > 0) {
                return res.status(400).json({ msg: 'Email already exists' });
            }
            updateUser();
        });
    } else {
        updateUser();
    }

    function updateUser() {
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ msg: 'No fields to update' });
        }

        db.query('UPDATE users SET ? WHERE id = ?', [updateData, userId], (err, result) => {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ msg: 'User not found' });
            }
            res.json({ msg: 'User updated successfully' });
        });
    }
});

// Admin-only route to delete user
router.delete('/admin/users/:id', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'User deleted successfully' });
    });
});

// Admin-only route to get user statistics
router.get('/admin/users/stats', verifyAdmin, (req, res) => {
    const statsQuery = `
        SELECT 
            role,
            COUNT(*) as count
        FROM users 
        GROUP BY role
    `;
    
    db.query(statsQuery, (err, results) => {
        if (err) {
            console.error('Error fetching user stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        const stats = {
            total: 0,
            byRole: {}
        };
        
        results.forEach(row => {
            stats.byRole[row.role] = row.count;
            stats.total += row.count;
        });
        
        res.json({ stats });
    });
});

module.exports = router; 