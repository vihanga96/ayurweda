const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to verify student token
const verifyStudent = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (decoded.role !== 'student') {
            return res.status(403).json({ msg: 'Access denied. Student privileges required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Get student application status
router.get('/application-status', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    
    const query = `
        SELECT sa.*, c.name as course_name, c.description as course_description
        FROM student_applications sa
        LEFT JOIN courses c ON sa.course_id = c.id
        WHERE sa.student_id = ?
        ORDER BY sa.created_at DESC
    `;
    
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching application status:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ applications: results });
    });
});

// Submit new student application
router.post('/applications', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    const { course_id, personal_statement, previous_education, references } = req.body;
    
    if (!course_id || !personal_statement) {
        return res.status(400).json({ msg: 'Course ID and personal statement are required' });
    }
    
    const applicationData = {
        student_id: studentId,
        course_id: course_id,
        personal_statement: personal_statement,
        previous_education: previous_education || null,
        student_references: references || null,
        status: 'pending'
    };
    
    db.query('INSERT INTO student_applications SET ?', applicationData, (err, result) => {
        if (err) {
            console.error('Error creating application:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ 
            msg: 'Application submitted successfully',
            application_id: result.insertId
        });
    });
});

// Get available courses
router.get('/courses', (req, res) => {
    const { search, category, level } = req.query;
    
    let query = `
        SELECT c.*, cc.name as category_name, COUNT(sa.id) as application_count
        FROM courses c
        LEFT JOIN course_categories cc ON c.category_id = cc.id
        LEFT JOIN student_applications sa ON c.id = sa.course_id
        WHERE c.is_active = TRUE
    `;
    
    const params = [];
    
    if (search) {
        query += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (category) {
        query += ` AND c.category_id = ?`;
        params.push(category);
    }
    
    if (level) {
        query += ` AND c.level = ?`;
        params.push(level);
    }
    
    query += ` GROUP BY c.id ORDER BY c.name ASC`;
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ courses: results });
    });
});

// Get course categories for students
router.get('/course-categories', (req, res) => {
    const query = `
        SELECT * FROM course_categories 
        WHERE is_active = TRUE 
        ORDER BY name ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching course categories:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ categories: results });
    });
});

// Check if student has already applied to a course
router.get('/check-application/:courseId', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    const { courseId } = req.params;
    
    const query = `
        SELECT * FROM student_applications 
        WHERE student_id = ? AND course_id = ?
    `;
    
    db.query(query, [studentId, courseId], (err, results) => {
        if (err) {
            console.error('Error checking application:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ 
            hasApplied: results.length > 0,
            application: results[0] || null
        });
    });
});

// Get course details
router.get('/courses/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT c.*, cc.name as category_name
        FROM courses c
        LEFT JOIN course_categories cc ON c.category_id = cc.id
        WHERE c.id = ? AND c.is_active = TRUE
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching course:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        res.json({ course: results[0] });
    });
});

// Get student's academic records
router.get('/academic-records', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    
    const query = `
        SELECT ar.*, c.name as course_name, c.code as course_code
        FROM academic_records ar
        LEFT JOIN courses c ON ar.course_id = c.id
        WHERE ar.student_id = ?
        ORDER BY ar.semester_year DESC, ar.semester_number DESC
    `;
    
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching academic records:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ records: results });
    });
});

// Get faculty members
router.get('/faculty', (req, res) => {
    const { department, specialization } = req.query;
    
    let query = `
        SELECT f.*, u.name, u.email, u.profile_picture
        FROM faculty f
        JOIN users u ON f.user_id = u.id
        WHERE f.is_active = TRUE
    `;
    
    const params = [];
    
    if (department) {
        query += ` AND f.department = ?`;
        params.push(department);
    }
    
    if (specialization) {
        query += ` AND f.specialization LIKE ?`;
        params.push(`%${specialization}%`);
    }
    
    query += ` ORDER BY u.name ASC`;
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching faculty:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ faculty: results });
    });
});

// Send message to faculty
router.post('/messages', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    const { receiver_id, subject, message } = req.body;
    
    if (!receiver_id || !subject || !message) {
        return res.status(400).json({ msg: 'Receiver ID, subject, and message are required' });
    }
    
    const messageData = {
        sender_id: studentId,
        receiver_id: receiver_id,
        subject: subject,
        message: message,
        message_type: 'student_faculty'
    };
    
    db.query('INSERT INTO messages SET ?', messageData, (err, result) => {
        if (err) {
            console.error('Error sending message:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        res.json({ 
            msg: 'Message sent successfully',
            message_id: result.insertId
        });
    });
});

// Get student's messages
router.get('/messages', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    const { type } = req.query; // 'sent' or 'received'
    
    let query = '';
    const params = [studentId];
    
    if (type === 'sent') {
        query = `
            SELECT m.*, u.name as receiver_name, u.email as receiver_email
            FROM messages m
            JOIN users u ON m.receiver_id = u.id
            WHERE m.sender_id = ? AND m.message_type = 'student_faculty'
            ORDER BY m.created_at DESC
        `;
    } else {
        query = `
            SELECT m.*, u.name as sender_name, u.email as sender_email
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.receiver_id = ? AND m.message_type = 'student_faculty'
            ORDER BY m.created_at DESC
        `;
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ messages: results });
    });
});

// Get institutional updates/announcements
router.get('/announcements', (req, res) => {
    const { category, limit } = req.query;
    
    let query = `
        SELECT a.*, c.name as category_name
        FROM announcements a
        LEFT JOIN announcement_categories c ON a.category_id = c.id
        WHERE a.is_active = TRUE
    `;
    
    const params = [];
    
    if (category) {
        query += ` AND a.category_id = ?`;
        params.push(category);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    if (limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(limit));
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching announcements:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ announcements: results });
    });
});

// Get student dashboard statistics
router.get('/dashboard-stats', verifyStudent, (req, res) => {
    const studentId = req.user.id;
    
    // Get application count
    const applicationQuery = `
        SELECT COUNT(*) as total_applications,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
               SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_applications
        FROM student_applications
        WHERE student_id = ?
    `;
    
    // Get academic records count
    const academicQuery = `
        SELECT COUNT(*) as total_records,
               AVG(gpa) as average_gpa
        FROM academic_records
        WHERE student_id = ?
    `;
    
    // Get unread messages count
    const messagesQuery = `
        SELECT COUNT(*) as unread_messages
        FROM messages
        WHERE receiver_id = ? AND is_read = FALSE AND message_type = 'student_faculty'
    `;
    
    db.query(applicationQuery, [studentId], (err, appResults) => {
        if (err) {
            console.error('Error fetching application stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        db.query(academicQuery, [studentId], (err, academicResults) => {
            if (err) {
                console.error('Error fetching academic stats:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            db.query(messagesQuery, [studentId], (err, messageResults) => {
                if (err) {
                    console.error('Error fetching message stats:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                res.json({
                    applications: appResults[0],
                    academic: academicResults[0],
                    messages: messageResults[0]
                });
            });
        });
    });
});

module.exports = router; 