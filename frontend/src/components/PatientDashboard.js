import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaCalendar, FaPills, FaFileAlt, FaSignOutAlt, FaUserMd, FaShoppingCart, FaHistory, FaPrescriptionBottle } from 'react-icons/fa';
import './PatientDashboard.css';

const PatientDashboard = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName') || 'Patient';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header patient-dashboard-header">
                <div className="header-content">
                    <h1>Ayurweda Patient Dashboard</h1>
                    <div className="user-info">
                        <FaUser />
                        <span>Welcome, {userName}</span>
                        <button onClick={handleLogout} className="logout-btn">
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="dashboard-grid">
                    <div className="dashboard-card" onClick={() => navigate('/doctors')}>
                        <FaUserMd className="card-icon" />
                        <h3>E-Channeling</h3>
                        <p>Book appointments with Ayurvedic doctors and specialists</p>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate('/medicine-catalog')}>
                        <FaShoppingCart className="card-icon" />
                        <h3>Medicine Catalog</h3>
                        <p>Browse and order authentic Ayurvedic medicines and herbal products</p>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate('/prescription-order')}>
                        <FaPrescriptionBottle className="card-icon" />
                        <h3>Prescription Orders</h3>
                        <p>Order medicines based on your doctor's prescriptions</p>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate('/order-history')}>
                        <FaHistory className="card-icon" />
                        <h3>Order History</h3>
                        <p>View and track your medicine orders</p>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate('/my-appointments')}>
                        <FaFileAlt className="card-icon" />
                        <h3>My Appointments</h3>
                        <p>View and manage your scheduled appointments</p>
                    </div>

                    <div className="dashboard-card" onClick={() => navigate('/profile')}>
                        <FaUser className="card-icon" />
                        <h3>Profile</h3>
                        <p>Manage your personal information and preferences</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PatientDashboard; 