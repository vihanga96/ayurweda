const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to verify doctor token
const verifyDoctor = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (decoded.role !== 'doctor') {
            return res.status(403).json({ msg: 'Access denied. Doctor privileges required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Get doctor's profile
router.get('/profile', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    
    const query = `
        SELECT d.id, d.specialization, d.experience_years, d.consultation_fee, 
               d.bio, d.qualifications, d.is_available,
               u.name, u.email, u.phone, u.address
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.user_id = ?
    `;
    
    db.query(query, [doctorId], (err, results) => {
        if (err) {
            console.error('Error fetching doctor profile:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Doctor profile not found' });
        }
        
        res.json({ doctor: results[0] });
    });
});

// Update doctor's profile
router.put('/profile', verifyDoctor, (req, res) => {
    const doctorId = req.user.id;
    const { bio, qualifications, consultation_fee, is_available } = req.body;
    
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (consultation_fee !== undefined) updateData.consultation_fee = consultation_fee;
    if (is_available !== undefined) updateData.is_available = is_available;
    
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'No fields to update' });
    }
    
    const query = 'UPDATE doctors SET ? WHERE user_id = ?';
    
    db.query(query, [updateData, doctorId], (err, result) => {
        if (err) {
            console.error('Error updating doctor profile:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Doctor profile not found' });
        }
        
        res.json({ msg: 'Profile updated successfully' });
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
        SET ? 
        WHERE ds.id = ? AND d.user_id = ?
    `;
    
    db.query(query, [updateData, scheduleId, doctorId], (err, result) => {
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