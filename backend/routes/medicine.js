const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const jwt = require('jsonwebtoken');
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
    
    // Check if order belongs to patient and can be cancelled
    const checkQuery = `
        SELECT status FROM orders 
        WHERE id = ? AND patient_id = ? AND status IN ('pending', 'confirmed')
    `;
    
    db.query(checkQuery, [id, patientId], (err, results) => {
        if (err) {
            console.error('Error checking order:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Order not found or cannot be cancelled' });
        }
        
        // Update order status to cancelled
        db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', id], (err, result) => {
            if (err) {
                console.error('Error cancelling order:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ msg: 'Order cancelled successfully' });
        });
    });
});

// Admin: Get all orders
router.get('/admin/orders', verifyAdmin, (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT o.*, 
               u.name as patient_name, 
               u.email as patient_email,
               u.phone as patient_phone,
               COUNT(oi.id) as item_count,
               SUM(oi.quantity) as total_items
        FROM orders o
        JOIN users u ON o.patient_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const params = [];
    
    if (status) {
        query += ` WHERE o.status = ?`;
        params.push(status);
    }
    
    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching admin orders:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        // Get total count for pagination
        let countQuery = `SELECT COUNT(DISTINCT o.id) as total FROM orders o`;
        const countParams = [];
        
        if (status) {
            countQuery += ` WHERE o.status = ?`;
            countParams.push(status);
        }
        
        db.query(countQuery, countParams, (err, countResults) => {
            if (err) {
                console.error('Error counting orders:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            res.json({ 
                orders: results,
                total: countResults[0].total,
                page: parseInt(page),
                totalPages: Math.ceil(countResults[0].total / limit)
            });
        });
    });
});

// Admin: Get order statistics
router.get('/admin/orders/stats', verifyAdmin, (req, res) => {
    const statsQuery = `
        SELECT 
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
            SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_orders,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
            SUM(total_amount) as total_revenue,
            AVG(total_amount) as average_order_value
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    
    db.query(statsQuery, (err, results) => {
        if (err) {
            console.error('Error fetching order stats:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        const stats = results[0];
        // Convert string values to numbers
        if (stats) {
            stats.total_revenue = parseFloat(stats.total_revenue) || 0;
            stats.average_order_value = parseFloat(stats.average_order_value) || 0;
            stats.total_orders = parseInt(stats.total_orders) || 0;
            stats.pending_orders = parseInt(stats.pending_orders) || 0;
            stats.confirmed_orders = parseInt(stats.confirmed_orders) || 0;
            stats.processing_orders = parseInt(stats.processing_orders) || 0;
            stats.ready_orders = parseInt(stats.ready_orders) || 0;
            stats.delivered_orders = parseInt(stats.delivered_orders) || 0;
            stats.cancelled_orders = parseInt(stats.cancelled_orders) || 0;
        }
        
        res.json({ stats: stats });
    });
});

// Admin: Get single order details
router.get('/admin/orders/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    // Get order details
    const orderQuery = `
        SELECT o.*, 
               u.name as patient_name, 
               u.email as patient_email,
               u.phone as patient_phone,
               u.address as patient_address
        FROM orders o
        JOIN users u ON o.patient_id = u.id
        WHERE o.id = ?
    `;
    
    db.query(orderQuery, [id], (err, orderResults) => {
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
            SELECT oi.*, 
                   m.name as medicine_name, 
                   m.description, 
                   m.image_url, 
                   m.unit,
                   mc.name as category_name
            FROM order_items oi
            JOIN medicines m ON oi.medicine_id = m.id
            LEFT JOIN medicine_categories mc ON m.category_id = mc.id
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

// Admin: Update order status
router.put('/admin/orders/:id/status', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
    }
    
    // Update order status
    let updateQuery = 'UPDATE orders SET status = ?';
    const params = [status];
    
    if (notes) {
        updateQuery += ', notes = ?';
        params.push(notes);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    db.query(updateQuery, params, (err, result) => {
        if (err) {
            console.error('Error updating order status:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Order not found' });
        }
        
        res.json({ msg: 'Order status updated successfully' });
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

// Cart Routes

// Get user's cart items
router.get('/cart', verifyPatient, (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT 
            sc.id as cart_item_id,
            sc.medicine_id,
            sc.quantity,
            sc.added_at,
            m.name as medicine_name,
            m.description as medicine_description,
            m.price as unit_price,
            m.unit,
            m.image_url,
            m.is_prescription_required,
            mc.name as category_name,
            (m.price * sc.quantity) as total_price
        FROM shopping_cart sc
        JOIN medicines m ON sc.medicine_id = m.id
        LEFT JOIN medicine_categories mc ON m.category_id = mc.id
        WHERE sc.user_id = ? AND m.is_active = TRUE
        ORDER BY sc.added_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching cart items:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ cart_items: results });
    });
});

// Add item to cart
router.post('/cart', verifyPatient, (req, res) => {
    const userId = req.user.id;
    const { medicine_id, quantity = 1 } = req.body;
    
    if (!medicine_id) {
        return res.status(400).json({ msg: 'Medicine ID is required' });
    }
    
    // Check if medicine exists and is active
    db.query('SELECT id, name, price, is_active FROM medicines WHERE id = ? AND is_active = TRUE', 
        [medicine_id], (err, results) => {
        if (err) {
            console.error('Error checking medicine:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ msg: 'Medicine not found or not available' });
        }
        
        const medicine = results[0];
        
        // Check if item already exists in cart
        db.query('SELECT id, quantity FROM shopping_cart WHERE user_id = ? AND medicine_id = ?', 
            [userId, medicine_id], (err, cartResults) => {
            if (err) {
                console.error('Error checking cart:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            if (cartResults.length > 0) {
                // Update existing item quantity
                const newQuantity = cartResults[0].quantity + quantity;
                db.query('UPDATE shopping_cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                    [newQuantity, cartResults[0].id], (err, updateResult) => {
                    if (err) {
                        console.error('Error updating cart item:', err);
                        return res.status(500).json({ msg: 'Server error' });
                    }
                    res.json({ msg: 'Cart item updated successfully', quantity: newQuantity });
                });
            } else {
                // Add new item to cart
                db.query('INSERT INTO shopping_cart (user_id, medicine_id, quantity) VALUES (?, ?, ?)', 
                    [userId, medicine_id, quantity], (err, insertResult) => {
                    if (err) {
                        console.error('Error adding to cart:', err);
                        return res.status(500).json({ msg: 'Server error' });
                    }
                    res.json({ msg: 'Item added to cart successfully' });
                });
            }
        });
    });
});

// Update cart item quantity
router.put('/cart/:itemId', verifyPatient, (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (quantity <= 0) {
        // Remove item from cart
        db.query('DELETE FROM shopping_cart WHERE id = ? AND user_id = ?', 
            [itemId, userId], (err, result) => {
            if (err) {
                console.error('Error removing cart item:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            res.json({ msg: 'Item removed from cart' });
        });
    } else {
        // Update quantity
        db.query('UPDATE shopping_cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', 
            [quantity, itemId, userId], (err, result) => {
            if (err) {
                console.error('Error updating cart item:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ msg: 'Cart item not found' });
            }
            
            res.json({ msg: 'Cart item updated successfully' });
        });
    }
});

// Remove item from cart
router.delete('/cart/:itemId', verifyPatient, (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    db.query('DELETE FROM shopping_cart WHERE id = ? AND user_id = ?', 
        [itemId, userId], (err, result) => {
        if (err) {
            console.error('Error removing cart item:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Cart item not found' });
        }
        
        res.json({ msg: 'Item removed from cart successfully' });
    });
});

// Clear user's cart
router.delete('/cart', verifyPatient, (req, res) => {
    const userId = req.user.id;
    
    db.query('DELETE FROM shopping_cart WHERE user_id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error clearing cart:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ msg: 'Cart cleared successfully' });
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

// ============ ADMIN MEDICINE MANAGEMENT ROUTES ============

// Get all medicines for admin (including inactive)
router.get('/admin/medicines', verifyAdmin, (req, res) => {
    const { search, category, sort, status } = req.query;
    
    let query = `
        SELECT m.*, mc.name as category_name
        FROM medicines m
        LEFT JOIN medicine_categories mc ON m.category_id = mc.id
        WHERE 1=1
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
    
    if (status !== undefined) {
        query += ` AND m.is_active = ?`;
        params.push(status === 'active');
    }
    
    if (sort === 'price_low') {
        query += ` ORDER BY m.price ASC`;
    } else if (sort === 'price_high') {
        query += ` ORDER BY m.price DESC`;
    } else if (sort === 'name') {
        query += ` ORDER BY m.name ASC`;
    } else if (sort === 'created_date') {
        query += ` ORDER BY m.created_at DESC`;
    } else {
        query += ` ORDER BY m.created_at DESC`;
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching medicines for admin:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ medicines: results });
    });
});

// Create new medicine
router.post('/admin/medicines', verifyAdmin, (req, res) => {
    const {
        name, description, category_id, price, stock_quantity, unit,
        dosage_form, active_ingredients, therapeutic_effects, contraindications,
        side_effects, storage_instructions, expiry_date, manufacturer,
        is_prescription_required, image_url
    } = req.body;

    // Validation
    if (!name || !price || !category_id) {
        return res.status(400).json({ msg: 'Name, price, and category are required' });
    }
    
    // Validate expiry date format if provided
    if (expiry_date && expiry_date.trim() !== '') {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(expiry_date)) {
            return res.status(400).json({ msg: 'Expiry date must be in YYYY-MM-DD format' });
        }
        
        const date = new Date(expiry_date);
        if (isNaN(date.getTime())) {
            return res.status(400).json({ msg: 'Invalid expiry date' });
        }
    }
    
    // Validate image URL format if provided
    if (image_url && image_url.trim() !== '') {
        try {
            const url = new URL(image_url);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).json({ msg: 'Image URL must use HTTP or HTTPS protocol' });
            }
            // Check if it's a direct image URL (common extensions)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const pathname = url.pathname.toLowerCase();
            const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
            
            if (!hasImageExtension && url.hostname.includes('bing.com')) {
                return res.status(400).json({ msg: 'Please use a direct image URL, not a search result URL. Right-click on the image and copy the image address.' });
            }
        } catch (error) {
            return res.status(400).json({ msg: 'Invalid image URL format' });
        }
    }

    const medicineData = {
        name,
        description: description || null,
        category_id,
        price,
        stock_quantity: stock_quantity || 0,
        unit: unit || 'unit',
        dosage_form: dosage_form || null,
        active_ingredients: active_ingredients || null,
        therapeutic_effects: therapeutic_effects || null,
        contraindications: contraindications || null,
        side_effects: side_effects || null,
        storage_instructions: storage_instructions || null,
        expiry_date: expiry_date && expiry_date.trim() !== '' ? expiry_date : null,
        manufacturer: manufacturer || null,
        is_prescription_required: is_prescription_required || false,
        image_url: image_url || null,
        is_active: true
    };

    db.query('INSERT INTO medicines SET ?', medicineData, (err, result) => {
        if (err) {
            console.error('Error creating medicine:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ 
            msg: 'Medicine created successfully',
            medicine_id: result.insertId
        });
    });
});

// Update medicine
router.put('/admin/medicines/:id', verifyAdmin, (req, res) => {
    const medicineId = req.params.id;
    const {
        name, description, category_id, price, stock_quantity, unit,
        dosage_form, active_ingredients, therapeutic_effects, contraindications,
        side_effects, storage_instructions, expiry_date, manufacturer,
        is_prescription_required, is_active, image_url
    } = req.body;

    // Validate expiry date format if provided
    if (expiry_date !== undefined && expiry_date && expiry_date.trim() !== '') {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(expiry_date)) {
            return res.status(400).json({ msg: 'Expiry date must be in YYYY-MM-DD format' });
        }
        
        const date = new Date(expiry_date);
        if (isNaN(date.getTime())) {
            return res.status(400).json({ msg: 'Invalid expiry date' });
        }
    }
    
    // Validate image URL format if provided
    if (image_url !== undefined && image_url && image_url.trim() !== '') {
        try {
            const url = new URL(image_url);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).json({ msg: 'Image URL must use HTTP or HTTPS protocol' });
            }
            // Check if it's a direct image URL (common extensions)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const pathname = url.pathname.toLowerCase();
            const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
            
            if (!hasImageExtension && url.hostname.includes('bing.com')) {
                return res.status(400).json({ msg: 'Please use a direct image URL, not a search result URL. Right-click on the image and copy the image address.' });
            }
        } catch (error) {
            return res.status(400).json({ msg: 'Invalid image URL format' });
        }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (price !== undefined) updateData.price = price;
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (dosage_form !== undefined) updateData.dosage_form = dosage_form;
    if (active_ingredients !== undefined) updateData.active_ingredients = active_ingredients;
    if (therapeutic_effects !== undefined) updateData.therapeutic_effects = therapeutic_effects;
    if (contraindications !== undefined) updateData.contraindications = contraindications;
    if (side_effects !== undefined) updateData.side_effects = side_effects;
    if (storage_instructions !== undefined) updateData.storage_instructions = storage_instructions;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date && expiry_date.trim() !== '' ? expiry_date : null;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (is_prescription_required !== undefined) updateData.is_prescription_required = is_prescription_required;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (image_url !== undefined) updateData.image_url = image_url;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'No fields to update' });
    }

    db.query('UPDATE medicines SET ? WHERE id = ?', [updateData, medicineId], (err, result) => {
        if (err) {
            console.error('Error updating medicine:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        res.json({ msg: 'Medicine updated successfully' });
    });
});

// Delete medicine (soft delete)
router.delete('/admin/medicines/:id', verifyAdmin, (req, res) => {
    const medicineId = req.params.id;

    db.query('UPDATE medicines SET is_active = false WHERE id = ?', [medicineId], (err, result) => {
        if (err) {
            console.error('Error deleting medicine:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        res.json({ msg: 'Medicine deleted successfully' });
    });
});

// ============ ADMIN CATEGORY MANAGEMENT ROUTES ============

// Get all categories for admin (including inactive)
router.get('/admin/categories', verifyAdmin, (req, res) => {
    const query = `
        SELECT id, name, description, image_url, is_active, created_at, updated_at
        FROM medicine_categories 
        ORDER BY name
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching categories for admin:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ categories: results });
    });
});

// Create new category
router.post('/admin/categories', verifyAdmin, (req, res) => {
    const { name, description, image_url } = req.body;

    if (!name) {
        return res.status(400).json({ msg: 'Category name is required' });
    }

    const categoryData = {
        name,
        description: description || null,
        image_url: image_url || null,
        is_active: true
    };

    db.query('INSERT INTO medicine_categories SET ?', categoryData, (err, result) => {
        if (err) {
            console.error('Error creating category:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json({ 
            msg: 'Category created successfully',
            category_id: result.insertId
        });
    });
});

// Update category
router.put('/admin/categories/:id', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;
    const { name, description, image_url, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ msg: 'No fields to update' });
    }

    db.query('UPDATE medicine_categories SET ? WHERE id = ?', [updateData, categoryId], (err, result) => {
        if (err) {
            console.error('Error updating category:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Category not found' });
        }
        res.json({ msg: 'Category updated successfully' });
    });
});

// Delete category (soft delete)
router.delete('/admin/categories/:id', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;

    // Check if category has medicines
    db.query('SELECT COUNT(*) as count FROM medicines WHERE category_id = ? AND is_active = true', [categoryId], (err, results) => {
        if (err) {
            console.error('Error checking category medicines:', err);
            return res.status(500).json({ msg: 'Server error' });
        }

        if (results[0].count > 0) {
            return res.status(400).json({ msg: 'Cannot delete category with active medicines' });
        }

        db.query('UPDATE medicine_categories SET is_active = false WHERE id = ?', [categoryId], (err, result) => {
            if (err) {
                console.error('Error deleting category:', err);
                return res.status(500).json({ msg: 'Server error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ msg: 'Category not found' });
            }
            res.json({ msg: 'Category deleted successfully' });
        });
    });
});

module.exports = router; 