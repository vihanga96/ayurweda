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
    
    // Simple query with only essential columns
    const query = 'SELECT id, name, email, role, phone, address FROM users WHERE id = ?';
    
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

// Get doctor profile (fallback for doctors)
router.get('/doctor-profile', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ msg: 'Access denied. Doctor privileges required.' });
    }
    
    const query = `
        SELECT u.id, u.name, u.email, u.phone, u.address, u.role,
               d.specialization, d.experience_years, d.consultation_fee, 
               d.is_available
        FROM users u
        LEFT JOIN doctors d ON u.id = d.user_id
        WHERE u.id = ? AND u.role = 'doctor'
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching doctor profile:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const doctor = results[0];
        // Remove sensitive information
        delete doctor.password;
        
        res.json({ doctor });
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
            address: address || null
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
        db.query('UPDATE users SET password = ? WHERE id = ?', 
            [hashedPassword, userId], (err, result) => {
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
    db.query('UPDATE users SET profile_picture = ? WHERE id = ?', 
        [profilePicture, userId], (err, result) => {
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

// Test endpoint to check database connection
router.get('/test', (req, res) => {
    db.query('SELECT 1 as test', (err, results) => {
        if (err) {
            console.error('Database connection test failed:', err);
            return res.status(500).json({ msg: 'Database connection failed', error: err.message });
        }
        res.json({ msg: 'Database connection successful', test: results[0] });
    });
});

// Admin Doctor Management Routes

// Get all doctors (admin only)
router.get('/admin/doctors', verifyAdmin, (req, res) => {
    const query = `
        SELECT u.id, u.name, u.email, u.phone, u.address, u.created_at,
               d.specialization, d.experience_years, d.consultation_fee, d.is_available,
               COUNT(DISTINCT a.id) as total_appointments,
               COUNT(DISTINCT a.patient_id) as total_patients
        FROM users u
        LEFT JOIN doctors d ON u.id = d.user_id
        LEFT JOIN appointments a ON d.id = a.doctor_id
        WHERE u.role = 'doctor'
        GROUP BY u.id, d.id
        ORDER BY u.name
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching doctors:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ doctors: results });
    });
});

// Get doctor statistics (admin only)
router.get('/admin/doctors/stats', verifyAdmin, (req, res) => {
    const statsQuery = `
        SELECT 
            COUNT(DISTINCT u.id) as total_doctors,
            SUM(CASE WHEN d.is_available = 1 THEN 1 ELSE 0 END) as available_doctors,
            SUM(CASE WHEN d.is_available = 0 THEN 1 ELSE 0 END) as unavailable_doctors,
            COUNT(DISTINCT CASE WHEN DATE(a.appointment_date) = CURDATE() THEN a.id END) as todays_appointments,
            SUM(CASE WHEN MONTH(a.appointment_date) = MONTH(CURDATE()) AND YEAR(a.appointment_date) = YEAR(CURDATE()) THEN d.consultation_fee ELSE 0 END) as monthly_revenue
        FROM users u
        LEFT JOIN doctors d ON u.id = d.user_id
        LEFT JOIN appointments a ON d.id = a.doctor_id
        WHERE u.role = 'doctor'
    `;
    
    db.query(statsQuery, (err, results) => {
        if (err) {
            console.error('Error fetching doctor stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        const stats = results[0];
        if (stats) {
            stats.monthly_revenue = parseFloat(stats.monthly_revenue) || 0;
            stats.total_doctors = parseInt(stats.total_doctors) || 0;
            stats.available_doctors = parseInt(stats.available_doctors) || 0;
            stats.unavailable_doctors = parseInt(stats.unavailable_doctors) || 0;
            stats.todays_appointments = parseInt(stats.todays_appointments) || 0;
        }
        
        res.json({ stats: stats });
    });
});

// Get single doctor details (admin only)
router.get('/admin/doctors/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT u.id, u.name, u.email, u.phone, u.address, u.created_at,
               d.specialization, d.experience_years, d.consultation_fee, d.is_available,
               COUNT(DISTINCT a.id) as total_appointments,
               COUNT(DISTINCT a.patient_id) as total_patients
        FROM users u
        LEFT JOIN doctors d ON u.id = d.user_id
        LEFT JOIN appointments a ON d.id = a.doctor_id
        WHERE u.id = ? AND u.role = 'doctor'
        GROUP BY u.id, d.id
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching doctor details:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        res.json({ doctor: results[0] });
    });
});

// Update doctor availability (admin only)
router.put('/admin/doctors/:id/availability', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { is_available } = req.body;
    
    // First check if doctor exists
    const checkQuery = 'SELECT id FROM doctors WHERE user_id = ?';
    
    db.query(checkQuery, [id], (err, results) => {
        if (err) {
            console.error('Error checking doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        // Update availability
        const updateQuery = 'UPDATE doctors SET is_available = ? WHERE user_id = ?';
        
        db.query(updateQuery, [is_available, id], (err, result) => {
            if (err) {
                console.error('Error updating doctor availability:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ msg: 'Doctor availability updated successfully' });
        });
    });
});

// Admin: Update doctor details
router.put('/admin/doctors/:id', verifyAdmin, async (req, res) => {
    const doctorId = req.params.id;
    const { name, email, password, phone, address, specialization, experience_years, consultation_fee, is_available } = req.body;
    
    // Validate required fields
    if (!name || !email) {
        return res.status(400).json({ msg: 'Name and email are required' });
    }
    
    // Check if email is being changed and if it already exists for another user
    const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
    
    db.query(checkEmailQuery, [email, doctorId], (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ msg: 'Email already exists for another user' });
        }
        
        // Start transaction
        db.beginTransaction(async (err) => {
            if (err) {
                console.error('Error starting transaction:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            try {
                // Prepare user update query and parameters
                let userUpdateQuery = `
                    UPDATE users 
                    SET name = ?, email = ?, phone = ?, address = ?
                    WHERE id = ? AND role = 'doctor'
                `;
                let userUpdateParams = [name, email, phone || '', address || '', doctorId];
                
                // If password is provided, hash it and include in update
                if (password && password.trim() !== '') {
                    const bcrypt = require('bcryptjs');
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(password, salt);
                    
                    userUpdateQuery = `
                        UPDATE users 
                        SET name = ?, email = ?, phone = ?, address = ?, password = ?
                        WHERE id = ? AND role = 'doctor'
                    `;
                    userUpdateParams = [name, email, phone || '', address || '', hashedPassword, doctorId];
                }
                
                db.query(userUpdateQuery, userUpdateParams, (err, userResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error updating user:', err);
                        res.status(500).json({ msg: 'Server error' });
                    });
                }
                
                if (userResult.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ msg: 'Doctor not found' });
                    });
                }
                
                // Update or insert doctor record
                const doctorUpdateQuery = `
                    INSERT INTO doctors (user_id, specialization, experience_years, consultation_fee, is_available)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        specialization = VALUES(specialization),
                        experience_years = VALUES(experience_years),
                        consultation_fee = VALUES(consultation_fee),
                        is_available = VALUES(is_available)
                `;
                
                db.query(doctorUpdateQuery, [
                    doctorId,
                    specialization || 'General Medicine',
                    experience_years || 0,
                    consultation_fee || 1000,
                    is_available !== undefined ? is_available : true
                ], (err, doctorResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error updating doctor record:', err);
                            res.status(500).json({ msg: 'Server error' });
                        });
                    }
                    
                    // Commit transaction
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ msg: 'Server error' });
                            });
                        }
                        
                        res.json({ msg: 'Doctor updated successfully' });
                    });
                });
            });
            } catch (error) {
                return db.rollback(() => {
                    console.error('Error in doctor update transaction:', error);
                    res.status(500).json({ msg: 'Server error' });
                });
            }
        });
    });
});

// Admin: Delete doctor
router.delete('/admin/doctors/:id', verifyAdmin, (req, res) => {
    const doctorId = req.params.id;
    
    // Start transaction to safely delete doctor and user
    db.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        // First check if doctor exists and get user_id
        const checkQuery = 'SELECT user_id FROM doctors WHERE user_id = ?';
        
        db.query(checkQuery, [doctorId], (err, doctorResults) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Error checking doctor:', err);
                    res.status(500).json({ msg: 'Server error' });
                });
            }
            
            if (doctorResults.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ msg: 'Doctor not found' });
                });
            }
            
            // Delete doctor record first (due to foreign key constraint)
            const deleteDoctorQuery = 'DELETE FROM doctors WHERE user_id = ?';
            
            db.query(deleteDoctorQuery, [doctorId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error deleting doctor record:', err);
                        res.status(500).json({ msg: 'Server error' });
                    });
                }
                
                // Then delete user record
                const deleteUserQuery = 'DELETE FROM users WHERE id = ? AND role = "doctor"';
                
                db.query(deleteUserQuery, [doctorId], (err, userResult) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error deleting user record:', err);
                            res.status(500).json({ msg: 'Server error' });
                        });
                    }
                    
                    if (userResult.affectedRows === 0) {
                        return db.rollback(() => {
                            res.status(404).json({ msg: 'Doctor user not found' });
                        });
                    }
                    
                    // Commit transaction
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ msg: 'Server error' });
                            });
                        }
                        
                        res.json({ msg: 'Doctor deleted successfully' });
                    });
                });
            });
        });
    });
});

// Admin: Get doctor earnings/revenue
router.get('/admin/doctors/:id/earnings', verifyAdmin, (req, res) => {
    const doctorId = req.params.id;
    const { period = 'all', year, month } = req.query;
    
    let dateFilter = '';
    let params = [doctorId];
    
    // Build date filter based on period
    if (period === 'year' && year) {
        dateFilter = 'AND YEAR(a.appointment_date) = ?';
        params.push(year);
    } else if (period === 'month' && year && month) {
        dateFilter = 'AND YEAR(a.appointment_date) = ? AND MONTH(a.appointment_date) = ?';
        params.push(year, month);
    } else if (period === 'current_month') {
        dateFilter = 'AND YEAR(a.appointment_date) = YEAR(CURDATE()) AND MONTH(a.appointment_date) = MONTH(CURDATE())';
    } else if (period === 'current_year') {
        dateFilter = 'AND YEAR(a.appointment_date) = YEAR(CURDATE())';
    } else if (period === 'last_30_days') {
        dateFilter = 'AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }
    
    const query = `
        SELECT 
            u.id,
            u.name as doctor_name,
            d.specialization,
            d.consultation_fee,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed_appointments,
            COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_appointments,
            COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
            (COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * d.consultation_fee) as total_earnings,
            MIN(a.appointment_date) as first_appointment,
            MAX(a.appointment_date) as last_appointment
        FROM users u
        JOIN doctors d ON u.id = d.user_id
        LEFT JOIN appointments a ON d.id = a.doctor_id ${dateFilter}
        WHERE u.id = ? AND u.role = 'doctor'
        GROUP BY u.id, d.id
    `;
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching doctor earnings:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const earnings = results[0];
        
        // Convert to proper numbers
        earnings.completed_appointments = parseInt(earnings.completed_appointments) || 0;
        earnings.confirmed_appointments = parseInt(earnings.confirmed_appointments) || 0;
        earnings.pending_appointments = parseInt(earnings.pending_appointments) || 0;
        earnings.cancelled_appointments = parseInt(earnings.cancelled_appointments) || 0;
        earnings.total_earnings = parseFloat(earnings.total_earnings) || 0;
        earnings.consultation_fee = parseFloat(earnings.consultation_fee) || 0;
        
        res.json({ earnings });
    });
});

// Admin: Get all doctors earnings summary
router.get('/admin/doctors-earnings', verifyAdmin, (req, res) => {
    const { period = 'current_month' } = req.query;
    
    let dateFilter = '';
    
    // Build date filter based on period
    if (period === 'current_month') {
        dateFilter = 'AND YEAR(a.appointment_date) = YEAR(CURDATE()) AND MONTH(a.appointment_date) = MONTH(CURDATE())';
    } else if (period === 'current_year') {
        dateFilter = 'AND YEAR(a.appointment_date) = YEAR(CURDATE())';
    } else if (period === 'last_30_days') {
        dateFilter = 'AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'last_6_months') {
        dateFilter = 'AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
    }
    
    const query = `
        SELECT 
            u.id,
            u.name as doctor_name,
            d.specialization,
            d.consultation_fee,
            d.is_available,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed_appointments,
            COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_appointments,
            (COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * d.consultation_fee) as total_earnings,
            ROUND(
                (COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * d.consultation_fee) / 
                NULLIF(COUNT(CASE WHEN a.status != 'cancelled' THEN 1 END), 0), 2
            ) as avg_earnings_per_appointment
        FROM users u
        JOIN doctors d ON u.id = d.user_id
        LEFT JOIN appointments a ON d.id = a.doctor_id ${dateFilter}
        WHERE u.role = 'doctor'
        GROUP BY u.id, d.id
        ORDER BY total_earnings DESC, completed_appointments DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching doctors earnings:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        // Convert to proper numbers and calculate totals
        let totalEarnings = 0;
        let totalAppointments = 0;
        
        const doctorsEarnings = results.map(doctor => {
            doctor.completed_appointments = parseInt(doctor.completed_appointments) || 0;
            doctor.confirmed_appointments = parseInt(doctor.confirmed_appointments) || 0;
            doctor.pending_appointments = parseInt(doctor.pending_appointments) || 0;
            doctor.total_earnings = parseFloat(doctor.total_earnings) || 0;
            doctor.consultation_fee = parseFloat(doctor.consultation_fee) || 0;
            doctor.avg_earnings_per_appointment = parseFloat(doctor.avg_earnings_per_appointment) || 0;
            
            totalEarnings += doctor.total_earnings;
            totalAppointments += doctor.completed_appointments;
            
            return doctor;
        });
        
        res.json({ 
            doctors: doctorsEarnings,
            summary: {
                total_earnings: totalEarnings,
                total_completed_appointments: totalAppointments,
                average_earnings_per_doctor: doctorsEarnings.length > 0 ? totalEarnings / doctorsEarnings.length : 0,
                period: period
            }
        });
    });
});

// Add new doctor (admin only)
router.post('/admin/doctors', verifyAdmin, async (req, res) => {
    console.log('=== ADD DOCTOR ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    
    const { name, email, password, phone, address, specialization, experience_years, consultation_fee, is_available } = req.body;
    
    if (!name || !email || !password) {
        console.log('Validation failed - missing required fields');
        return res.status(400).json({ msg: 'Name, email, and password are required' });
    }
    
    try {
        console.log('Checking if email exists...');
        // Check if email already exists
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ?';
        const emailExists = await new Promise((resolve, reject) => {
            db.query(checkEmailQuery, [email], (err, results) => {
                if (err) {
                    console.error('Error checking email:', err);
                    reject(err);
                } else {
                    console.log('Email check results:', results);
                    resolve(results.length > 0);
                }
            });
        });
        
        if (emailExists) {
            console.log('Email already exists');
            return res.status(400).json({ msg: 'Email already exists' });
        }
        
        console.log('Email is available, starting transaction...');
        
        // Start transaction
        db.beginTransaction(async (err) => {
            if (err) {
                console.error('Error starting transaction:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            try {
                console.log('Creating user account...');
                // Create user account with provided password
                const bcrypt = require('bcryptjs');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                const userData = {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'doctor',
                    phone: phone || null,
                    address: address || null
                };
                
                console.log('User data to insert:', { ...userData, password: '[HIDDEN]' });
                
                const insertUserResult = await new Promise((resolve, reject) => {
                    db.query('INSERT INTO users SET ?', [userData], (err, result) => {
                        if (err) {
                            console.error('Error inserting user:', err);
                            reject(err);
                        } else {
                            console.log('User inserted successfully:', result);
                            resolve(result);
                        }
                    });
                });
                
                const userId = insertUserResult.insertId;
                console.log('User ID:', userId);
                
                // Create doctor record
                const doctorData = {
                    user_id: userId,
                    specialization: specialization || 'General Medicine',
                    experience_years: parseInt(experience_years) || 0,
                    consultation_fee: parseFloat(consultation_fee) || 1000,
                    is_available: is_available !== undefined ? is_available : true
                };
                
                console.log('Doctor data to insert:', doctorData);
                
                await new Promise((resolve, reject) => {
                    db.query('INSERT INTO doctors SET ?', [doctorData], (err, result) => {
                        if (err) {
                            console.error('Error inserting doctor record:', err);
                            reject(err);
                        } else {
                            console.log('Doctor record inserted successfully:', result);
                            resolve(result);
                        }
                    });
                });
                
                // Commit transaction
                console.log('Committing transaction...');
                db.commit((err) => {
                    if (err) {
                        console.error('Error committing transaction:', err);
                        return db.rollback(() => {
                            console.log('Transaction rolled back');
                            res.status(500).json({ msg: 'Server error' });
                        });
                    }
                    
                    console.log('Transaction committed successfully');
                    res.json({ 
                        msg: 'Doctor added successfully',
                        doctor: {
                            id: userId,
                            name,
                            email
                        }
                    });
                });
                
            } catch (error) {
                console.error('Error creating doctor in transaction:', error);
                db.rollback(() => {
                    console.log('Transaction rolled back due to error');
                    res.status(500).json({ msg: 'Server error' });
                });
            }
        });
        
    } catch (error) {
        console.error('Error adding doctor (outer catch):', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ===== ADMIN STUDENT MANAGEMENT ROUTES =====

// Admin: Get all students with filtering and pagination
router.get('/admin/students', verifyAdmin, (req, res) => {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            u.id,
            u.name,
            u.email,
            u.phone,
            u.address,
            u.created_at,
            COUNT(DISTINCT sa.id) as total_applications,
            COUNT(DISTINCT CASE WHEN sa.status = 'approved' THEN sa.id END) as approved_applications,
            COUNT(DISTINCT CASE WHEN sa.status = 'pending' THEN sa.id END) as pending_applications,
            COUNT(DISTINCT ar.id) as academic_records,
            AVG(ar.gpa) as average_gpa
        FROM users u
        LEFT JOIN student_applications sa ON u.id = sa.student_id
        LEFT JOIN academic_records ar ON u.id = ar.student_id
        WHERE u.role = 'student'
    `;
    
    const params = [];
    
    if (search) {
        query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Count query for pagination
    let countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        WHERE u.role = 'student'
    `;
    const countParams = [];
    
    if (search) {
        countQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
    }
    
    db.query(countQuery, countParams, (err, countResults) => {
        if (err) {
            console.error('Error counting students:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Error fetching students:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            // Convert to proper numbers
            const students = results.map(student => ({
                ...student,
                total_applications: parseInt(student.total_applications) || 0,
                approved_applications: parseInt(student.approved_applications) || 0,
                pending_applications: parseInt(student.pending_applications) || 0,
                academic_records: parseInt(student.academic_records) || 0,
                average_gpa: parseFloat(student.average_gpa) || 0
            }));
            
            res.json({
                students,
                total: countResults[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        });
    });
});

// Admin: Get student statistics
router.get('/admin/students/stats', verifyAdmin, (req, res) => {
    const statsQuery = `
        SELECT 
            COUNT(DISTINCT u.id) as total_students,
            COUNT(DISTINCT sa.id) as total_applications,
            COUNT(DISTINCT CASE WHEN sa.status = 'pending' THEN sa.id END) as pending_applications,
            COUNT(DISTINCT CASE WHEN sa.status = 'approved' THEN sa.id END) as approved_applications,
            COUNT(DISTINCT CASE WHEN sa.status = 'rejected' THEN sa.id END) as rejected_applications,
            COUNT(DISTINCT ar.id) as total_academic_records,
            AVG(ar.gpa) as overall_average_gpa,
            COUNT(DISTINCT c.id) as active_courses
        FROM users u
        LEFT JOIN student_applications sa ON u.id = sa.student_id
        LEFT JOIN academic_records ar ON u.id = ar.student_id
        LEFT JOIN courses c ON c.is_active = TRUE
        WHERE u.role = 'student'
    `;
    
    db.query(statsQuery, (err, results) => {
        if (err) {
            console.error('Error fetching student stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        const stats = results[0];
        
        // Convert to proper numbers
        stats.total_students = parseInt(stats.total_students) || 0;
        stats.total_applications = parseInt(stats.total_applications) || 0;
        stats.pending_applications = parseInt(stats.pending_applications) || 0;
        stats.approved_applications = parseInt(stats.approved_applications) || 0;
        stats.rejected_applications = parseInt(stats.rejected_applications) || 0;
        stats.total_academic_records = parseInt(stats.total_academic_records) || 0;
        stats.overall_average_gpa = parseFloat(stats.overall_average_gpa) || 0;
        stats.active_courses = parseInt(stats.active_courses) || 0;
        
        res.json({ stats });
    });
});

// Admin: Get single student details
router.get('/admin/students/:id', verifyAdmin, (req, res) => {
    const studentId = req.params.id;
    
    const studentQuery = `
        SELECT u.*, 
               COUNT(DISTINCT sa.id) as total_applications,
               COUNT(DISTINCT ar.id) as academic_records,
               AVG(ar.gpa) as average_gpa
        FROM users u
        LEFT JOIN student_applications sa ON u.id = sa.student_id
        LEFT JOIN academic_records ar ON u.id = ar.student_id
        WHERE u.id = ? AND u.role = 'student'
        GROUP BY u.id
    `;
    
    db.query(studentQuery, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Student not found' });
        }
        
        const student = results[0];
        
        // Get applications
        const applicationsQuery = `
            SELECT sa.*, c.name as course_name, c.code as course_code
            FROM student_applications sa
            LEFT JOIN courses c ON sa.course_id = c.id
            WHERE sa.student_id = ?
            ORDER BY sa.created_at DESC
        `;
        
        db.query(applicationsQuery, [studentId], (err, applications) => {
            if (err) {
                console.error('Error fetching applications:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            // Get academic records
            const recordsQuery = `
                SELECT ar.*, c.name as course_name, c.code as course_code
                FROM academic_records ar
                LEFT JOIN courses c ON ar.course_id = c.id
                WHERE ar.student_id = ?
                ORDER BY ar.semester_year DESC, ar.semester_number DESC
            `;
            
            db.query(recordsQuery, [studentId], (err, records) => {
                if (err) {
                    console.error('Error fetching academic records:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                // Convert to proper numbers
                student.total_applications = parseInt(student.total_applications) || 0;
                student.academic_records = parseInt(student.academic_records) || 0;
                student.average_gpa = parseFloat(student.average_gpa) || 0;
                
                res.json({
                    student,
                    applications,
                    academic_records: records
                });
            });
        });
    });
});

// Admin: Update student information
router.put('/admin/students/:id', verifyAdmin, async (req, res) => {
    const studentId = req.params.id;
    const { name, email, phone, address, password } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ msg: 'Name and email are required' });
    }
    
    try {
        // Check if email exists for another user
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
        db.query(checkEmailQuery, [email, studentId], async (err, results) => {
            if (err) {
                console.error('Error checking email:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ msg: 'Email already exists for another user' });
            }
            
            let updateQuery = `
                UPDATE users 
                SET name = ?, email = ?, phone = ?, address = ?
                WHERE id = ? AND role = 'student'
            `;
            let updateParams = [name, email, phone || '', address || '', studentId];
            
            // If password is provided, hash it and include in update
            if (password && password.trim() !== '') {
                const bcrypt = require('bcryptjs');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                updateQuery = `
                    UPDATE users 
                    SET name = ?, email = ?, phone = ?, address = ?, password = ?
                    WHERE id = ? AND role = 'student'
                `;
                updateParams = [name, email, phone || '', address || '', hashedPassword, studentId];
            }
            
            db.query(updateQuery, updateParams, (err, result) => {
                if (err) {
                    console.error('Error updating student:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ msg: 'Student not found' });
                }
                
                res.json({ msg: 'Student updated successfully' });
            });
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Admin: Delete student
router.delete('/admin/students/:id', verifyAdmin, (req, res) => {
    const studentId = req.params.id;
    
    // Check if student exists
    const checkQuery = 'SELECT id FROM users WHERE id = ? AND role = "student"';
    db.query(checkQuery, [studentId], (err, results) => {
        if (err) {
            console.error('Error checking student:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Student not found' });
        }
        
        // Delete student (CASCADE will handle related records)
        const deleteQuery = 'DELETE FROM users WHERE id = ? AND role = "student"';
        db.query(deleteQuery, [studentId], (err, result) => {
            if (err) {
                console.error('Error deleting student:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ msg: 'Student deleted successfully' });
        });
    });
});

// Admin: Manage student applications
router.put('/admin/students/:studentId/applications/:applicationId', verifyAdmin, (req, res) => {
    const { studentId, applicationId } = req.params;
    const { status, admin_notes } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'waitlisted'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const updateQuery = `
        UPDATE student_applications 
        SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ? AND student_id = ?
    `;
    
    db.query(updateQuery, [status, admin_notes || '', req.user.id, applicationId, studentId], (err, result) => {
        if (err) {
            console.error('Error updating application:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Application not found' });
        }
        
        res.json({ msg: 'Application status updated successfully' });
    });
});

// Admin: Add academic record for student
router.post('/admin/students/:id/academic-records', verifyAdmin, (req, res) => {
    const studentId = req.params.id;
    const { course_id, semester_year, semester_number, gpa, total_credits, status, completion_date, notes } = req.body;
    
    if (!course_id || !semester_year || !semester_number) {
        return res.status(400).json({ msg: 'Course ID, semester year, and semester number are required' });
    }
    
    const recordData = {
        student_id: studentId,
        course_id: course_id,
        semester_year: semester_year,
        semester_number: semester_number,
        gpa: gpa || null,
        total_credits: total_credits || null,
        status: status || 'enrolled',
        completion_date: completion_date || null,
        notes: notes || null
    };
    
    db.query('INSERT INTO academic_records SET ?', recordData, (err, result) => {
        if (err) {
            console.error('Error adding academic record:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ 
            msg: 'Academic record added successfully',
            record_id: result.insertId
        });
    });
});

// Admin: Get all courses for student assignment
router.get('/admin/courses', verifyAdmin, (req, res) => {
    const query = `
        SELECT c.*, cc.name as category_name, 
               COUNT(sa.id) as application_count,
               COUNT(CASE WHEN sa.status = 'approved' THEN 1 END) as approved_count
        FROM courses c
        LEFT JOIN course_categories cc ON c.category_id = cc.id
        LEFT JOIN student_applications sa ON c.id = sa.course_id
        GROUP BY c.id
        ORDER BY c.name ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        // Convert to proper numbers
        const courses = results.map(course => ({
            ...course,
            application_count: parseInt(course.application_count) || 0,
            approved_count: parseInt(course.approved_count) || 0
        }));
        
        res.json({ courses });
    });
});

// ============ ADMIN COURSE MANAGEMENT ROUTES ============

// Admin: Get course categories
router.get('/admin/course-categories', verifyAdmin, (req, res) => {
    const query = 'SELECT * FROM course_categories WHERE is_active = TRUE ORDER BY name ASC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching course categories:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ categories: results });
    });
});

// Admin: Create new course
router.post('/admin/courses', verifyAdmin, (req, res) => {
    const {
        name, code, description, category_id, level, duration,
        credits, max_students, fee, start_date, end_date
    } = req.body;

    if (!name || !code) {
        return res.status(400).json({ msg: 'Course name and code are required' });
    }

    const query = `
        INSERT INTO courses 
        (name, code, description, category_id, level, duration, credits, max_students, fee, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        name, code, description, category_id || null, level || 'beginner',
        duration || null, credits || null, max_students || null,
        fee || null, start_date || null, end_date || null
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error creating course:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ msg: 'Course code already exists' });
            }
            return res.status(500).json({ msg: 'Server error' });
        }

        res.status(201).json({
            msg: 'Course created successfully',
            course_id: result.insertId
        });
    });
});

// Admin: Update course
router.put('/admin/courses/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const {
        name, code, description, category_id, level, duration,
        credits, max_students, fee, start_date, end_date, is_active
    } = req.body;

    if (!name || !code) {
        return res.status(400).json({ msg: 'Course name and code are required' });
    }

    const query = `
        UPDATE courses SET 
        name = ?, code = ?, description = ?, category_id = ?, level = ?,
        duration = ?, credits = ?, max_students = ?, fee = ?, 
        start_date = ?, end_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const values = [
        name, code, description, category_id || null, level || 'beginner',
        duration || null, credits || null, max_students || null,
        fee || null, start_date || null, end_date || null,
        is_active !== undefined ? is_active : true, id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating course:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ msg: 'Course code already exists' });
            }
            return res.status(500).json({ msg: 'Server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        res.json({ msg: 'Course updated successfully' });
    });
});

// Admin: Delete course
router.delete('/admin/courses/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    // Check if course has applications
    const checkQuery = 'SELECT COUNT(*) as application_count FROM student_applications WHERE course_id = ?';
    
    db.query(checkQuery, [id], (err, results) => {
        if (err) {
            console.error('Error checking course applications:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        const applicationCount = results[0].application_count;
        
        if (applicationCount > 0) {
            // Soft delete by setting is_active to false
            const updateQuery = 'UPDATE courses SET is_active = FALSE WHERE id = ?';
            db.query(updateQuery, [id], (err, result) => {
                if (err) {
                    console.error('Error deactivating course:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ msg: 'Course not found' });
                }

                res.json({ 
                    msg: 'Course deactivated successfully (has existing applications)',
                    soft_delete: true
                });
            });
        } else {
            // Hard delete if no applications
            const deleteQuery = 'DELETE FROM courses WHERE id = ?';
            db.query(deleteQuery, [id], (err, result) => {
                if (err) {
                    console.error('Error deleting course:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ msg: 'Course not found' });
                }

                res.json({ 
                    msg: 'Course deleted successfully',
                    soft_delete: false
                });
            });
        }
    });
});

// Admin: Get course statistics
router.get('/admin/courses/stats', verifyAdmin, (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total_courses,
            COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_courses,
            COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_courses,
            COUNT(DISTINCT category_id) as categories_used,
            AVG(fee) as average_fee,
            SUM(max_students) as total_capacity
        FROM courses
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching course stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        const stats = {
            ...results[0],
            total_courses: parseInt(results[0].total_courses) || 0,
            active_courses: parseInt(results[0].active_courses) || 0,
            inactive_courses: parseInt(results[0].inactive_courses) || 0,
            categories_used: parseInt(results[0].categories_used) || 0,
            average_fee: parseFloat(results[0].average_fee) || 0,
            total_capacity: parseInt(results[0].total_capacity) || 0
        };

        res.json({ stats });
    });
});

// ============ ADMIN APPLICATION MANAGEMENT ROUTES ============

// Admin: Get all student applications
router.get('/admin/applications', verifyAdmin, (req, res) => {
    const { status, course_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT sa.*, u.name as student_name, u.email as student_email,
               c.name as course_name, c.code as course_code,
               r.name as reviewer_name
        FROM student_applications sa
        JOIN users u ON sa.student_id = u.id
        JOIN courses c ON sa.course_id = c.id
        LEFT JOIN users r ON sa.reviewed_by = r.id
        WHERE 1 = 1
    `;

    const params = [];

    if (status) {
        query += ' AND sa.status = ?';
        params.push(status);
    }

    if (course_id) {
        query += ' AND sa.course_id = ?';
        params.push(course_id);
    }

    query += ' ORDER BY sa.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching applications:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        res.json({ applications: results });
    });
});

// Admin: Get application statistics
router.get('/admin/applications/stats', verifyAdmin, (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total_applications,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_applications,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications,
            COUNT(CASE WHEN status = 'waitlisted' THEN 1 END) as waitlisted_applications,
            COUNT(CASE WHEN reviewed_at IS NOT NULL THEN 1 END) as reviewed_applications
        FROM student_applications
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching application stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        const stats = {
            total_applications: parseInt(results[0].total_applications) || 0,
            pending_applications: parseInt(results[0].pending_applications) || 0,
            approved_applications: parseInt(results[0].approved_applications) || 0,
            rejected_applications: parseInt(results[0].rejected_applications) || 0,
            waitlisted_applications: parseInt(results[0].waitlisted_applications) || 0,
            reviewed_applications: parseInt(results[0].reviewed_applications) || 0
        };

        res.json({ stats });
    });
});

// Admin: Update application status
router.put('/admin/applications/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const reviewerId = req.user.id;

    if (!['pending', 'approved', 'rejected', 'waitlisted'].includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
    }

    const query = `
        UPDATE student_applications 
        SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(query, [status, admin_notes || null, reviewerId, id], (err, result) => {
        if (err) {
            console.error('Error updating application:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        res.json({ msg: 'Application status updated successfully' });
    });
});

// Get all doctor schedules (admin only)
router.get('/admin/doctors/:id/schedules', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    // First check if doctor exists
    const checkQuery = 'SELECT id FROM doctors WHERE user_id = ?';
    
    db.query(checkQuery, [id], (err, results) => {
        if (err) {
            console.error('Error checking doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const doctorDbId = results[0].id;
        
        // Get doctor's schedules
        const scheduleQuery = `
            SELECT ds.id, ds.day_of_week, ds.start_time, ds.end_time, ds.is_available
            FROM doctor_schedules ds
            WHERE ds.doctor_id = ?
            ORDER BY FIELD(ds.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
        `;
        
        db.query(scheduleQuery, [doctorDbId], (err, scheduleResults) => {
            if (err) {
                console.error('Error fetching doctor schedules:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ schedules: scheduleResults });
        });
    });
});

// Create doctor schedule (admin only)
router.post('/admin/doctors/:id/schedules', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, is_available } = req.body;
    
    // Validation
    if (!day_of_week || !start_time || !end_time) {
        return res.status(400).json({ msg: 'Day of week, start time, and end time are required' });
    }
    
    // Validate day of week
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(day_of_week.toLowerCase())) {
        return res.status(400).json({ msg: 'Invalid day of week' });
    }
    
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
        return res.status(400).json({ msg: 'Invalid time format. Use HH:MM format' });
    }
    
    // Check if start time is before end time
    if (start_time >= end_time) {
        return res.status(400).json({ msg: 'Start time must be before end time' });
    }
    
    // First get the doctor's ID from the doctors table
    db.query('SELECT id FROM doctors WHERE user_id = ?', [id], (err, doctorResults) => {
        if (err) {
            console.error('Error fetching doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (doctorResults.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const doctorDbId = doctorResults[0].id;
        
        // Check if schedule already exists for this day
        const checkScheduleQuery = 'SELECT id FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?';
        
        db.query(checkScheduleQuery, [doctorDbId, day_of_week.toLowerCase()], (err, scheduleResults) => {
            if (err) {
                console.error('Error checking existing schedule:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            if (scheduleResults.length > 0) {
                return res.status(400).json({ msg: 'Schedule already exists for this day' });
            }
            
            const scheduleData = {
                doctor_id: doctorDbId,
                day_of_week: day_of_week.toLowerCase(),
                start_time: start_time,
                end_time: end_time,
                is_available: is_available !== undefined ? is_available : true
            };
            
            db.query('INSERT INTO doctor_schedules SET ?', scheduleData, (err, result) => {
                if (err) {
                    console.error('Error creating schedule:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                res.json({ 
                    msg: 'Schedule created successfully',
                    schedule_id: result.insertId
                });
            });
        });
    });
});

// Update doctor schedule (admin only)
router.put('/admin/doctors/:id/schedules/:scheduleId', verifyAdmin, (req, res) => {
    const { id, scheduleId } = req.params;
    const { start_time, end_time, is_available } = req.body;
    
    // Validation
    if (start_time && end_time && start_time >= end_time) {
        return res.status(400).json({ msg: 'Start time must be before end time' });
    }
    
    // Validate time format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (start_time && !timeRegex.test(start_time)) {
        return res.status(400).json({ msg: 'Invalid start time format. Use HH:MM format' });
    }
    if (end_time && !timeRegex.test(end_time)) {
        return res.status(400).json({ msg: 'Invalid end time format. Use HH:MM format' });
    }
    
    // First get the doctor's ID from the doctors table
    db.query('SELECT id FROM doctors WHERE user_id = ?', [id], (err, doctorResults) => {
        if (err) {
            console.error('Error fetching doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (doctorResults.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const doctorDbId = doctorResults[0].id;
        
        // Update schedule
        const updateData = {};
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (is_available !== undefined) updateData.is_available = is_available;
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ msg: 'No fields to update' });
        }
        
        const updateQuery = 'UPDATE doctor_schedules SET ? WHERE id = ? AND doctor_id = ?';
        
        db.query(updateQuery, [updateData, scheduleId, doctorDbId], (err, result) => {
            if (err) {
                console.error('Error updating schedule:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ msg: 'Schedule not found' });
            }
            
            res.json({ msg: 'Schedule updated successfully' });
        });
    });
});

// Delete doctor schedule (admin only)
router.delete('/admin/doctors/:id/schedules/:scheduleId', verifyAdmin, (req, res) => {
    const { id, scheduleId } = req.params;
    
    // First get the doctor's ID from the doctors table
    db.query('SELECT id FROM doctors WHERE user_id = ?', [id], (err, doctorResults) => {
        if (err) {
            console.error('Error fetching doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (doctorResults.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const doctorDbId = doctorResults[0].id;
        
        // Delete schedule
        const deleteQuery = 'DELETE FROM doctor_schedules WHERE id = ? AND doctor_id = ?';
        
        db.query(deleteQuery, [scheduleId, doctorDbId], (err, result) => {
            if (err) {
                console.error('Error deleting schedule:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ msg: 'Schedule not found' });
            }
            
            res.json({ msg: 'Schedule deleted successfully' });
        });
    });
});

module.exports = router; 