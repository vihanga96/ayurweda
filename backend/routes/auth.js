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

// Middleware to verify any authenticated user token
const verifyToken = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Get user profile (for any authenticated user)
router.get('/profile', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT id, name, email, role, phone, address, profile_picture, created_at, updated_at
        FROM users 
        WHERE id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        const user = results[0];
        // Remove sensitive information
        delete user.password;
        
        res.json({ user });
    });
});

// Update user profile (for any authenticated user)
router.put('/profile', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { name, email, phone, address } = req.body;

    // Validate required fields
    if (!name || !email) {
        return res.status(400).json({ msg: 'Name and email are required' });
    }

    // Check if email already exists for other users
    db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ msg: 'Email already exists' });
        }

        // Update user profile
        const updateData = {
            name,
            email,
            phone: phone || null,
            address: address || null,
            updated_at: new Date()
        };

        db.query('UPDATE users SET ? WHERE id = ?', [updateData, userId], (err, result) => {
            if (err) {
                console.error('Error updating profile:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ msg: 'User not found' });
            }
            res.json({ msg: 'Profile updated successfully' });
        });
    });
});

// Change password (for any authenticated user)
router.put('/change-password', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ msg: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ msg: 'New password must be at least 6 characters long' });
    }

    // Get current user to verify current password
    db.query('SELECT password FROM users WHERE id = ?', [userId], async (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, results[0].password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        db.query('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', 
            [hashedPassword, new Date(), userId], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            res.json({ msg: 'Password changed successfully' });
        });
    });
});

// Upload profile picture (for any authenticated user)
router.put('/profile-picture', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { profilePicture } = req.body;

    if (!profilePicture) {
        return res.status(400).json({ msg: 'Profile picture URL is required' });
    }

    // Update profile picture
    db.query('UPDATE users SET profile_picture = ?, updated_at = ? WHERE id = ?', 
        [profilePicture, new Date(), userId], (err, result) => {
        if (err) {
            console.error('Error updating profile picture:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'Profile picture updated successfully' });
    });
});

// Get user preferences (for any authenticated user)
router.get('/preferences', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    // For now, return basic preferences. This can be expanded later
    const preferences = {
        notifications: true,
        emailUpdates: true,
        theme: 'light'
    };
    
    res.json({ preferences });
});

// Update user preferences (for any authenticated user)
router.put('/preferences', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { notifications, emailUpdates, theme } = req.body;

    // For now, just acknowledge the request. This can be expanded later
    // when we add a preferences table to the database
    res.json({ msg: 'Preferences updated successfully' });
});

module.exports = router; 