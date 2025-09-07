import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCalendar, FaClock, FaUserMd, FaArrowLeft, FaTimes, FaCheck, FaEye } from 'react-icons/fa';
import './MyAppointments.css';

const MyAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/appointments/my-appointments', {
                headers: { 'x-auth-token': token }
            });
            setAppointments(response.data.appointments);
        } catch (err) {
            setError('Failed to fetch appointments.');
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) {
            return;
        }

        setCancelling(appointmentId);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/appointments/appointments/${appointmentId}/cancel`, {}, {
                headers: { 'x-auth-token': token }
            });
            
            // Update the appointment status locally
            setAppointments(prev => 
                prev.map(apt => 
                    apt.id === appointmentId 
                        ? { ...apt, status: 'cancelled' }
                        : apt
                )
            );
        } catch (err) {
            if (err.response && err.response.data && err.response.data.msg) {
                setError(err.response.data.msg);
            } else {
                setError('Failed to cancel appointment.');
            }
        } finally {
            setCancelling(null);
        }
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
                <p>Loading appointments...</p>
            </div>
        );
    }

    return (
        <div className="my-appointments-container">
            <div className="appointments-header">
                <button onClick={() => navigate('/patient-dashboard')} className="back-btn">
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <h1>Ayurweda My Appointments</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="appointments-content">
                {appointments.length === 0 ? (
                    <div className="no-appointments">
                        <FaCalendar className="no-appointments-icon" />
                        <h3>No Appointments</h3>
                        <p>You haven't booked any appointments yet.</p>
                        <button 
                            onClick={() => navigate('/doctors')} 
                            className="book-new-btn"
                        >
                            Book Your First Appointment
                        </button>
                    </div>
                ) : (
                    <div className="appointments-grid">
                        {appointments.map(appointment => (
                            <div key={appointment.id} className="appointment-card">
                                <div className="appointment-header">
                                    <div className="doctor-info">
                                        <FaUserMd className="doctor-icon" />
                                        <div>
                                            <h3>{appointment.doctor_name}</h3>
                                            <p className="specialization">{appointment.specialization}</p>
                                        </div>
                                    </div>
                                    <div 
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(appointment.status) }}
                                    >
                                        {getStatusIcon(appointment.status)} {appointment.status}
                                    </div>
                                </div>

                                <div className="appointment-details">
                                    <div className="detail-item">
                                        <FaCalendar />
                                        <span>{formatDate(appointment.appointment_date)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <FaClock />
                                        <span>{formatTime(appointment.appointment_time)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="consultation-type">
                                            {appointment.consultation_type.charAt(0).toUpperCase() + 
                                             appointment.consultation_type.slice(1)} Consultation
                                        </span>
                                    </div>
                                </div>

                                {appointment.symptoms && (
                                    <div className="symptoms">
                                        <strong>Symptoms:</strong> {appointment.symptoms}
                                    </div>
                                )}

                                {appointment.notes && (
                                    <div className="notes">
                                        <strong>Doctor's Notes:</strong> {appointment.notes}
                                    </div>
                                )}

                                <div className="appointment-actions">
                                    {appointment.status === 'pending' && (
                                        <button
                                            onClick={() => handleCancelAppointment(appointment.id)}
                                            className="cancel-btn"
                                            disabled={cancelling === appointment.id}
                                        >
                                            {cancelling === appointment.id ? 'Cancelling...' : 'Cancel Appointment'}
                                        </button>
                                    )}
                                    
                                    {appointment.status === 'confirmed' && (
                                        <div className="confirmed-info">
                                            <FaCheck /> Your appointment has been confirmed!
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAppointments; 