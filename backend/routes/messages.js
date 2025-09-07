const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware to verify authentication
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ==================== MESSAGING SYSTEM ====================

// Get conversations for a user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [conversations] = await db.execute(
      `SELECT DISTINCT 
        c.id,
        c.title,
        c.type,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = 0 AND m.sender_id != ?) as unread_count,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = ?
       ORDER BY c.updated_at DESC`,
      [userId, userId]
    );

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify user is participant in conversation
    const [participants] = await db.execute(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [id, userId]
    );

    if (participants.length === 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Get messages with sender information
    const [messages] = await db.execute(
      `SELECT m.*, u.name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );

    // Mark messages as read
    await db.execute(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
      [id, userId]
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, message_type = 'text' } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify user is participant in conversation
    const [participants] = await db.execute(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [id, userId]
    );

    if (participants.length === 0) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Insert message
    const [result] = await db.execute(
      'INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, userId, content.trim(), message_type]
    );

    // Update conversation timestamp
    await db.execute(
      'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
      [id]
    );

    // Get the created message with sender info
    const [messages] = await db.execute(
      `SELECT m.*, u.name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json(messages[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Create a new conversation
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { title, type = 'private', participant_ids } = req.body;
    const userId = req.user.id;
    
    if (!title || !participant_ids || participant_ids.length === 0) {
      return res.status(400).json({ message: 'Title and participants are required' });
    }

    // Add current user to participants if not included
    if (!participant_ids.includes(userId)) {
      participant_ids.push(userId);
    }

    // Create conversation
    const [conversationResult] = await db.execute(
      'INSERT INTO conversations (title, type, created_by, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [title, type, userId]
    );

    const conversationId = conversationResult.insertId;

    // Add participants
    for (const participantId of participant_ids) {
      await db.execute(
        'INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, NOW())',
        [conversationId, participantId]
      );
    }

    res.status(201).json({ 
      message: 'Conversation created successfully',
      conversation_id: conversationId
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Error creating conversation' });
  }
});

// ==================== NOTIFICATION SYSTEM ====================

// Get user notifications
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE n.user_id = ?';
    const params = [userId];
    
    if (unread_only === 'true') {
      whereClause += ' AND n.is_read = 0';
    }

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM notifications n ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get notifications
    const [notifications] = await db.execute(
      `SELECT n.*, u.name as sender_name, u.role as sender_role
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await db.execute(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await db.execute(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// Create notification (admin/doctor only)
router.post('/notifications', verifyToken, async (req, res) => {
  try {
    const { user_ids, title, message, type = 'info', priority = 'normal' } = req.body;
    const senderId = req.user.id;
    
    if (!user_ids || !title || !message) {
      return res.status(400).json({ message: 'User IDs, title, and message are required' });
    }

    // Check if user has permission to send notifications
    if (!['admin', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to send notifications' });
    }

    const notifications = [];
    for (const userId of user_ids) {
      const [result] = await db.execute(
        'INSERT INTO notifications (user_id, sender_id, title, message, type, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [userId, senderId, title, message, type, priority]
      );
      notifications.push(result.insertId);
    }

    res.status(201).json({ 
      message: 'Notifications sent successfully',
      notification_ids: notifications
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    res.status(500).json({ message: 'Error creating notifications' });
  }
});

// ==================== INSTITUTIONAL ANNOUNCEMENTS ====================

// Get announcements
router.get('/announcements', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, priority } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    if (priority) {
      whereClause += ' AND priority = ?';
      params.push(priority);
    }

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM announcements ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get announcements
    const [announcements] = await db.execute(
      `SELECT a.*, u.name as author_name, u.role as author_role
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       ${whereClause}
       ORDER BY a.priority DESC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      announcements,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Create announcement (admin only)
router.post('/announcements', verifyToken, async (req, res) => {
  try {
    const { title, content, category, priority = 'normal', target_roles, expiry_date } = req.body;
    const authorId = req.user.id;
    
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Title, content, and category are required' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create announcements' });
    }

    // Create announcement
    const [result] = await db.execute(
      'INSERT INTO announcements (title, content, category, priority, author_id, target_roles, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [title, content, category, priority, authorId, JSON.stringify(target_roles), expiry_date]
    );

    // Create notifications for target users
    if (target_roles && target_roles.length > 0) {
      const [users] = await db.execute(
        'SELECT id FROM users WHERE role IN (?) AND status = "active"',
        [target_roles]
      );

      for (const user of users) {
        await db.execute(
          'INSERT INTO notifications (user_id, sender_id, title, message, type, priority, created_at) VALUES (?, ?, ?, ?, "announcement", ?, NOW())',
          [user.id, authorId, title, content, priority]
        );
      }
    }

    res.status(201).json({ 
      message: 'Announcement created successfully',
      announcement_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Error creating announcement' });
  }
});

// Update announcement (admin only)
router.patch('/announcements/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, priority, target_roles, expiry_date, is_active } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update announcements' });
    }

    const updateFields = [];
    const params = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      params.push(title);
    }
    
    if (content !== undefined) {
      updateFields.push('content = ?');
      params.push(content);
    }
    
    if (category !== undefined) {
      updateFields.push('category = ?');
      params.push(category);
    }
    
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      params.push(priority);
    }
    
    if (target_roles !== undefined) {
      updateFields.push('target_roles = ?');
      params.push(JSON.stringify(target_roles));
    }
    
    if (expiry_date !== undefined) {
      updateFields.push('expiry_date = ?');
      params.push(expiry_date);
    }
    
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    params.push(id);

    await db.execute(
      `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Error updating announcement' });
  }
});

// Delete announcement (admin only)
router.delete('/announcements/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete announcements' });
    }

    await db.execute(
      'UPDATE announcements SET is_active = 0, deleted_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Error deleting announcement' });
  }
});

// ==================== EMAIL/SMS INTEGRATION ====================

// Send email notification (placeholder for email service integration)
router.post('/send-email', verifyToken, async (req, res) => {
  try {
    const { to, subject, body, template } = req.body;
    
    // Check if user has permission
    if (!['admin', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to send emails' });
    }

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log the email request
    console.log('Email request:', { to, subject, body, template });

    res.json({ message: 'Email queued for delivery' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending email' });
  }
});

// Send SMS notification (placeholder for SMS service integration)
router.post('/send-sms', verifyToken, async (req, res) => {
  try {
    const { to, message } = req.body;
    
    // Check if user has permission
    if (!['admin', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to send SMS' });
    }

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // For now, just log the SMS request
    console.log('SMS request:', { to, message });

    res.json({ message: 'SMS queued for delivery' });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ message: 'Error sending SMS' });
  }
});

// ==================== SYSTEM NOTIFICATIONS ====================

// Get system notifications (for admins)
router.get('/system-notifications', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [notifications] = await db.execute(
      `SELECT * FROM system_notifications 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching system notifications:', error);
    res.status(500).json({ message: 'Error fetching system notifications' });
  }
});

// Create system notification (for system events)
router.post('/system-notifications', verifyToken, async (req, res) => {
  try {
    const { type, title, message, severity = 'info', metadata } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [result] = await db.execute(
      'INSERT INTO system_notifications (type, title, message, severity, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [type, title, message, severity, JSON.stringify(metadata)]
    );

    res.status(201).json({ 
      message: 'System notification created successfully',
      notification_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating system notification:', error);
    res.status(500).json({ message: 'Error creating system notification' });
  }
});

module.exports = router;
