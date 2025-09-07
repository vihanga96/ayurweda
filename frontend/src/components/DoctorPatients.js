import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaCalendar, FaEye, FaHistory } from 'react-icons/fa';
import axios from 'axios';
import './DoctorPatients.css';

const DoctorPatients = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            const response = await axios.get('http://localhost:5001/api/doctors/patients', { headers });
            setPatients(response.data.patients);
        } catch (err) {
            setError('Failed to fetch patients');
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = async (patientId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            const response = await axios.get(
                `http://localhost:5001/api/doctors/patients/${patientId}/history`,
                { headers }
            );
            
            setSelectedPatient({
                ...patients.find(p => p.patient_id === patientId),
                history: response.data.history || []
            });
            setShowHistoryModal(true);
        } catch (err) {
            setError('Failed to fetch patient history');
            console.error('Error fetching patient history:', err);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === 'null' || dateString === 'undefined') return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    };

    const getStatusColor = (status) => {
        if (!status) return '#95a5a6';
        switch (status.toLowerCase()) {
            case 'pending': return '#f39c12';
            case 'confirmed': return '#27ae60';
            case 'cancelled': return '#e74c3c';
            case 'completed': return '#3498db';
            default: return '#95a5a6';
        }
    };

    const renderPatientCard = (patient) => {
        if (!patient || !patient.patient_id) return null;
        
        return (
            <div key={patient.patient_id} className="patient-card">
                <div className="patient-header">
                    <div className="patient-info">
                        <h3>{patient.patient_name || 'Unknown Patient'}</h3>
                        <p className="patient-email">
                            <FaEnvelope /> {patient.patient_email || 'No email provided'}
                        </p>
                        {patient.patient_phone && (
                            <p className="patient-phone">
                                <FaPhone /> {patient.patient_phone}
                            </p>
                        )}
                    </div>
                    <div className="patient-stats">
                        <span className="appointment-count">
                            {patient.total_appointments || 0} appointment{(patient.total_appointments || 0) !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="patient-details">
                    <div className="detail-item">
                        <label>Last Appointment:</label>
                        <span>{formatDate(patient.last_appointment_date)}</span>
                    </div>
                    <div className="detail-item">
                        <label>Last Interaction:</label>
                        <span>{formatDate(patient.last_interaction)}</span>
                    </div>
                </div>

                <div className="patient-actions">
                    <button 
                        onClick={() => handleViewHistory(patient.patient_id)}
                        className="action-btn"
                    >
                        <FaHistory /> View History
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading patients...</p>
            </div>
        );
    }

    return (
        <div className="doctor-patients-container">
            <header className="patients-header">
                <div className="header-content">
                    <button onClick={() => navigate('/doctor-dashboard')} className="back-btn">
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="header-brand">
                        <FaUser className="header-logo" />
                        <h1>My Patients</h1>
                    </div>
                </div>
            </header>

            <main className="patients-main">
                <div className="patients-content">
                    <div className="section-header">
                        <h2>Patients Who Have Interacted With You</h2>
                        <button onClick={fetchPatients} className="refresh-btn">
                            Refresh
                        </button>
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    {patients.length === 0 ? (
                        <div className="no-patients">
                            <FaUser className="no-patients-icon" />
                            <h3>No Patients Found</h3>
                            <p>You haven't had any appointments with patients yet.</p>
                        </div>
                    ) : (
                        <div className="patients-grid">
                            {patients.map(patient => renderPatientCard(patient))}
                        </div>
                    )}
                </div>
            </main>

            {/* Patient History Modal */}
            {showHistoryModal && selectedPatient && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Patient History - {selectedPatient.patient_name}</h3>
                            <button 
                                onClick={() => setShowHistoryModal(false)}
                                className="close-btn"
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="patient-summary">
                                <p><strong>Email:</strong> {selectedPatient.patient_email}</p>
                                {selectedPatient.patient_phone && (
                                    <p><strong>Phone:</strong> {selectedPatient.patient_phone}</p>
                                )}
                                <p><strong>Total Appointments:</strong> {selectedPatient.total_appointments}</p>
                            </div>
                            
                            <div className="history-section">
                                <h4>Appointment History</h4>
                                {selectedPatient.history && selectedPatient.history.length > 0 ? (
                                    <div className="history-list">
                                        {selectedPatient.history.map(appointment => (
                                            <div key={appointment.id} className="history-item">
                                                <div className="history-header">
                                                    <span className="appointment-date">
                                                        {formatDate(appointment.appointment_date)}
                                                    </span>
                                                    <span 
                                                        className="status-badge"
                                                        style={{ backgroundColor: getStatusColor(appointment.status) }}
                                                    >
                                                        {appointment.status}
                                                    </span>
                                                </div>
                                                <div className="history-details">
                                                    <p><strong>Time:</strong> {appointment.appointment_time}</p>
                                                    <p><strong>Type:</strong> {appointment.consultation_type}</p>
                                                    {appointment.symptoms && (
                                                        <p><strong>Symptoms:</strong> {appointment.symptoms}</p>
                                                    )}
                                                    {appointment.diagnosis && (
                                                        <p><strong>Diagnosis:</strong> {appointment.diagnosis}</p>
                                                    )}
                                                    {appointment.prescription && (
                                                        <p><strong>Prescription:</strong> {appointment.prescription}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-history">No detailed history available.</p>
                                )}
                            </div>
                            
                            <div className="modal-actions">
                                <button 
                                    onClick={() => setShowHistoryModal(false)}
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

export default DoctorPatients; 