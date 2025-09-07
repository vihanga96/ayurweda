import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserMd, FaStar, FaCalendar, FaArrowLeft, FaLeaf, FaClock, FaMoneyBillWave, FaFilter } from 'react-icons/fa';
import './DoctorList.css';

const DoctorList = () => {
    const [doctors, setDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    const [selectedSpecialization, setSelectedSpecialization] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/appointments/doctors', {
                headers: { 'x-auth-token': token }
            });
            const doctorsData = response.data.doctors;
            console.log('Fetched doctors data:', doctorsData);
            setDoctors(doctorsData);
            setFilteredDoctors(doctorsData);
            
            // Extract unique specializations
            const uniqueSpecializations = [...new Set(doctorsData.map(doctor => doctor.specialization))];
            console.log('Extracted specializations:', uniqueSpecializations);
            setSpecializations(uniqueSpecializations);
        } catch (err) {
            setError('Failed to fetch doctors. Please try again.');
            console.error('Error fetching doctors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDoctorSelect = (doctorId) => {
        navigate(`/book-appointment/${doctorId}`);
    };

    const handleSpecializationFilter = (specialization) => {
        setSelectedSpecialization(specialization);
        if (specialization === 'all') {
            setFilteredDoctors(doctors);
        } else {
            const filtered = doctors.filter(doctor => doctor.specialization === specialization);
            setFilteredDoctors(filtered);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading doctors...</p>
            </div>
        );
    }

    return (
        <div className="doctor-list-container">
            <div className="doctor-list-header">
                <button onClick={() => navigate('/patient-dashboard')} className="back-btn">
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <div className="header-content">
                    <FaLeaf className="header-icon" />
                    <h1>Available Ayurvedic Doctors</h1>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}

            <div className="doctor-list-content">
                {/* Specialization Sidebar */}
                <div className="specialization-sidebar">
                    <div className="sidebar-header">
                        <FaFilter className="filter-icon" />
                        <h3>Filter by Specialization</h3>
                    </div>
                    <div className="specialization-list">
                        <button 
                            className={`specialization-item ${selectedSpecialization === 'all' ? 'active' : ''}`}
                            onClick={() => handleSpecializationFilter('all')}
                        >
                            <span className="specialization-name">All Specializations</span>
                            <span className="doctor-count">({doctors.length})</span>
                        </button>
                        {specializations.length > 0 ? (
                            specializations.map(specialization => {
                                const count = doctors.filter(doctor => doctor.specialization === specialization).length;
                                return (
                                    <button 
                                        key={specialization}
                                        className={`specialization-item ${selectedSpecialization === specialization ? 'active' : ''}`}
                                        onClick={() => handleSpecializationFilter(specialization)}
                                    >
                                        <span className="specialization-name">{specialization}</span>
                                        <span className="doctor-count">({count})</span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="no-specializations">
                                <p>No specializations found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Doctors Grid */}
                <div className="doctors-main-content">
                    <div className="doctors-grid">
                        {filteredDoctors.map(doctor => (
                            <div key={doctor.id} className="doctor-card" onClick={() => handleDoctorSelect(doctor.id)}>
                                <div className="doctor-header">
                                    <div className="doctor-avatar">
                                        <FaUserMd />
                                    </div>
                                    <div className="doctor-basic-info">
                                        <h3 className="doctor-name">{doctor.name}</h3>
                                        <p className="doctor-specialization">{doctor.specialization}</p>
                                    </div>
                                </div>
                                
                                <div className="doctor-details">
                                    <div className="detail-item">
                                        <FaStar className="detail-icon" />
                                        <span>{doctor.experience_years} years experience</span>
                                    </div>
                                    <div className="detail-item">
                                        <FaMoneyBillWave className="detail-icon" />
                                        <span>LKR {doctor.consultation_fee.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                <button className="book-appointment-btn">
                                    <FaCalendar />
                                    <span>Book Appointment</span>
                                </button>
                            </div>
                        ))}
                    </div>

                    {filteredDoctors.length === 0 && !loading && (
                        <div className="no-doctors">
                            <FaUserMd className="no-doctors-icon" />
                            <h3>No Doctors Available</h3>
                            <p>No doctors found for the selected specialization.</p>
                            <p>Try selecting a different specialization or check back later.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorList; 