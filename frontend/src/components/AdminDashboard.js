import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaUserMd, FaGraduationCap, FaSignOutAlt, FaPlus, FaUsers, FaLeaf, FaPills, FaClipboardList, FaBook, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName') || 'admin';
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { name, email, password, role } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:5001/api/auth/admin/register',
                { name, email, password, role },
                {
                    headers: {
                        'x-auth-token': token
                    }
                }
            );
            setSuccess(`${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully!`);
            setFormData({ name: '', email: '', password: '', role: 'student' });
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.msg) {
                setError(err.response.data.msg);
            } else if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please check if the backend is running.');
            } else {
                setError('An error occurred during registration. Please try again.');
            }
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <div className="admin-dashboard-container">
            <header className="admin-dashboard-header">
                <div className="header-content">
                    <div className="header-brand">
                        <FaLeaf className="header-logo" />
                        <h1>Ayurveda Admin Dashboard</h1>
                    </div>
                    <div className="user-info">
                        <FaUser />
                        <span>Welcome, {userName}</span>
                        <button onClick={handleLogout} className="logout-btn">
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="admin-dashboard-main">
                <div className="admin-controls">
                    <button 
                        onClick={() => setShowRegisterForm(!showRegisterForm)} 
                        className="register-user-btn"
                    >
                        <FaPlus /> Register New User
                    </button>
                </div>

                {showRegisterForm && (
                    <div className="register-form-container">
                        <h2>Register New User</h2>
                        {error && <p className="error">{error}</p>}
                        {success && <p className="success">{success}</p>}
                        <form onSubmit={handleRegisterUser}>
                            <div className="form-group">
                                <label>
                                    <FaUser className="input-icon" />
                                    Name
                                </label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={name} 
                                    onChange={onChange} 
                                    placeholder="Enter user's name"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <FaUser className="input-icon" />
                                    Email
                                </label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={email} 
                                    onChange={onChange} 
                                    placeholder="Enter user's email"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <FaUser className="input-icon" />
                                    Password
                                </label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={password} 
                                    onChange={onChange} 
                                    placeholder="Enter user's password"
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <FaUser className="input-icon" />
                                    Role
                                </label>
                                <select 
                                    name="role" 
                                    value={role} 
                                    onChange={onChange}
                                    required
                                >
                                    <option value="student">🎓 Student - Learn Ayurvedic practices</option>
                                    <option value="doctor">👨‍⚕️ Doctor - Provide medical care</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit">Register User</button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowRegisterForm(false)}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="admin-stats">
                    <div className="stat-card clickable" onClick={() => navigate('/user-management')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="User Management" />
                        </div>
                        <FaUsers className="stat-icon" />
                        <h3>User Management</h3>
                        <p>Register and manage students and doctors with comprehensive control over user accounts and permissions.</p>
                    </div>
                    <div className="stat-card clickable" onClick={() => navigate('/medicine-management')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Medicine Management" />
                        </div>
                        <FaPills className="stat-icon" />
                        <h3>Medicine Management</h3>
                        <p>Add, edit, and manage Ayurvedic medicines, categories, inventory, and pricing with complete control over the catalog.</p>
                    </div>
                    <div className="stat-card clickable" onClick={() => navigate('/order-management')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Order Management" />
                        </div>
                        <FaClipboardList className="stat-icon" />
                        <h3>Order Management</h3>
                        <p>View and manage patient medicine orders, update order status, and track delivery progress efficiently.</p>
                    </div>
                    <div className="stat-card clickable" onClick={() => navigate('/doctor-portal')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Doctor Portal" />
                        </div>
                        <FaUserMd className="stat-icon" />
                        <h3>Doctor Portal</h3>
                        <p>Manage medical records, appointments, and provide care with advanced healthcare administration tools.</p>
                    </div>
                    <div className="stat-card clickable" onClick={() => navigate('/student-portal')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Student Portal" />
                        </div>
                        <FaGraduationCap className="stat-icon" />
                        <h3>Student Portal</h3>
                        <p>Oversee student activities, track progress, and manage educational programs in Ayurvedic practices.</p>
                    </div>
                    <div className="stat-card clickable" onClick={() => navigate('/course-management')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Course Management" />
                        </div>
                        <FaBook className="stat-icon" />
                        <h3>Course Management</h3>
                        <p>Create, edit, and manage educational courses, curricula, and academic programs for students.</p>
                    </div>
                    <div className="stat-card clickable" onClick={() => navigate('/application-management')}>
                        <div className="stat-image">
                            <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Application Management" />
                        </div>
                        <FaFileAlt className="stat-icon" />
                        <h3>Application Management</h3>
                        <p>Review and process student applications, manage admissions, and track application status.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard; 