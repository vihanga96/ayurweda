const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to verify token
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

// Get all available doctors
router.get('/doctors', verifyToken, (req, res) => {
    const query = `
        SELECT d.id, d.specialization, d.experience_years, d.consultation_fee, 
               u.name, u.email, d.is_available
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_available = true
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

// Get doctor by ID with schedule
router.get('/doctors/:id', verifyToken, (req, res) => {
    const doctorId = req.params.id;
    
    const doctorQuery = `
        SELECT d.id, d.specialization, d.experience_years, d.consultation_fee, 
               u.name, u.email, d.is_available
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
    `;
    
    const scheduleQuery = `
        SELECT day_of_week, start_time, end_time, is_available
        FROM doctor_schedules
        WHERE doctor_id = ? AND is_available = true
        ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    `;
    
    db.query(doctorQuery, [doctorId], (err, doctorResults) => {
        if (err) {
            console.error('Error fetching doctor:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (doctorResults.length === 0) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        db.query(scheduleQuery, [doctorId], (err, scheduleResults) => {
            if (err) {
                console.error('Error fetching schedule:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({
                doctor: doctorResults[0],
                schedule: scheduleResults
            });
        });
    });
});

// Get available time slots for a doctor on a specific date
router.get('/doctors/:id/available-slots', verifyToken, (req, res) => {
    console.log('Available slots endpoint hit!');
    const doctorId = req.params.id;
    const requestedDate = req.query.date;
    
    console.log('Available slots request:', { doctorId, requestedDate });
    
    if (!requestedDate) {
        return res.status(400).json({ msg: 'Date is required' });
    }
    
    // Get day of week
    const dayOfWeek = new Date(requestedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    console.log('Day of week:', dayOfWeek);
    
    // Get doctor's schedule for that day
    const scheduleQuery = `
        SELECT start_time, end_time
        FROM doctor_schedules
        WHERE doctor_id = ? AND day_of_week = ? AND is_available = true
    `;
    
    console.log('Schedule query params:', [doctorId, dayOfWeek]);
    
    db.query(scheduleQuery, [doctorId, dayOfWeek], (err, scheduleResults) => {
        if (err) {
            console.error('Error fetching schedule:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        console.log('Schedule results:', scheduleResults);
        
        if (scheduleResults.length === 0) {
            console.log('No schedule found for this day');
            return res.json({ availableSlots: [] });
        }
        
        // Get existing appointments for that date
        const appointmentsQuery = `
            SELECT appointment_time
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'
        `;
        
        db.query(appointmentsQuery, [doctorId, requestedDate], (err, appointmentResults) => {
            if (err) {
                console.error('Error fetching appointments:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            console.log('Appointment results:', appointmentResults);
            
            const bookedTimes = appointmentResults.map(apt => apt.appointment_time);
            const schedule = scheduleResults[0];
            
            // Generate 30-minute slots
            const slots = [];
            const startTime = new Date(`2000-01-01 ${schedule.start_time}`);
            const endTime = new Date(`2000-01-01 ${schedule.end_time}`);
            
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
                const timeString = currentTime.toTimeString().slice(0, 5);
                if (!bookedTimes.includes(timeString)) {
                    slots.push(timeString);
                }
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
            
            console.log('Generated slots:', slots);
            res.json({ availableSlots: slots });
        });
    });
});

// Book an appointment
router.post('/book', verifyToken, (req, res) => {
    const { doctorId, appointmentDate, appointmentTime, consultationType, symptoms } = req.body;
    const patientId = req.user.id;
    
    // Validation
    if (!doctorId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ msg: 'Please provide all required fields' });
    }
    
    // Check if slot is available
    const checkSlotQuery = `
        SELECT id FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'
    `;
    
    db.query(checkSlotQuery, [doctorId, appointmentDate, appointmentTime], (err, results) => {
        if (err) {
            console.error('Error checking slot availability:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ msg: 'This time slot is already booked' });
        }
        
        // Create appointment
        const appointmentData = {
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            consultation_type: consultationType || 'in-person',
            symptoms: symptoms || '',
            status: 'pending'
        };
        
        db.query('INSERT INTO appointments SET ?', appointmentData, (err, result) => {
            if (err) {
                console.error('Error creating appointment:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ 
                msg: 'Appointment booked successfully',
                appointmentId: result.insertId
            });
        });
    });
});

// Get patient's appointments
router.get('/my-appointments', verifyToken, (req, res) => {
    const patientId = req.user.id;
    
    const query = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.consultation_type, 
               a.status, a.symptoms, a.notes, a.created_at,
               d.specialization, u.name as doctor_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;
    
    db.query(query, [patientId], (err, results) => {
        if (err) {
            console.error('Error fetching appointments:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ appointments: results });
    });
});

// Cancel appointment
router.put('/appointments/:id/cancel', verifyToken, (req, res) => {
    const appointmentId = req.params.id;
    const patientId = req.user.id;
    
    const query = `
        UPDATE appointments 
        SET status = 'cancelled' 
        WHERE id = ? AND patient_id = ? AND status = 'pending'
    `;
    
    db.query(query, [appointmentId, patientId], (err, result) => {
        if (err) {
            console.error('Error cancelling appointment:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ msg: 'Appointment not found or cannot be cancelled' });
        }
        
        res.json({ msg: 'Appointment cancelled successfully' });
    });
});

// Get doctor's appointments (for doctors)
router.get('/doctor/appointments', verifyToken, (req, res) => {
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ msg: 'Access denied. Doctor privileges required.' });
    }
    
    const query = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.consultation_type, 
               a.status, a.symptoms, a.notes, a.created_at,
               u.name as patient_name, u.email as patient_email
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = (SELECT id FROM doctors WHERE user_id = ?)
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `;
    
    db.query(query, [req.user.id], (err, results) => {
        if (err) {
            console.error('Error fetching doctor appointments:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ appointments: results });
    });
});

// Update appointment status (for doctors)
router.put('/appointments/:id/status', verifyToken, (req, res) => {
    const { status, notes } = req.body;
    const appointmentId = req.params.id;
    
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ msg: 'Access denied. Doctor privileges required.' });
    }
    
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
    
    db.query(query, [updateData, appointmentId, req.user.id], (err, result) => {
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

module.exports = router; 