import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaStethoscope, FaPills, FaCalendar, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';
import './ConsultationNotes.css';

const ConsultationNotes = () => {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [appointment, setAppointment] = useState(null);
    const [notes, setNotes] = useState({
        diagnosis: '',
        prescription: '',
        treatment_plan: '',
        follow_up_date: '',
        notes: ''
    });

    useEffect(() => {
        fetchAppointmentAndNotes();
    }, [appointmentId]);

    const fetchAppointmentAndNotes = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            // Fetch appointment details
            const appointmentResponse = await axios.get(
                `http://localhost:5001/api/doctors/appointments/${appointmentId}`,
                { headers }
            );

            // Fetch existing notes
            const notesResponse = await axios.get(
                `http://localhost:5001/api/doctors/appointments/${appointmentId}/notes`,
                { headers }
            );

            setAppointment(appointmentResponse.data.appointment);
            
            if (notesResponse.data.notes) {
                setNotes({
                    diagnosis: notesResponse.data.notes.diagnosis || '',
                    prescription: notesResponse.data.notes.prescription || '',
                    treatment_plan: notesResponse.data.notes.treatment_plan || '',
                    follow_up_date: notesResponse.data.notes.follow_up_date || '',
                    notes: notesResponse.data.notes.notes || ''
                });
            }
        } catch (err) {
            setError('Failed to fetch appointment and notes data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            await axios.post(
                `http://localhost:5001/api/doctors/appointments/${appointmentId}/notes`,
                notes,
                { headers }
            );

            setSuccess('Consultation notes saved successfully!');
            setTimeout(() => {
                navigate('/doctor-dashboard');
            }, 2000);
        } catch (err) {
            setError('Failed to save consultation notes');
            console.error('Error saving notes:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNotes(prev => ({
            ...prev,
            [name]: value
        }));
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

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading consultation notes...</p>
            </div>
        );
    }

    return (
        <div className="consultation-notes-container">
            <header className="notes-header">
                <div className="header-content">
                    <button onClick={() => navigate('/doctor-dashboard')} className="back-btn">
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="header-brand">
                        <FaStethoscope className="header-logo" />
                        <h1>Consultation Notes</h1>
                    </div>
                </div>
            </header>

            <main className="notes-main">
                <div className="notes-content">
                    {appointment && (
                        <div className="appointment-summary">
                            <h2>Appointment Summary</h2>
                            <div className="summary-grid">
                                <div className="summary-item">
                                    <label>Patient:</label>
                                    <span>{appointment.patient_name}</span>
                                </div>
                                <div className="summary-item">
                                    <label>Date:</label>
                                    <span>{formatDate(appointment.appointment_date)}</span>
                                </div>
                                <div className="summary-item">
                                    <label>Time:</label>
                                    <span>{appointment.appointment_time}</span>
                                </div>
                                <div className="summary-item">
                                    <label>Status:</label>
                                    <span className={`status-${appointment.status}`}>{appointment.status}</span>
                                </div>
                                {appointment.symptoms && (
                                    <div className="summary-item full-width">
                                        <label>Symptoms:</label>
                                        <span>{appointment.symptoms}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="notes-form">
                        <div className="form-section">
                            <h3><FaStethoscope /> Diagnosis</h3>
                            <textarea
                                name="diagnosis"
                                value={notes.diagnosis}
                                onChange={handleInputChange}
                                placeholder="Enter diagnosis..."
                                rows="4"
                            />
                        </div>

                        <div className="form-section">
                            <h3><FaPills /> Prescription</h3>
                            <textarea
                                name="prescription"
                                value={notes.prescription}
                                onChange={handleInputChange}
                                placeholder="Enter prescription details..."
                                rows="4"
                            />
                        </div>

                        <div className="form-section">
                            <h3><FaFileAlt /> Treatment Plan</h3>
                            <textarea
                                name="treatment_plan"
                                value={notes.treatment_plan}
                                onChange={handleInputChange}
                                placeholder="Enter treatment plan..."
                                rows="4"
                            />
                        </div>

                        <div className="form-section">
                            <h3><FaCalendar /> Follow-up Date</h3>
                            <input
                                type="date"
                                name="follow_up_date"
                                value={notes.follow_up_date}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-section">
                            <h3><FaFileAlt /> Additional Notes</h3>
                            <textarea
                                name="notes"
                                value={notes.notes}
                                onChange={handleInputChange}
                                placeholder="Enter any additional notes..."
                                rows="4"
                            />
                        </div>

                        {error && <p className="error-message">{error}</p>}
                        {success && <p className="success-message">{success}</p>}

                        <div className="form-actions">
                            <button 
                                type="submit" 
                                className="save-btn"
                                disabled={saving}
                            >
                                <FaSave /> {saving ? 'Saving...' : 'Save Notes'}
                            </button>
                            <button 
                                type="button" 
                                className="cancel-btn"
                                onClick={() => navigate('/doctor-dashboard')}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ConsultationNotes; 