import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileUpload, FaEye, FaCheckCircle, FaExclamationTriangle, FaPills, FaUserMd } from 'react-icons/fa';
import axios from 'axios';
import './PrescriptionOrder.css';

const PrescriptionOrder = () => {
    const navigate = useNavigate();
    const [prescriptions, setPrescriptions] = useState([]);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [prescriptionDetails, setPrescriptionDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPrescriptionDetails, setShowPrescriptionDetails] = useState(false);

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/medicine/prescriptions', {
                headers: { 'x-auth-token': token }
            });
            setPrescriptions(response.data.prescriptions);
        } catch (err) {
            setError('Failed to fetch prescriptions');
            console.error('Error fetching prescriptions:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrescriptionDetails = async (prescriptionId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/medicine/prescriptions/${prescriptionId}`, {
                headers: { 'x-auth-token': token }
            });
            setPrescriptionDetails(response.data.prescription);
            setShowPrescriptionDetails(true);
        } catch (err) {
            setError('Failed to fetch prescription details');
            console.error('Error fetching prescription details:', err);
        }
    };

    const handlePrescriptionSelect = (prescription) => {
        setSelectedPrescription(prescription);
        // Parse medicines from prescription and add to cart
        const medicines = parseMedicinesFromPrescription(prescription);
        navigate('/medicine-catalog', { 
            state: { 
                prescriptionMedicines: medicines,
                prescriptionId: prescription.id 
            } 
        });
    };

    const parseMedicinesFromPrescription = (prescription) => {
        // This is a simplified parser - in a real system, you'd have structured data
        const medicines = [];
        if (prescription.medicines_prescribed) {
            const medicineList = prescription.medicines_prescribed.split(',').map(med => med.trim());
            medicineList.forEach((medicine, index) => {
                medicines.push({
                    name: medicine,
                    quantity: 1,
                    prescription_required: true,
                    prescription_id: prescription.id
                });
            });
        }
        return medicines;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading your prescriptions...</p>
            </div>
        );
    }

    return (
        <div className="prescription-order-container">
            <div className="prescription-header">
                <button className="back-btn" onClick={() => navigate('/patient-dashboard')}>
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <h1>Prescription-Based Orders</h1>
            </div>

            {error && (
                <div className="error-message">
                    <FaExclamationTriangle />
                    {error}
                </div>
            )}

            <div className="prescription-info">
                <div className="info-card">
                    <FaUserMd />
                    <h3>How it works</h3>
                    <p>Select a prescription from your medical records to order the prescribed medicines. Our system will help you find the exact Ayurvedic medicines recommended by your doctor.</p>
                </div>
            </div>

            <div className="prescriptions-section">
                <h2>Your Prescriptions</h2>
                {prescriptions.length === 0 ? (
                    <div className="no-prescriptions">
                        <FaPills />
                        <h3>No prescriptions found</h3>
                        <p>You don't have any active prescriptions. Please visit a doctor to get a prescription.</p>
                        <button onClick={() => navigate('/doctors')}>
                            Find a Doctor
                        </button>
                    </div>
                ) : (
                    <div className="prescriptions-grid">
                        {prescriptions.map(prescription => (
                            <div key={prescription.id} className="prescription-card">
                                <div className="prescription-header">
                                    <div className="prescription-info">
                                        <h3>Prescription #{prescription.id}</h3>
                                        <p className="prescription-date">
                                            <strong>Date:</strong> {formatDate(prescription.prescription_date)}
                                        </p>
                                        {prescription.doctor_name && (
                                            <p className="doctor-name">
                                                <strong>Doctor:</strong> {prescription.doctor_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="prescription-status">
                                        <FaCheckCircle className="status-icon active" />
                                        <span className="status-text">Active</span>
                                    </div>
                                </div>
                                
                                {prescription.diagnosis && (
                                    <div className="diagnosis-section">
                                        <h4>Diagnosis</h4>
                                        <p>{prescription.diagnosis}</p>
                                    </div>
                                )}
                                
                                {prescription.medicines_prescribed && (
                                    <div className="medicines-section">
                                        <h4>Prescribed Medicines</h4>
                                        <p>{prescription.medicines_prescribed}</p>
                                    </div>
                                )}
                                
                                {prescription.dosage_instructions && (
                                    <div className="dosage-section">
                                        <h4>Dosage Instructions</h4>
                                        <p>{prescription.dosage_instructions}</p>
                                    </div>
                                )}
                                
                                <div className="prescription-actions">
                                    <button 
                                        className="view-details-btn"
                                        onClick={() => fetchPrescriptionDetails(prescription.id)}
                                    >
                                        <FaEye /> View Details
                                    </button>
                                    <button 
                                        className="order-medicines-btn"
                                        onClick={() => handlePrescriptionSelect(prescription)}
                                    >
                                        <FaPills /> Order Medicines
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Prescription Details Modal */}
            {showPrescriptionDetails && prescriptionDetails && (
                <div className="modal-overlay" onClick={() => setShowPrescriptionDetails(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Prescription Details</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowPrescriptionDetails(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="prescription-details">
                            <div className="detail-section">
                                <h3>Prescription Information</h3>
                                <p><strong>Prescription ID:</strong> #{prescriptionDetails.id}</p>
                                <p><strong>Date:</strong> {formatDate(prescriptionDetails.prescription_date)}</p>
                                {prescriptionDetails.doctor_name && (
                                    <p><strong>Doctor:</strong> {prescriptionDetails.doctor_name}</p>
                                )}
                                <p><strong>Status:</strong> 
                                    <span className="status-active">Active</span>
                                </p>
                            </div>

                            {prescriptionDetails.diagnosis && (
                                <div className="detail-section">
                                    <h3>Diagnosis</h3>
                                    <p>{prescriptionDetails.diagnosis}</p>
                                </div>
                            )}

                            {prescriptionDetails.medicines_prescribed && (
                                <div className="detail-section">
                                    <h3>Prescribed Medicines</h3>
                                    <p>{prescriptionDetails.medicines_prescribed}</p>
                                </div>
                            )}

                            {prescriptionDetails.dosage_instructions && (
                                <div className="detail-section">
                                    <h3>Dosage Instructions</h3>
                                    <p>{prescriptionDetails.dosage_instructions}</p>
                                </div>
                            )}

                            {prescriptionDetails.duration && (
                                <div className="detail-section">
                                    <h3>Duration</h3>
                                    <p>{prescriptionDetails.duration}</p>
                                </div>
                            )}

                            {prescriptionDetails.notes && (
                                <div className="detail-section">
                                    <h3>Additional Notes</h3>
                                    <p>{prescriptionDetails.notes}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                className="order-medicines-btn"
                                onClick={() => {
                                    setShowPrescriptionDetails(false);
                                    handlePrescriptionSelect(prescriptionDetails);
                                }}
                            >
                                <FaPills /> Order Medicines
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrescriptionOrder; 