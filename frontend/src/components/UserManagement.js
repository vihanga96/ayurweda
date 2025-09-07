import React, { useState, useEffect } from 'react';
import { FaUser, FaEdit, FaTrash, FaEye, FaTimes, FaSave, FaUsers, FaUserMd, FaGraduationCap, FaCrown, FaSearch, FaFilter, FaPlus, FaChartBar, FaCog, FaArrowLeft, FaLeaf, FaEnvelope, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import './UserManagement.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [showEditModal, setShowEditModal] = useState(false);

    const currentUserId = localStorage.getItem('userId');

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/users', {
                headers: { 'x-auth-token': token }
            });
            setUsers(response.data.users);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch users');
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/users/stats', {
                headers: { 'x-auth-token': token }
            });
            setStats(response.data.stats);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            setStats({
                total: users.length,
                byRole: {
                    admin: users.filter(u => u.role === 'admin').length,
                    doctor: users.filter(u => u.role === 'doctor').length,
                    student: users.filter(u => u.role === 'student').length,
                    patient: users.filter(u => u.role === 'patient').length
                }
            });
        }
    };

    useEffect(() => {
        if (users.length > 0) {
            const calculatedStats = {
                total: users.length,
                byRole: {
                    admin: users.filter(u => u.role === 'admin').length,
                    doctor: users.filter(u => u.role === 'doctor').length,
                    student: users.filter(u => u.role === 'student').length,
                    patient: users.filter(u => u.role === 'patient').length
                }
            };
            setStats(calculatedStats);
        }
    }, [users]);

    const handleEditUser = (user) => {
        setEditingUser({ ...user });
        setShowEditModal(true);
    };

    const handleUpdateUser = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/users/${editingUser.id}`, editingUser, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('User updated successfully!');
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
            fetchStats();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to update user');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5001/api/auth/admin/users/${userId}`, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('User deleted successfully!');
            fetchUsers();
            fetchStats();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to delete user');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleBackToAdmin = () => {
        window.location.href = '/admin-dashboard';
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin': return <FaCrown className="role-icon admin" />;
            case 'doctor': return <FaUserMd className="role-icon doctor" />;
            case 'student': return <FaGraduationCap className="role-icon student" />;
            case 'patient': return <FaUser className="role-icon patient" />;
            default: return <FaUser className="role-icon" />;
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return '#e74c3c';
            case 'doctor': return '#3498db';
            case 'student': return '#f39c12';
            case 'patient': return '#27ae60';
            default: return '#95a5a6';
        }
    };

    const getRoleGradient = (role) => {
        switch (role) {
            case 'admin': return 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
            case 'doctor': return 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
            case 'student': return 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
            case 'patient': return 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)';
            default: return 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return 'ADMIN';
            case 'doctor': return 'DOCTOR';
            case 'student': return 'STUDENT';
            case 'patient': return 'PATIENT';
            default: return role.toUpperCase();
        }
    };

    const filteredUsers = users
        .filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterRole === 'all' || user.role === filterRole;
            return matchesSearch && matchesFilter;
        });

    const formatDate = (dateString) => {
        if (!dateString) {
            return 'N/A';
        }
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="user-management-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-management-container">
            <div className="user-management-header">
                <div className="header-top">
                    <button className="back-btn" onClick={handleBackToAdmin}>
                        <FaArrowLeft />
                        Back to Admin Dashboard
                    </button>
                    <div className="logo-section">
                        <div className="logo-container">
                            <FaLeaf className="logo-icon" />
                            <span className="logo-text">Ayurveda</span>
                        </div>
                    </div>
                </div>
                <div className="header-content">
                    <h1>👥 User Management</h1>
                    <p>Manage and monitor all users in the Ayurveda system</p>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="main-content">
                {/* Statistics Dashboard */}
                <div className="stats-dashboard">
                    <div className="stat-card primary">
                        <div className="stat-icon">
                            <FaUsers />
                        </div>
                        <div className="stat-content">
                            <h3>Total Users</h3>
                            <p className="stat-number">{stats.total || 0}</p>
                            <span className="stat-change">+12% this month</span>
                        </div>
                    </div>
                    <div className="stat-card admin">
                        <div className="stat-icon">
                            <FaCrown />
                        </div>
                        <div className="stat-content">
                            <h3>Admin</h3>
                            <p className="stat-number">{stats.byRole?.admin || 0}</p>
                            <span className="stat-change">System managers</span>
                        </div>
                    </div>
                    <div className="stat-card doctor">
                        <div className="stat-icon">
                            <FaUserMd />
                        </div>
                        <div className="stat-content">
                            <h3>Medical Staff</h3>
                            <p className="stat-number">{stats.byRole?.doctor || 0}</p>
                            <span className="stat-change">Healthcare providers</span>
                        </div>
                    </div>
                    <div className="stat-card student">
                        <div className="stat-icon">
                            <FaGraduationCap />
                        </div>
                        <div className="stat-content">
                            <h3>Students</h3>
                            <p className="stat-number">{stats.byRole?.student || 0}</p>
                            <span className="stat-change">Learning users</span>
                        </div>
                    </div>
                    <div className="stat-card patient">
                        <div className="stat-icon">
                            <FaUser />
                        </div>
                        <div className="stat-content">
                            <h3>Patients</h3>
                            <p className="stat-number">{stats.byRole?.patient || 0}</p>
                            <span className="stat-change">Service recipients</span>
                        </div>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="controls-section">
                    <div className="search-controls">
                        <div className="search-box">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-controls">
                            <div className="filter-box">
                                <FaFilter className="filter-icon" />
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="admin">👑 Admins</option>
                                    <option value="doctor">👨‍⚕️ Doctors</option>
                                    <option value="student">🎓 Students</option>
                                    <option value="patient">👤 Patients</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Display */}
                <div className="users-display">
                    <div className="users-grid">
                        {filteredUsers.map(user => (
                            <div key={user.id} className={`user-card ${user.id == currentUserId ? 'current-user' : ''}`}>
                                <div className="card-header">
                                    <div className="user-avatar" style={{ background: getRoleGradient(user.role) }}>
                                        {getRoleIcon(user.role)}
                                    </div>
                                    <div className="user-info">
                                        <h3 className="user-name">{user.name}</h3>
                                        <div className="user-email">
                                            <FaEnvelope className="email-icon" />
                                            <span>{user.email}</span>
                                        </div>
                                        {user.id == currentUserId && <span className="current-user-badge">You</span>}
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="role-badge" style={{ background: getRoleGradient(user.role) }}>
                                        {getRoleLabel(user.role)}
                                    </div>
                                    <div className="user-stats">
                                        <div className="stat-item">
                                            <FaCalendarAlt className="stat-icon-small" />
                                            <span>Joined: {formatDate(user.created_at)}</span>
                                        </div>
                                        <div className="stat-item">
                                            <FaCheckCircle className="stat-icon-small" />
                                            <span>Status: Active</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button
                                        className="action-btn edit"
                                        onClick={() => handleEditUser(user)}
                                        title="Edit User"
                                    >
                                        <FaEdit />
                                        <span className="action-label">Edit</span>
                                    </button>
                                    {user.id != currentUserId && (
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDeleteUser(user.id)}
                                            title="Delete User"
                                        >
                                            <FaTrash />
                                            <span className="action-label">Delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">
                                <div className="modal-icon">
                                    <FaEdit />
                                </div>
                                <div>
                                    <h2>Edit User Profile</h2>
                                    <p>Update user information and role</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn"
                                onClick={() => setShowEditModal(false)}
                                title="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="user-preview">
                                <div className="preview-avatar" style={{ background: getRoleGradient(editingUser.role) }}>
                                    {getRoleIcon(editingUser.role)}
                                </div>
                                <div className="preview-info">
                                    <h3>{editingUser.name}</h3>
                                    <span className="preview-role" style={{ background: getRoleGradient(editingUser.role) }}>
                                        {getRoleLabel(editingUser.role)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="form-section">
                                <h3>Personal Information</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>
                                            <FaUser className="input-icon" />
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter user's full name"
                                            value={editingUser.name}
                                            onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            <FaEnvelope className="input-icon" />
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Enter user's email address"
                                            value={editingUser.email}
                                            onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="form-section">
                                <h3>Role & Permissions</h3>
                                <div className="form-group">
                                    <label>
                                        <FaCrown className="input-icon" />
                                        User Role
                                    </label>
                                    <div className="role-selector">
                                        {[
                                            { value: 'patient', label: 'Patient', icon: '👤', desc: 'Service recipient' },
                                            { value: 'student', label: 'Student', icon: '🎓', desc: 'Learning user' },
                                            { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️', desc: 'Healthcare provider' },
                                            { value: 'admin', label: 'Admin', icon: '👑', desc: 'System manager' }
                                        ].map(role => (
                                            <div 
                                                key={role.value}
                                                className={`role-option ${editingUser.role === role.value ? 'selected' : ''}`}
                                                onClick={() => setEditingUser({...editingUser, role: role.value})}
                                            >
                                                <div className="role-option-icon">{role.icon}</div>
                                                <div className="role-option-content">
                                                    <span className="role-option-label">{role.label}</span>
                                                    <span className="role-option-desc">{role.desc}</span>
                                                </div>
                                                {editingUser.role === role.value && (
                                                    <div className="role-option-check">
                                                        <FaSave />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="btn-secondary"
                                onClick={() => setShowEditModal(false)}
                            >
                                <FaTimes />
                                Cancel
                            </button>
                            <button 
                                className="btn-primary"
                                onClick={handleUpdateUser}
                            >
                                <FaSave />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement; 