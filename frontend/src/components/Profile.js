import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaSave, FaArrowLeft, FaKey, FaUserMd, FaGraduationCap, FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const [doctorDetails, setDoctorDetails] = useState({
        specialization: '',
        experience_years: 0,
        consultation_fee: 0,
        bio: '',
        qualifications: '',
        is_available: true
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            // Use general profile endpoint for all users
            const response = await axios.get('http://localhost:5001/api/auth/profile', { headers });
            setProfile({
                name: response.data.user.name,
                email: response.data.user.email,
                phone: response.data.user.phone || '',
                address: response.data.user.address || ''
            });

            // If user is a doctor, fetch doctor-specific details
            if (userRole === 'doctor') {
                try {
                    const doctorResponse = await axios.get('http://localhost:5001/api/doctors/profile', { headers });
                    setDoctorDetails({
                        specialization: doctorResponse.data.doctor.specialization || 'Not specified',
                        experience_years: doctorResponse.data.doctor.experience_years || 0,
                        consultation_fee: doctorResponse.data.doctor.consultation_fee || 0,
                        bio: doctorResponse.data.doctor.bio || '',
                        qualifications: doctorResponse.data.doctor.qualifications || '',
                        is_available: doctorResponse.data.doctor.is_available !== undefined ? doctorResponse.data.doctor.is_available : true
                    });
                } catch (doctorErr) {
                    console.log('Could not fetch doctor details:', doctorErr);
                    // Set default values if doctor details can't be fetched
                    setDoctorDetails({
                        specialization: 'Not specified',
                        experience_years: 0,
                        consultation_fee: 0,
                        bio: '',
                        qualifications: '',
                        is_available: true
                    });
                }
            }
        } catch (err) {
            setError('Failed to fetch profile data');
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            // Use general profile endpoint for all users
            await axios.put('http://localhost:5001/api/auth/profile', profile, { headers });

            setSuccess('Profile updated successfully!');
            localStorage.setItem('userName', profile.name);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to update profile');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5001/api/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, { headers: { 'x-auth-token': token } });

            setSuccess('Password changed successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordForm(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to change password');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleInputChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handlePasswordInputChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const getBackRoute = () => {
        switch (userRole) {
            case 'admin': return '/admin-dashboard';
            case 'doctor': return '/doctor-dashboard';
            case 'patient': return '/patient-dashboard';
            case 'student': return '/student-dashboard';
            default: return '/home';
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <header className="profile-header">
                <div className="header-content">
                    <button onClick={() => navigate(getBackRoute())} className="back-btn">
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <h1>Profile Management</h1>
                </div>
            </header>

            <main className="profile-main">
                <div className="profile-content">
                    <div className="profile-section">
                        <h2>Personal Information</h2>
                        {error && <p className="error-message">{error}</p>}
                        {success && <p className="success-message">{success}</p>}
                        
                        <form onSubmit={handleProfileUpdate} className="profile-form">
                            <div className="form-group">
                                <label>
                                    <FaUser className="input-icon" />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profile.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
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
                                    name="email"
                                    value={profile.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <FaPhone className="input-icon" />
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <FaMapMarkerAlt className="input-icon" />
                                    Address
                                </label>
                                <textarea
                                    name="address"
                                    value={profile.address}
                                    onChange={handleInputChange}
                                    placeholder="Enter your address"
                                    rows="3"
                                />
                            </div>

                            <button type="submit" className="save-btn">
                                <FaSave /> Save Changes
                            </button>
                        </form>
                    </div>

                    {userRole === 'doctor' && (
                        <div className="profile-section">
                            <h2>Professional Information</h2>
                            <div className="doctor-details">
                                <div className="detail-row">
                                    <div className="detail-item">
                                        <label><FaUserMd className="detail-icon" /> Specialization</label>
                                        <span className="detail-value">{doctorDetails.specialization}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label><FaClock className="detail-icon" /> Experience (Years)</label>
                                        <span className="detail-value">{doctorDetails.experience_years} years</span>
                                    </div>
                                </div>
                                
                                <div className="detail-row">
                                    <div className="detail-item">
                                        <label><FaMoneyBillWave className="detail-icon" /> Consultation Fee</label>
                                        <span className="detail-value fee-amount">LKR {doctorDetails.consultation_fee.toLocaleString()}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label><FaCheckCircle className="detail-icon" /> Availability</label>
                                        <span className={`detail-value ${doctorDetails.is_available ? 'available' : 'unavailable'}`}>
                                            {doctorDetails.is_available ? (
                                                <>
                                                    <FaCheckCircle className="status-icon" />
                                                    Available
                                                </>
                                            ) : (
                                                <>
                                                    <FaTimesCircle className="status-icon" />
                                                    Unavailable
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {doctorDetails.qualifications && (
                                    <div className="detail-item full-width">
                                        <label><FaGraduationCap className="detail-icon" /> Qualifications</label>
                                        <span className="detail-value">{doctorDetails.qualifications}</span>
                                    </div>
                                )}

                                {doctorDetails.bio && (
                                    <div className="detail-item full-width">
                                        <label><FaUserMd className="detail-icon" /> Bio</label>
                                        <span className="detail-value bio-text">{doctorDetails.bio}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="profile-section">
                        <div className="section-header">
                            <h2>Security</h2>
                            <button 
                                onClick={() => setShowPasswordForm(!showPasswordForm)}
                                className="toggle-btn"
                            >
                                <FaKey /> {showPasswordForm ? 'Cancel' : 'Change Password'}
                            </button>
                        </div>

                        {showPasswordForm && (
                            <form onSubmit={handlePasswordChange} className="password-form">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Enter current password"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>

                                <button type="submit" className="save-btn">
                                    <FaKey /> Change Password
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile; 