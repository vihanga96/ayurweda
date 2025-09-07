const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ==================== USER MANAGEMENT ====================

// Get all users with pagination and filters
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get users
    const [users] = await db.execute(
      `SELECT id, name, email, phone, role, status, created_at, last_login 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user by ID with detailed information
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await db.execute(
      `SELECT u.*, 
              COUNT(DISTINCT a.id) as total_appointments,
              COUNT(DISTINCT o.id) as total_orders,
              COUNT(DISTINCT s.id) as total_student_records
       FROM users u
       LEFT JOIN appointments a ON u.id = a.patient_id
       LEFT JOIN orders o ON u.id = o.user_id
       LEFT JOIN student_applications s ON u.id = s.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user status (activate/deactivate)
router.patch('/users/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Change user role
router.patch('/users/:id/role', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['patient', 'student', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await db.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Delete user (soft delete)
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has active appointments or orders
    const [activeRecords] = await db.execute(
      `SELECT 
        (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'confirmed') as active_appointments,
        (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status IN ('pending', 'processing')) as active_orders`,
      [id, id]
    );

    if (activeRecords[0].active_appointments > 0 || activeRecords[0].active_orders > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with active appointments or orders' 
      });
    }

    await db.execute(
      'UPDATE users SET status = "deleted", deleted_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// ==================== APPOINTMENT ANALYTICS ====================

// Get appointment statistics
router.get('/analytics/appointments', verifyAdmin, async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE appointment_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (period === 'week') {
      dateFilter = 'WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Total appointments
    const [totalResult] = await db.execute(
      `SELECT COUNT(*) as total FROM appointments ${dateFilter}`,
      params
    );

    // Appointments by status
    const [statusResult] = await db.execute(
      `SELECT status, COUNT(*) as count 
       FROM appointments ${dateFilter}
       GROUP BY status`,
      params
    );

    // Appointments by doctor
    const [doctorResult] = await db.execute(
      `SELECT d.name as doctor_name, COUNT(a.id) as appointment_count
       FROM appointments a
       JOIN users d ON a.doctor_id = d.id
       ${dateFilter.replace('WHERE', 'AND')}
       GROUP BY a.doctor_id, d.name
       ORDER BY appointment_count DESC
       LIMIT 10`,
      params
    );

    // Daily appointment trends
    const [trendResult] = await db.execute(
      `SELECT DATE(appointment_date) as date, COUNT(*) as count
       FROM appointments ${dateFilter}
       GROUP BY DATE(appointment_date)
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    res.json({
      total: totalResult[0].total,
      byStatus: statusResult,
      byDoctor: doctorResult,
      trends: trendResult
    });
  } catch (error) {
    console.error('Error fetching appointment analytics:', error);
    res.status(500).json({ message: 'Error fetching appointment analytics' });
  }
});

// Get revenue analytics
router.get('/analytics/revenue', verifyAdmin, async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE o.created_at BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (period === 'week') {
      dateFilter = 'WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Total revenue
    const [revenueResult] = await db.execute(
      `SELECT SUM(o.total_amount) as total_revenue, COUNT(o.id) as total_orders
       FROM orders o ${dateFilter}`,
      params
    );

    // Revenue by category
    const [categoryResult] = await db.execute(
      `SELECT c.name as category, SUM(oi.quantity * oi.price) as revenue
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN medicines m ON oi.medicine_id = m.id
       JOIN categories c ON m.category_id = c.id
       ${dateFilter}
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`,
      params
    );

    // Daily revenue trends
    const [trendResult] = await db.execute(
      `SELECT DATE(o.created_at) as date, SUM(o.total_amount) as revenue
       FROM orders o ${dateFilter}
       GROUP BY DATE(o.created_at)
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    res.json({
      total: revenueResult[0],
      byCategory: categoryResult,
      trends: trendResult
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Error fetching revenue analytics' });
  }
});

// ==================== INVENTORY MANAGEMENT ====================

// Get inventory overview
router.get('/inventory/overview', verifyAdmin, async (req, res) => {
  try {
    // Total medicines
    const [totalResult] = await db.execute(
      'SELECT COUNT(*) as total_medicines FROM medicines'
    );

    // Low stock medicines
    const [lowStockResult] = await db.execute(
      `SELECT id, name, stock_quantity, reorder_level
       FROM medicines 
       WHERE stock_quantity <= reorder_level`
    );

    // Expiring medicines (within 30 days)
    const [expiringResult] = await db.execute(
      `SELECT id, name, expiry_date, stock_quantity
       FROM medicines 
       WHERE expiry_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
       AND stock_quantity > 0`
    );

    // Stock value
    const [valueResult] = await db.execute(
      'SELECT SUM(stock_quantity * price) as total_value FROM medicines'
    );

    res.json({
      total: totalResult[0].total_medicines,
      lowStock: lowStockResult,
      expiring: expiringResult,
      totalValue: valueResult[0].total_value
    });
  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    res.status(500).json({ message: 'Error fetching inventory overview' });
  }
});

// Update medicine stock
router.patch('/inventory/medicines/:id/stock', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity, reorder_level } = req.body;

    await db.execute(
      'UPDATE medicines SET stock_quantity = ?, reorder_level = ? WHERE id = ?',
      [stock_quantity, reorder_level, id]
    );

    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Error updating stock' });
  }
});

// ==================== STUDENT RECORD MANAGEMENT ====================

// Get all student applications
router.get('/students/applications', verifyAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE sa.status = ?';
      params.push(status);
    }

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM student_applications sa ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get applications
    const [applications] = await db.execute(
      `SELECT sa.*, u.name, u.email, u.phone
       FROM student_applications sa
       JOIN users u ON sa.user_id = u.id
       ${whereClause}
       ORDER BY sa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      applications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching student applications:', error);
    res.status(500).json({ message: 'Error fetching student applications' });
  }
});

// Update application status
router.patch('/students/applications/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!['pending', 'approved', 'rejected', 'waitlisted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.execute(
      'UPDATE student_applications SET status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?',
      [status, admin_notes, id]
    );

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Error updating application status' });
  }
});

// ==================== OPERATIONAL REPORTING ====================

// Get system health report
router.get('/reports/system-health', verifyAdmin, async (req, res) => {
  try {
    // User statistics
    const [userStats] = await db.execute(
      `SELECT 
        role,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
       FROM users 
       GROUP BY role`
    );

    // Database statistics
    const [dbStats] = await db.execute(
      `SELECT 
        (SELECT COUNT(*) FROM appointments) as total_appointments,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM medicines) as total_medicines,
        (SELECT COUNT(*) FROM student_applications) as total_applications`
    );

    // Recent activity
    const [recentActivity] = await db.execute(
      `SELECT 'appointment' as type, created_at, 'New appointment booked' as description
       FROM appointments 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       UNION ALL
       SELECT 'order' as type, created_at, 'New order placed' as description
       FROM orders 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       UNION ALL
       SELECT 'application' as type, created_at, 'New student application' as description
       FROM student_applications 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY created_at DESC
       LIMIT 20`
    );

    res.json({
      userStatistics: userStats,
      databaseStatistics: dbStats[0],
      recentActivity
    });
  } catch (error) {
    console.error('Error generating system health report:', error);
    res.status(500).json({ message: 'Error generating system health report' });
  }
});

// ==================== SYSTEM CONFIGURATION ====================

// Get system settings
router.get('/config/settings', verifyAdmin, async (req, res) => {
  try {
    // This would typically come from a configuration table
    // For now, returning default settings
    const settings = {
      appointment_booking_enabled: true,
      max_appointments_per_day: 50,
      medicine_ordering_enabled: true,
      student_applications_enabled: true,
      maintenance_mode: false,
      system_notifications: true,
      backup_frequency: 'daily',
      session_timeout: 3600
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Error fetching system settings' });
  }
});

// Update system settings
router.patch('/config/settings', verifyAdmin, async (req, res) => {
  try {
    const {
      appointment_booking_enabled,
      max_appointments_per_day,
      medicine_ordering_enabled,
      student_applications_enabled,
      maintenance_mode,
      system_notifications,
      backup_frequency,
      session_timeout
    } = req.body;

    // This would typically update a configuration table
    // For now, just returning success
    res.json({ 
      message: 'System settings updated successfully',
      settings: {
        appointment_booking_enabled,
        max_appointments_per_day,
        medicine_ordering_enabled,
        student_applications_enabled,
        maintenance_mode,
        system_notifications,
        backup_frequency,
        session_timeout
      }
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ message: 'Error updating system settings' });
  }
});

module.exports = router;
