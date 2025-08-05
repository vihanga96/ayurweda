const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to verify patient token
const verifyPatient = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        if (decoded.role !== 'patient') {
            return res.status(403).json({ msg: 'Access denied. Patient privileges required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Get all medicine categories
router.get('/categories', (req, res) => {
    const query = `
        SELECT id, name, description, image_url, is_active
        FROM medicine_categories 
        WHERE is_active = TRUE
        ORDER BY name
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ categories: results });
    });
});

// Get medicines by category
router.get('/categories/:categoryId/medicines', (req, res) => {
    const { categoryId } = req.params;
    const { search, sort } = req.query;
    
    let query = `
        SELECT m.*, mc.name as category_name
        FROM medicines m
        LEFT JOIN medicine_categories mc ON m.category_id = mc.id
        WHERE m.is_active = TRUE AND m.category_id = ?
    `;
    
    const params = [categoryId];
    
    if (search) {
        query += ` AND (m.name LIKE ? OR m.description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (sort === 'price_low') {
        query += ` ORDER BY m.price ASC`;
    } else if (sort === 'price_high') {
        query += ` ORDER BY m.price DESC`;
    } else {
        query += ` ORDER BY m.name ASC`;
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching medicines:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ medicines: results });
    });
});

// Get all medicines with search and filter
router.get('/medicines', (req, res) => {
    const { search, category, sort, prescription_required } = req.query;
    
    let query = `
        SELECT m.*, mc.name as category_name
        FROM medicines m
        LEFT JOIN medicine_categories mc ON m.category_id = mc.id
        WHERE m.is_active = TRUE
    `;
    
    const params = [];
    
    if (search) {
        query += ` AND (m.name LIKE ? OR m.description LIKE ? OR m.active_ingredients LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (category) {
        query += ` AND m.category_id = ?`;
        params.push(category);
    }
    
    if (prescription_required !== undefined) {
        query += ` AND m.is_prescription_required = ?`;
        params.push(prescription_required === 'true');
    }
    
    if (sort === 'price_low') {
        query += ` ORDER BY m.price ASC`;
    } else if (sort === 'price_high') {
        query += ` ORDER BY m.price DESC`;
    } else if (sort === 'name') {
        query += ` ORDER BY m.name ASC`;
    } else {
        query += ` ORDER BY m.name ASC`;
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching medicines:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ medicines: results });
    });
});

// Get medicine details by ID
router.get('/medicines/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT m.*, mc.name as category_name
        FROM medicines m
        LEFT JOIN medicine_categories mc ON m.category_id = mc.id
        WHERE m.id = ? AND m.is_active = TRUE
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching medicine:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        
        res.json({ medicine: results[0] });
    });
});

// Create new order
router.post('/orders', verifyPatient, (req, res) => {
    const patientId = req.user.id;
    const { items, delivery_address, delivery_instructions, notes } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ msg: 'Order must contain at least one item' });
    }
    
    // Generate order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Calculate total amount
    let totalAmount = 0;
    for (let item of items) {
        totalAmount += item.unit_price * item.quantity;
    }
    
    // Create order
    const orderData = {
        patient_id: patientId,
        order_number: orderNumber,
        total_amount: totalAmount,
        delivery_address: delivery_address || null,
        delivery_instructions: delivery_instructions || null,
        notes: notes || null
    };
    
    db.query('INSERT INTO orders SET ?', orderData, (err, result) => {
        if (err) {
            console.error('Error creating order:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        const orderId = result.insertId;
        
        // Insert order items
        const orderItems = items.map(item => ({
            order_id: orderId,
            medicine_id: item.medicine_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
            prescription_required: item.prescription_required || false
        }));
        
        db.query('INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, total_price, prescription_required) VALUES ?', 
            [orderItems.map(item => [item.order_id, item.medicine_id, item.quantity, item.unit_price, item.total_price, item.prescription_required])], 
            (err, result) => {
                if (err) {
                    console.error('Error creating order items:', err);
                    return res.status(500).json({ msg: 'Server error' });
                }
                
                res.json({ 
                    msg: 'Order created successfully',
                    order_id: orderId,
                    order_number: orderNumber
                });
            });
    });
});

// Get patient's orders
router.get('/orders', verifyPatient, (req, res) => {
    const patientId = req.user.id;
    const { status } = req.query;
    
    let query = `
        SELECT o.*, 
               COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.patient_id = ?
    `;
    
    const params = [patientId];
    
    if (status) {
        query += ` AND o.status = ?`;
        params.push(status);
    }
    
    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ orders: results });
    });
});

// Get order details
router.get('/orders/:id', verifyPatient, (req, res) => {
    const { id } = req.params;
    const patientId = req.user.id;
    
    // Get order details
    const orderQuery = `
        SELECT o.*, u.name as patient_name, u.email as patient_email
        FROM orders o
        JOIN users u ON o.patient_id = u.id
        WHERE o.id = ? AND o.patient_id = ?
    `;
    
    db.query(orderQuery, [id, patientId], (err, orderResults) => {
        if (err) {
            console.error('Error fetching order:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (orderResults.length === 0) {
            return res.status(404).json({ msg: 'Order not found' });
        }
        
        const order = orderResults[0];
        
        // Get order items
        const itemsQuery = `
            SELECT oi.*, m.name as medicine_name, m.description, m.image_url, m.unit
            FROM order_items oi
            JOIN medicines m ON oi.medicine_id = m.id
            WHERE oi.order_id = ?
        `;
        
        db.query(itemsQuery, [id], (err, itemResults) => {
            if (err) {
                console.error('Error fetching order items:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ 
                order: order,
                items: itemResults
            });
        });
    });
});

// Cancel order
router.put('/orders/:id/cancel', verifyPatient, (req, res) => {
    const { id } = req.params;
    const patientId = req.user.id;
    
    db.query('UPDATE orders SET status = "cancelled" WHERE id = ? AND patient_id = ?', 
        [id, patientId], (err, result) => {
        if (err) {
            console.error('Error cancelling order:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Order not found or cannot be cancelled' });
        }
        
        res.json({ msg: 'Order cancelled successfully' });
    });
});

// Get patient's prescriptions
router.get('/prescriptions', verifyPatient, (req, res) => {
    const patientId = req.user.id;
    
    const query = `
        SELECT p.*, u.name as doctor_name
        FROM prescriptions p
        LEFT JOIN users u ON p.doctor_id = u.id
        WHERE p.patient_id = ? AND p.is_active = TRUE
        ORDER BY p.prescription_date DESC
    `;
    
    db.query(query, [patientId], (err, results) => {
        if (err) {
            console.error('Error fetching prescriptions:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ prescriptions: results });
    });
});

// Get prescription details
router.get('/prescriptions/:id', verifyPatient, (req, res) => {
    const { id } = req.params;
    const patientId = req.user.id;
    
    const query = `
        SELECT p.*, u.name as doctor_name
        FROM prescriptions p
        LEFT JOIN users u ON p.doctor_id = u.id
        WHERE p.id = ? AND p.patient_id = ? AND p.is_active = TRUE
    `;
    
    db.query(query, [id, patientId], (err, results) => {
        if (err) {
            console.error('Error fetching prescription:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Prescription not found' });
        }
        
        res.json({ prescription: results[0] });
    });
});

module.exports = router; 