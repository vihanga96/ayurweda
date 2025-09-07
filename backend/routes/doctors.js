const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to verify doctor token
const verifyDoctor = async (req, res, next) => {
    console.log('=== VERIFY DOCTOR MIDDLEWARE ===');
    const token = req.header('x-auth-token');
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        console.log('Attempting to verify token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        console.log('Token decoded successfully:', decoded);
        
        if (decoded.role !== 'doctor') {
            console.log('User role is not doctor:', decoded.role);
            return res.status(403).json({ msg: 'Access denied. Doctor privileges required.' });
        }
        
        console.log('Token verification successful, user is doctor');
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Test route to check database (no auth required)
router.get('/test-db', (req, res) => {
    console.log('Testing database connection...');
    
    try {
        // Get all users with role 'doctor'
        db.query('SELECT id, name, email, role FROM users WHERE role = "doctor"', (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ msg: 'Server error', error: err.message });
            }
            
            console.log('All doctor users:', users);
            
            // Get all doctor records
            db.query('SELECT * FROM doctors', (err, doctors) => {
                if (err) {
                    console.error('Error fetching doctors:', err);
                    return res.status(500).json({ msg: 'Server error', error: err.message });
                }
                
                console.log('All doctor records:', doctors);
                
                res.json({ 
                    message: 'Database test successful',
                    allDoctorUsers: users,
                    allDoctorRecords: doctors
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error in test-db:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Test profile endpoint without auth
router.get('/test-profile/:userId', (req, res) => {
    const doctorId = req.params.userId;
    
    console.log('Testing profile for user ID:', doctorId);
    
    try {
        // Simple query to get user data
        const userQuery = 'SELECT id, name, email, phone, address, role FROM users WHERE id = ?';
        
        db.query(userQuery, [doctorId], (err, userResults) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ msg: 'Server error', error: err.message });
            }
            
            if (userResults.length === 0) {
                console.log('No user found for ID:', doctorId);
                return res.status(404).json({ msg: 'User not found' });
            }
            
            const user = userResults[0];
            console.log('Found user:', user);
            
            // Simple query to get doctor data
            const doctorQuery = 'SELECT id, specialization, experience_years, consultation_fee, is_available FROM doctors WHERE user_id = ?';
            
            db.query(doctorQuery, [doctorId], (err, doctorResults) => {
                if (err) {
                    console.error('Error fetching doctor details:', err);
                    return res.status(500).json({ msg: 'Server error', error: err.message });
                }
                
                console.log('Doctor results:', doctorResults);
                console.log('Number of doctor records found:', doctorResults.length);
                
                // Combine user and doctor data with fallbacks
                const doctorData = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    address: user.address || '',
                    role: user.role,
                    specialization: doctorResults[0]?.specialization || 'Not specified',
                    experience_years: doctorResults[0]?.experience_years || 0,
                    consultation_fee: doctorResults[0]?.consultation_fee || 0,
                    bio: '', // bio column doesn't exist in current schema
                    qualifications: '', // qualifications column doesn't exist in current schema
                    is_available: doctorResults[0]?.is_available !== undefined ? doctorResults[0].is_available : true
                };
                
                console.log('Returning doctor data:', doctorData);
                res.json({ doctor: doctorData });
            });
        });
    } catch (error) {
        console.error('Unexpected error in test-profile:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Debug route to check all doctors
router.get('/debug', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    
    console.log('Current user ID:', doctorId);
    
    // Get all users with role 'doctor'
    db.query('SELECT id, name, email, role FROM users WHERE role = "doctor"', (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        console.log('All doctor users:', users);
        
        // Get all doctor records
        db.query('SELECT * FROM doctors', (err, doctors) => {
            if (err) {
                console.error('Error fetching doctors:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            console.log('All doctor records:', doctors);
            
            // Check if current user has a doctor record
            const currentUserDoctor = doctors.find(d => d.user_id === doctorId);
            console.log('Current user doctor record:', currentUserDoctor);
            
            res.json({ 
                currentUserId: doctorId,
                allDoctorUsers: users,
                allDoctorRecords: doctors,
                currentUserDoctorRecord: currentUserDoctor
            });
        });
    });
});

// Get doctor's profile
router.get('/profile', verifyDoctor, (req, res) => {
    console.log('=== PROFILE ENDPOINT CALLED ===');
    console.log('Request headers:', req.headers);
    console.log('User from token:', req.user);
    
    const doctorId = req.user.id;
    console.log('Fetching profile for doctor ID:', doctorId);
    
    // Simple query to get user data
    const userQuery = 'SELECT id, name, email, phone, address, role FROM users WHERE id = ?';
    
    db.query(userQuery, [doctorId], (err, userResults) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ msg: 'Server error', error: err.message });
        }
        
        console.log('User query results:', userResults);
        
        if (userResults.length === 0) {
            console.log('No user found for ID:', doctorId);
            return res.status(404).json({ msg: 'User not found' });
        }
        
        const user = userResults[0];
        console.log('Found user:', user);
        
        // Simple query to get doctor data
        const doctorQuery = 'SELECT id, specialization, experience_years, consultation_fee, is_available FROM doctors WHERE user_id = ?';
        
        db.query(doctorQuery, [doctorId], (err, doctorResults) => {
            if (err) {
                console.error('Error fetching doctor details:', err);
                return res.status(500).json({ msg: 'Server error', error: err.message });
            }
            
            console.log('Doctor query results:', doctorResults);
            console.log('Number of doctor records found:', doctorResults.length);
            
            // Combine user and doctor data with fallbacks
            const doctorData = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                address: user.address || '',
                role: user.role,
                specialization: doctorResults[0]?.specialization || 'Not specified',
                experience_years: doctorResults[0]?.experience_years || 0,
                consultation_fee: doctorResults[0]?.consultation_fee || 0,
                bio: '', // bio column doesn't exist in current schema
                qualifications: '', // qualifications column doesn't exist in current schema
                is_available: doctorResults[0]?.is_available !== undefined ? doctorResults[0].is_available : true
            };
            
            console.log('Returning doctor data:', doctorData);
            res.json({ doctor: doctorData });
        });
    });
});

// Update doctor's profile
router.put('/profile', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    const { name, email, phone, address, consultation_fee, is_available } = req.body;
    
    // Start a transaction
    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        try {
            // Update user information
            const userUpdateData = {};
            if (name !== undefined) userUpdateData.name = name;
            if (email !== undefined) userUpdateData.email = email;
            if (phone !== undefined) userUpdateData.phone = phone;
            if (address !== undefined) userUpdateData.address = address;

            if (Object.keys(userUpdateData).length > 0) {
                await new Promise((resolve, reject) => {
                    db.query('UPDATE users SET ? WHERE id = ?', [userUpdateData, doctorId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
            }

            // Check if doctor record exists, if not create it
            const checkDoctorQuery = 'SELECT id FROM doctors WHERE user_id = ?';
            const doctorExists = await new Promise((resolve, reject) => {
                db.query(checkDoctorQuery, [doctorId], (err, results) => {
                    if (err) reject(err);
                    else resolve(results.length > 0);
                });
            });

            if (!doctorExists) {
                // Create doctor record if it doesn't exist
                const createDoctorData = {
                    user_id: doctorId,
                    specialization: 'General Medicine',
                    experience_years: 0,
                    consultation_fee: 1000,
                    is_available: true
                };
                
                await new Promise((resolve, reject) => {
                    db.query('INSERT INTO doctors SET ?', [createDoctorData], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
            }

            // Update doctor-specific information
            const doctorUpdateData = {};
            if (consultation_fee !== undefined) doctorUpdateData.consultation_fee = consultation_fee;
            if (is_available !== undefined) doctorUpdateData.is_available = is_available;

            if (Object.keys(doctorUpdateData).length > 0) {
                await new Promise((resolve, reject) => {
                    db.query('UPDATE doctors SET ? WHERE user_id = ?', [doctorUpdateData, doctorId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
            }

            // Commit transaction
            db.commit((err) => {
                if (err) {
                    console.error('Error committing transaction:', err);
                    return db.rollback(() => {
                        res.status(500).json({ msg: 'Server error' });
                    });
                }
                res.json({ msg: 'Profile updated successfully' });
            });

        } catch (error) {
            console.error('Error updating doctor profile:', error);
            db.rollback(() => {
                res.status(500).json({ msg: 'Server error' });
            });
        }
    });
});

// Get doctor's schedule
router.get('/schedule', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    
    const query = `
        SELECT ds.id, ds.day_of_week, ds.start_time, ds.end_time, ds.is_available
        FROM doctor_schedules ds
        JOIN doctors d ON ds.doctor_id = d.id
        WHERE d.user_id = ?
        ORDER BY FIELD(ds.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    `;
    
    db.query(query, [doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching doctor schedule:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ schedule: results });
    });
});

// Create doctor's schedule entry
router.post('/schedule', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    const { day_of_week, start_time, end_time, is_available } = req.body;
    
    // First get the doctor's ID from the doctors table
    db.query('SELECT id FROM doctors WHERE user_id = ?', [doctorId], (err, doctorResults) => {
        if (err) {
            console.error('Error fetching doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (doctorResults.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const doctorDbId = doctorResults[0].id;
        
        const scheduleData = {
            doctor_id: doctorDbId,
            day_of_week,
            start_time: start_time || '09:00',
            end_time: end_time || '17:00',
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

// Update doctor's schedule
router.put('/schedule/:id', verifyDoctor, (req, res) => {
    const scheduleId = req.params.id;
    const doctorId = req.user.id;
    const { start_time, end_time, is_available } = req.body;
    
    const updateData = {};
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (is_available !== undefined) updateData.is_available = is_available;
    
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'No fields to update' });
    }
    
    const query = `
        UPDATE doctor_schedules ds
        JOIN doctors d ON ds.doctor_id = d.id
        SET ds.is_available = ?, ds.start_time = ?, ds.end_time = ?
        WHERE ds.id = ? AND d.user_id = ?
    `;
    
    const isAvailable = updateData.is_available !== undefined ? updateData.is_available : null;
    const startTime = updateData.start_time || null;
    const endTime = updateData.end_time || null;
    
    db.query(query, [isAvailable, startTime, endTime, scheduleId, doctorId], (err, result) => {
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

// Get doctor's appointments
router.get('/appointments', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    const { status, date } = req.query;
    
    let query = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.consultation_type, 
               a.status, a.symptoms, a.notes, a.created_at,
               u.name as patient_name, u.email as patient_email, 
               COALESCE(u.phone, '') as patient_phone
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
    `;
    
    const params = [doctorId];
    
    if (status) {
        query += ' AND a.status = ?';
        params.push(status);
    }
    
    if (date) {
        query += ' AND a.appointment_date = ?';
        params.push(date);
    }
    
    query += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching appointments:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ appointments: results });
    });
});

// Get single appointment
router.get('/appointments/:id', verifyDoctor, (req, res) => {
    const appointmentId = req.params.id;
    const doctorId = req.user.id;
    
    const query = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.consultation_type, 
               a.status, a.symptoms, a.notes, a.created_at,
               u.name as patient_name, u.email as patient_email, 
               COALESCE(u.phone, '') as patient_phone
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.id = ? AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
    `;
    
    db.query(query, [appointmentId, doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching appointment:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }
        
        res.json({ appointment: results[0] });
    });
});

// Update appointment status
router.put('/appointments/:id/status', verifyDoctor, (req, res) => {
    const appointmentId = req.params.id;
    const doctorId = req.user.id;
    const { status, notes } = req.body;
    
    const validStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const updateData = { status };
    if (notes) updateData.notes = notes;
    
    const query = `
        UPDATE appointments 
        SET ? 
        WHERE id = ? AND doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
    `;
    
    db.query(query, [updateData, appointmentId, doctorId], (err, result) => {
        if (err) {
            console.error('Error updating appointment:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }
        
        res.json({ msg: 'Appointment status updated successfully' });
    });
});

// Add consultation notes
router.post('/appointments/:id/notes', verifyDoctor, (req, res) => {
    const appointmentId = req.params.id;
    const doctorId = req.user.id;
    const { diagnosis, prescription, treatment_plan, follow_up_date, notes } = req.body;
    
    // Check if appointment exists and belongs to this doctor
    const checkQuery = `
        SELECT id FROM appointments 
        WHERE id = ? AND doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
    `;
    
    db.query(checkQuery, [appointmentId, doctorId], (err, results) => {
        if (err) {
            console.error('Error checking appointment:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }
        
        // Check if consultation notes already exist
        db.query('SELECT id FROM consultation_notes WHERE appointment_id = ?', [appointmentId], (err, noteResults) => {
            if (err) {
                console.error('Error checking consultation notes:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            const noteData = {
                appointment_id: appointmentId,
                diagnosis,
                prescription,
                treatment_plan,
                follow_up_date,
                notes
            };
            
            if (noteResults.length > 0) {
                // Update existing notes
                db.query('UPDATE consultation_notes SET ? WHERE appointment_id = ?', [noteData, appointmentId], (err, result) => {
                    if (err) {
                        console.error('Error updating consultation notes:', err);
                        return res.status(500).json({ msg: 'Server error' });
                    }
                    res.json({ msg: 'Consultation notes updated successfully' });
                });
            } else {
                // Create new notes
                db.query('INSERT INTO consultation_notes SET ?', [noteData], (err, result) => {
                    if (err) {
                        console.error('Error creating consultation notes:', err);
                        return res.status(500).json({ msg: 'Server error' });
                    }
                    res.json({ msg: 'Consultation notes added successfully' });
                });
            }
        });
    });
});

// Get consultation notes
router.get('/appointments/:id/notes', verifyDoctor, (req, res) => {
    const appointmentId = req.params.id;
    const doctorId = req.user.id;
    
    const query = `
        SELECT cn.* FROM consultation_notes cn
        JOIN appointments a ON cn.appointment_id = a.id
        WHERE cn.appointment_id = ? AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
    `;
    
    db.query(query, [appointmentId, doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching consultation notes:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ notes: results[0] || null });
    });
});

// Get patients for the logged-in doctor
router.get('/patients', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    
    const query = `
        SELECT DISTINCT 
            u.id as patient_id,
            u.name as patient_name,
            u.email as patient_email,
            u.phone as patient_phone,
            COUNT(a.id) as total_appointments,
            MAX(a.appointment_date) as last_appointment_date,
            MAX(a.created_at) as last_interaction
        FROM users u
        JOIN appointments a ON u.id = a.patient_id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE d.user_id = ? AND u.role = 'patient'
        GROUP BY u.id, u.name, u.email, u.phone
        ORDER BY last_interaction DESC
    `;
    
    db.query(query, [doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching patients:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ patients: results });
    });
});

// Get patient history
router.get('/patients/:patientId/history', verifyDoctor, (req, res) => {
    const patientId = req.params.patientId;
    const doctorId = req.user.id;
    
    const query = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.symptoms,
               cn.diagnosis, cn.prescription, cn.treatment_plan, cn.follow_up_date, cn.notes
        FROM appointments a
        LEFT JOIN consultation_notes cn ON a.id = cn.appointment_id
        WHERE a.patient_id = ? AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;
    
    db.query(query, [patientId, doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching patient history:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ history: results });
    });
});

// Get doctor's dashboard statistics
router.get('/dashboard/stats', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    
    const statsQuery = `
        SELECT 
            COUNT(*) as total_appointments,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_appointments,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_appointments,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
            SUM(CASE WHEN appointment_date = CURDATE() THEN 1 ELSE 0 END) as today_appointments
        FROM appointments 
        WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
    `;
    
    db.query(statsQuery, [doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching doctor stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ stats: results[0] });
    });
});

module.exports = router; 