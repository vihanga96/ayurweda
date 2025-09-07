import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserMd, FaCalendar, FaStethoscope, FaFileAlt, FaSignOutAlt, FaChartBar, FaCog, FaUsers, FaClock, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import axios from 'axios';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName') || 'Doctor';
    const [stats, setStats] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showNotesModal, setShowNotesModal] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            // Fetch stats and appointments in parallel
            const [statsResponse, appointmentsResponse] = await Promise.all([
                axios.get('http://localhost:5001/api/doctors/dashboard/stats', { headers }),
                axios.get('http://localhost:5001/api/doctors/appointments', { headers })
            ]);

            setStats(statsResponse.data.stats);
            setAppointments(appointmentsResponse.data.appointments);
        } catch (err) {
            setError('Failed to fetch dashboard data');
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `http://localhost:5001/api/doctors/appointments/${appointmentId}/status`,
                { status: newStatus },
                { headers: { 'x-auth-token': token } }
            );
            
            // Update local state
            setAppointments(prev => 
                prev.map(apt => 
                    apt.id === appointmentId 
                        ? { ...apt, status: newStatus }
                        : apt
                )
            );
            
            setError('');
        } catch (err) {
            setError('Failed to update appointment status');
            console.error('Error updating status:', err);
        }
    };

    const handleViewNotes = (appointment) => {
        setSelectedAppointment(appointment);
        setShowNotesModal(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f39c12';
            case 'confirmed': return '#27ae60';
            case 'cancelled': return '#e74c3c';
            case 'completed': return '#3498db';
            default: return '#95a5a6';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'confirmed': return '✅';
            case 'cancelled': return '❌';
            case 'completed': return '✅';
            default: return '❓';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        return timeString;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="doctor-dashboard-container">
            <header className="doctor-dashboard-header">
                <div className="header-content">
                    <div className="header-brand">
                        <FaUserMd className="header-logo" />
                        <h1>Ayurweda Doctor Dashboard</h1>
                    </div>
                    <div className="user-info">
                        <FaUserMd />
                        <span>Welcome, Dr. {userName}</span>
                        <button onClick={handleLogout} className="logout-btn">
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="doctor-dashboard-main">
                {/* Statistics Section */}
                <div className="stats-section">
                    <div className="stat-card">
                        <FaCalendar className="stat-icon" />
                        <div className="stat-content">
                            <h3>{stats.total_appointments || 0}</h3>
                            <p>Total Appointments</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <FaClock className="stat-icon" />
                        <div className="stat-content">
                            <h3>{stats.pending_appointments || 0}</h3>
                            <p>Pending</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <FaCheck className="stat-icon" />
                        <div className="stat-content">
                            <h3>{stats.confirmed_appointments || 0}</h3>
                            <p>Confirmed</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <FaStethoscope className="stat-icon" />
                        <div className="stat-content">
                            <h3>{stats.completed_appointments || 0}</h3>
                            <p>Completed</p>
                        </div>
                    </div>

                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button onClick={() => navigate('/doctor/profile')} className="action-btn">
                        <FaCog /> Manage Profile
                    </button>
                    <button onClick={() => navigate('/doctor/schedule')} className="action-btn">
                        <FaCalendar /> Manage Schedule
                    </button>
                    <button onClick={() => navigate('/doctor/patients')} className="action-btn">
                        <FaUsers /> View Patients
                    </button>
                </div>

                {/* Appointments Section */}
                <div className="appointments-section">
                    <div className="section-header">
                        <h2>Recent Appointments</h2>
                        <button onClick={fetchDashboardData} className="refresh-btn">
                            Refresh
                        </button>
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <div className="appointments-grid">
                        {appointments.slice(0, 10).map(appointment => (
                            <div key={appointment.id} className="appointment-card">
                                <div className="appointment-header">
                                    <div className="patient-info">
                                        <h4>{appointment.patient_name}</h4>
                                        <p>{appointment.patient_email}</p>
                                        {appointment.patient_phone && (
                                            <p>📞 {appointment.patient_phone}</p>
                                        )}
                                    </div>
                                    <div className="appointment-status">
                                        <span 
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(appointment.status) }}
                                        >
                                            {getStatusIcon(appointment.status)} {appointment.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="appointment-details">
                                    <p><strong>Date:</strong> {formatDate(appointment.appointment_date)}</p>
                                    <p><strong>Time:</strong> {formatTime(appointment.appointment_time)}</p>
                                    <p><strong>Type:</strong> {appointment.consultation_type}</p>
                                    {appointment.symptoms && (
                                        <p><strong>Symptoms:</strong> {appointment.symptoms}</p>
                                    )}
                                </div>

                                <div className="appointment-actions">
                                    <button 
                                        onClick={() => handleViewNotes(appointment)}
                                        className="action-btn-small"
                                    >
                                        <FaEye /> View Notes
                                    </button>
                                    
                                    {appointment.status === 'pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                                className="action-btn-small confirm"
                                            >
                                                <FaCheck /> Confirm
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                                className="action-btn-small cancel"
                                            >
                                                <FaTimes /> Cancel
                                            </button>
                                        </>
                                    )}
                                    
                                    {appointment.status === 'confirmed' && (
                                        <button 
                                            onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                            className="action-btn-small complete"
                                        >
                                            <FaStethoscope /> Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {appointments.length === 0 && (
                        <div className="no-appointments">
                            <p>No appointments found.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Notes Modal */}
            {showNotesModal && selectedAppointment && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Appointment Notes</h3>
                            <button 
                                onClick={() => setShowNotesModal(false)}
                                className="close-btn"
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="appointment-summary">
                                <h4>Patient: {selectedAppointment.patient_name}</h4>
                                <p>Date: {formatDate(selectedAppointment.appointment_date)}</p>
                                <p>Time: {formatTime(selectedAppointment.appointment_time)}</p>
                                <p>Status: {selectedAppointment.status}</p>
                                {selectedAppointment.symptoms && (
                                    <p>Symptoms: {selectedAppointment.symptoms}</p>
                                )}
                                {selectedAppointment.notes && (
                                    <p>Notes: {selectedAppointment.notes}</p>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button 
                                    onClick={() => {
                                        setShowNotesModal(false);
                                        navigate(`/doctor/appointments/${selectedAppointment.id}/notes`);
                                    }}
                                    className="action-btn"
                                >
                                    <FaFileAlt /> Add/Edit Notes
                                </button>
                                <button 
                                    onClick={() => setShowNotesModal(false)}
                                    className="action-btn secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard; 