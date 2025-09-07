import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowLeft, FaUserMd, FaCalendarAlt, FaStethoscope, FaChartLine, 
    FaEye, FaEdit, FaToggleOn, FaToggleOff, FaSearch, FaFilter, 
    FaClock, FaCheckCircle, FaTimesCircle, FaUsers, FaDollarSign,
    FaPlus, FaPhone, FaEnvelope, FaMapMarkerAlt, FaStar, FaTrash, FaMoneyBillWave
} from 'react-icons/fa';
import axios from 'axios';
import './DoctorPortal.css';

const DoctorPortal = () => {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [selectedDoctorEarnings, setSelectedDoctorEarnings] = useState(null);
    const [earningsPeriod, setEarningsPeriod] = useState('current_month');
    
    // Schedule management states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedDoctorSchedules, setSelectedDoctorSchedules] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [selectedDoctorName, setSelectedDoctorName] = useState('');
    const [scheduleForm, setScheduleForm] = useState({
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
    });
    const [editingSchedule, setEditingSchedule] = useState(null);
    
    const [filters, setFilters] = useState({
        search: '',
        specialization: '',
        availability: ''
    });

    // Form state for adding new doctor
    const [newDoctor, setNewDoctor] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        specialization: '',
        experience_years: 0,
        consultation_fee: 0,
        is_available: true
    });

    useEffect(() => {
        fetchDoctors();
        fetchStats();
    }, []);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/doctors', {
                headers: { 'x-auth-token': token }
            });
            setDoctors(response.data.doctors);
        } catch (err) {
            setError('Failed to fetch doctors');
            console.error('Error fetching doctors:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/doctors/stats', {
                headers: { 'x-auth-token': token }
            });
            setStats(response.data.stats);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchDoctorDetails = async (doctorId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/auth/admin/doctors/${doctorId}`, {
                headers: { 'x-auth-token': token }
            });
            setSelectedDoctor(response.data.doctor);
            setShowDoctorModal(true);
        } catch (err) {
            setError('Failed to fetch doctor details');
        }
    };

    const toggleDoctorAvailability = async (doctorId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/doctors/${doctorId}/availability`, 
                { is_available: !currentStatus },
                { headers: { 'x-auth-token': token } }
            );
            setSuccess('Doctor availability updated successfully');
            fetchDoctors();
        } catch (err) {
            setError('Failed to update doctor availability');
        }
    };

    const addNewDoctor = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/auth/admin/doctors', newDoctor, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('Doctor added successfully');
            setShowAddModal(false);
            setNewDoctor({
                name: '',
                email: '',
                password: '',
                phone: '',
                address: '',
                specialization: '',
                experience_years: 0,
                consultation_fee: 0,
                is_available: true
            });
            fetchDoctors();
            fetchStats();
        } catch (err) {
            setError('Failed to add new doctor');
        }
    };

    const openEditModal = (doctor) => {
        setEditingDoctor({
            id: doctor.id,
            name: doctor.name || '',
            email: doctor.email || '',
            password: '', // Empty password field for optional update
            phone: doctor.phone || '',
            address: doctor.address || '',
            specialization: doctor.specialization || '',
            experience_years: doctor.experience_years || 0,
            consultation_fee: doctor.consultation_fee || 0,
            is_available: doctor.is_available !== undefined ? doctor.is_available : true
        });
        setShowEditModal(true);
    };

    const updateDoctor = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/doctors/${editingDoctor.id}`, editingDoctor, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('Doctor updated successfully');
            setShowEditModal(false);
            setEditingDoctor(null);
            fetchDoctors();
            fetchStats();
        } catch (err) {
            setError('Failed to update doctor');
        }
    };

    const deleteDoctor = async (doctorId, doctorName) => {
        if (window.confirm(`Are you sure you want to delete Dr. ${doctorName}? This action cannot be undone and will remove all associated data.`)) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5001/api/auth/admin/doctors/${doctorId}`, {
                    headers: { 'x-auth-token': token }
                });
                setSuccess('Doctor deleted successfully');
                fetchDoctors();
                fetchStats();
            } catch (err) {
                setError('Failed to delete doctor');
            }
        }
    };

    const fetchDoctorEarnings = async (doctorId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/auth/admin/doctors/${doctorId}/earnings?period=${earningsPeriod}`, {
                headers: { 'x-auth-token': token }
            });
            setSelectedDoctorEarnings(response.data.earnings);
            setShowEarningsModal(true);
        } catch (err) {
            setError('Failed to fetch doctor earnings');
        }
    };

    // Schedule management functions
    const openScheduleModal = async (doctorId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/auth/admin/doctors/${doctorId}/schedules`, {
                headers: { 'x-auth-token': token }
            });
            
            const doctor = doctors.find(d => d.id === doctorId);
            setSelectedDoctorId(doctorId);
            setSelectedDoctorName(doctor.name);
            setSelectedDoctorSchedules(response.data.schedules);
            setShowScheduleModal(true);
        } catch (err) {
            setError('Failed to fetch doctor schedules');
            console.error('Error fetching schedules:', err);
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            if (editingSchedule) {
                // Update existing schedule
                await axios.put(`http://localhost:5001/api/auth/admin/doctors/${selectedDoctorId}/schedules/${editingSchedule.id}`, scheduleForm, {
                    headers: { 'x-auth-token': token }
                });
                setSuccess('Schedule updated successfully');
            } else {
                // Create new schedule
                await axios.post(`http://localhost:5001/api/auth/admin/doctors/${selectedDoctorId}/schedules`, scheduleForm, {
                    headers: { 'x-auth-token': token }
                });
                setSuccess('Schedule created successfully');
            }
            
            // Refresh schedules
            await openScheduleModal(selectedDoctorId);
            setEditingSchedule(null);
            setScheduleForm({
                day_of_week: 'monday',
                start_time: '09:00',
                end_time: '17:00',
                is_available: true
            });
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to save schedule');
            console.error('Error saving schedule:', err);
        }
    };

    const handleScheduleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setScheduleForm({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_available: schedule.is_available
        });
    };

    const handleScheduleDelete = async (scheduleId) => {
        if (window.confirm('Are you sure you want to delete this schedule?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5001/api/auth/admin/doctors/${selectedDoctorId}/schedules/${scheduleId}`, {
                    headers: { 'x-auth-token': token }
                });
                
                setSuccess('Schedule deleted successfully');
                await openScheduleModal(selectedDoctorId);
            } catch (err) {
                setError('Failed to delete schedule');
                console.error('Error deleting schedule:', err);
            }
        }
    };

    const resetScheduleForm = () => {
        setEditingSchedule(null);
        setScheduleForm({
            day_of_week: 'monday',
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
        });
    };

    const filteredDoctors = doctors.filter(doctor => {
        const matchesSearch = doctor.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                            doctor.email.toLowerCase().includes(filters.search.toLowerCase()) ||
                            doctor.specialization.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesSpecialization = !filters.specialization || 
                                    doctor.specialization.toLowerCase().includes(filters.specialization.toLowerCase());
        
        const matchesAvailability = !filters.availability || 
                                  (filters.availability === 'available' && doctor.is_available) ||
                                  (filters.availability === 'unavailable' && !doctor.is_available);
        
        return matchesSearch && matchesSpecialization && matchesAvailability;
    });

    const specializations = [...new Set(doctors.map(doctor => doctor.specialization))];

    return (
        <div className="doctor-portal-container">
            {/* Header */}
            <div className="management-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin-dashboard')}>
                        <FaArrowLeft />
                        Back to Dashboard
                    </button>
                    <div className="header-title">
                        <FaUserMd className="title-icon" />
                        <div>
                            <h1>Doctor Portal</h1>
                            <div className="doctor-count">
                                {doctors.length} Doctor{doctors.length !== 1 ? 's' : ''} Registered
                            </div>
                        </div>
                    </div>
                </div>
                <button className="add-doctor-btn" onClick={() => setShowAddModal(true)}>
                    <FaPlus />
                    Add New Doctor
                </button>
            </div>

            {/* Error/Success Messages */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Statistics */}
            <div className="stats-section">
                <div className="stat-card">
                    <div className="stat-icon">
                        <FaUserMd />
                    </div>
                    <div className="stat-content">
                        <h3>Total Doctors</h3>
                        <p className="stat-number">{stats.total_doctors || 0}</p>
                    </div>
                </div>
                <div className="stat-card available">
                    <div className="stat-icon">
                        <FaCheckCircle />
                    </div>
                    <div className="stat-content">
                        <h3>Available</h3>
                        <p className="stat-number">{stats.available_doctors || 0}</p>
                    </div>
                </div>
                <div className="stat-card unavailable">
                    <div className="stat-icon">
                        <FaTimesCircle />
                    </div>
                    <div className="stat-content">
                        <h3>Unavailable</h3>
                        <p className="stat-number">{stats.unavailable_doctors || 0}</p>
                    </div>
                </div>
                <div className="stat-card appointments">
                    <div className="stat-icon">
                        <FaCalendarAlt />
                    </div>
                    <div className="stat-content">
                        <h3>Today's Appointments</h3>
                        <p className="stat-number">{stats.todays_appointments || 0}</p>
                    </div>
                </div>
                <div className="stat-card revenue">
                    <div className="stat-icon">
                        <FaDollarSign />
                    </div>
                    <div className="stat-content">
                        <h3>Monthly Revenue</h3>
                        <p className="stat-number">LKR {(parseFloat(stats.monthly_revenue) || 0).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="management-controls">
                <div className="search-filter-section">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search doctors by name, email, or specialization..."
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                        />
                    </div>
                    <div className="filter-section">
                        <select
                            value={filters.specialization}
                            onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                        >
                            <option value="">All Specializations</option>
                            {specializations.map((spec, index) => (
                                <option key={index} value={spec}>{spec}</option>
                            ))}
                        </select>
                        <select
                            value={filters.availability}
                            onChange={(e) => setFilters({...filters, availability: e.target.value})}
                        >
                            <option value="">All Doctors</option>
                            <option value="available">Available Only</option>
                            <option value="unavailable">Unavailable Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Doctors List */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading doctors...</p>
                </div>
            ) : (
                <div className="doctors-grid">
                    {filteredDoctors.map(doctor => (
                        <div key={doctor.id} className="doctor-card">
                            <div className="doctor-header">
                                <div className="doctor-avatar">
                                    <FaUserMd />
                                </div>
                                <div className="doctor-basic-info">
                                    <h3>{doctor.name}</h3>
                                    <p className="specialization">{doctor.specialization}</p>
                                    <p className="experience">{doctor.experience_years} years experience</p>
                                </div>
                                <div className={`availability-badge ${doctor.is_available ? 'available' : 'unavailable'}`}>
                                    {doctor.is_available ? 'Available' : 'Unavailable'}
                                </div>
                            </div>

                            <div className="doctor-details">
                                <div className="detail-item">
                                    <FaEnvelope />
                                    <span>{doctor.email}</span>
                                </div>
                                {doctor.phone && (
                                    <div className="detail-item">
                                        <FaPhone />
                                        <span>{doctor.phone}</span>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <FaDollarSign />
                                    <span>LKR {doctor.consultation_fee}</span>
                                </div>
                            </div>



                            <div className="doctor-actions">
                                <button 
                                    className="action-btn view-btn"
                                    onClick={() => fetchDoctorDetails(doctor.id)}
                                >
                                    <FaEye />
                                    View
                                </button>
                                <button 
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(doctor)}
                                >
                                    <FaEdit />
                                    Edit
                                </button>
                                <button 
                                    className="action-btn schedule-btn"
                                    onClick={() => openScheduleModal(doctor.id)}
                                >
                                    <FaCalendarAlt />
                                    Schedule
                                </button>
                                <button 
                                    className="action-btn earnings-btn"
                                    onClick={() => fetchDoctorEarnings(doctor.id)}
                                >
                                    <FaMoneyBillWave />
                                    Earnings
                                </button>
                                <button 
                                    className={`action-btn toggle-btn ${doctor.is_available ? 'disable' : 'enable'}`}
                                    onClick={() => toggleDoctorAvailability(doctor.id, doctor.is_available)}
                                >
                                    {doctor.is_available ? <FaToggleOff /> : <FaToggleOn />}
                                    {doctor.is_available ? 'Disable' : 'Enable'}
                                </button>
                                <button 
                                    className="action-btn delete-btn"
                                    onClick={() => deleteDoctor(doctor.id, doctor.name)}
                                >
                                    <FaTrash />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Doctor Details Modal */}
            {showDoctorModal && selectedDoctor && (
                <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
                    <div className="modal-content doctor-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Doctor Details</h2>
                            <button className="close-btn" onClick={() => setShowDoctorModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="doctor-profile">
                                <div className="profile-header">
                                    <div className="profile-avatar">
                                        <FaUserMd />
                                    </div>
                                    <div>
                                        <h3>{selectedDoctor.name}</h3>
                                        <p>{selectedDoctor.specialization}</p>
                                        <div className={`status-badge ${selectedDoctor.is_available ? 'available' : 'unavailable'}`}>
                                            {selectedDoctor.is_available ? 'Available' : 'Unavailable'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="profile-details">
                                    <div><strong>Email:</strong> {selectedDoctor.email}</div>
                                    <div><strong>Phone:</strong> {selectedDoctor.phone || 'Not provided'}</div>
                                    <div><strong>Address:</strong> {selectedDoctor.address || 'Not provided'}</div>
                                    <div><strong>Experience:</strong> {selectedDoctor.experience_years} years</div>
                                    <div><strong>Consultation Fee:</strong> LKR {selectedDoctor.consultation_fee}</div>
                                    <div><strong>Total Appointments:</strong> {selectedDoctor.total_appointments || 0}</div>
                                    <div><strong>Total Patients:</strong> {selectedDoctor.total_patients || 0}</div>
                                    <div><strong>Member Since:</strong> {new Date(selectedDoctor.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Doctor Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content add-doctor-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Doctor</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => { e.preventDefault(); addNewDoctor(); }}>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDoctor.name}
                                        onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                                        placeholder="Enter doctor's full name"
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={newDoctor.email}
                                            onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                                            placeholder="doctor@example.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Password *</label>
                                        <input
                                            type="password"
                                            required
                                            value={newDoctor.password}
                                            onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})}
                                            placeholder="Enter secure password"
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="tel"
                                            value={newDoctor.phone}
                                            onChange={(e) => setNewDoctor({...newDoctor, phone: e.target.value})}
                                            placeholder="+94 xxx xxx xxx"
                                        />
                                    </div>
                                    <div className="form-group">
                                        {/* Placeholder for balance */}
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        value={newDoctor.address}
                                        onChange={(e) => setNewDoctor({...newDoctor, address: e.target.value})}
                                        placeholder="Doctor's address"
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Specialization *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newDoctor.specialization}
                                            onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                                            placeholder="e.g., General Medicine, Ayurveda"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Experience (Years)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={newDoctor.experience_years}
                                            onChange={(e) => setNewDoctor({...newDoctor, experience_years: parseInt(e.target.value) || 0})}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Consultation Fee (LKR)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={newDoctor.consultation_fee}
                                            onChange={(e) => setNewDoctor({...newDoctor, consultation_fee: parseFloat(e.target.value) || 0})}
                                            placeholder="1000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={newDoctor.is_available}
                                                onChange={(e) => setNewDoctor({...newDoctor, is_available: e.target.checked})}
                                            />
                                            Available for appointments
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        Add Doctor
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Doctor Modal */}
            {showEditModal && editingDoctor && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content add-doctor-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Doctor</h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => { e.preventDefault(); updateDoctor(); }}>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingDoctor.name}
                                        onChange={(e) => setEditingDoctor({...editingDoctor, name: e.target.value})}
                                        placeholder="Enter doctor's full name"
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={editingDoctor.email}
                                            onChange={(e) => setEditingDoctor({...editingDoctor, email: e.target.value})}
                                            placeholder="doctor@example.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            value={editingDoctor.password}
                                            onChange={(e) => setEditingDoctor({...editingDoctor, password: e.target.value})}
                                            placeholder="Leave empty to keep current password"
                                        />
                                        <small style={{color: '#666', fontSize: '0.8rem', marginTop: '5px', display: 'block'}}>
                                            * Leave empty if you don't want to change the password
                                        </small>
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="tel"
                                            value={editingDoctor.phone}
                                            onChange={(e) => setEditingDoctor({...editingDoctor, phone: e.target.value})}
                                            placeholder="+94 xxx xxx xxx"
                                        />
                                    </div>
                                    <div className="form-group">
                                        {/* Placeholder for balance */}
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        value={editingDoctor.address}
                                        onChange={(e) => setEditingDoctor({...editingDoctor, address: e.target.value})}
                                        placeholder="Doctor's address"
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Specialization *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingDoctor.specialization}
                                            onChange={(e) => setEditingDoctor({...editingDoctor, specialization: e.target.value})}
                                            placeholder="e.g., General Medicine, Ayurveda"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Experience (Years)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingDoctor.experience_years}
                                            onChange={(e) => setEditingDoctor({...editingDoctor, experience_years: parseInt(e.target.value) || 0})}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Consultation Fee (LKR)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingDoctor.consultation_fee}
                                            onChange={(e) => setEditingDoctor({...editingDoctor, consultation_fee: parseFloat(e.target.value) || 0})}
                                            placeholder="1000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={editingDoctor.is_available}
                                                onChange={(e) => setEditingDoctor({...editingDoctor, is_available: e.target.checked})}
                                            />
                                            Available for appointments
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        Update Doctor
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Doctor Earnings Modal */}
            {showEarningsModal && selectedDoctorEarnings && (
                <div className="modal-overlay" onClick={() => setShowEarningsModal(false)}>
                    <div className="modal-content earnings-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Doctor Earnings Report</h2>
                            <button className="close-btn" onClick={() => setShowEarningsModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="earnings-header">
                                <div className="doctor-info">
                                    <h3>{selectedDoctorEarnings.doctor_name}</h3>
                                    <p>{selectedDoctorEarnings.specialization}</p>
                                    <p>Consultation Fee: <strong>LKR {parseFloat(selectedDoctorEarnings.consultation_fee).toFixed(2)}</strong></p>
                                </div>
                                <div className="period-selector">
                                    <label>Period:</label>
                                    <select 
                                        value={earningsPeriod} 
                                        onChange={(e) => {
                                            setEarningsPeriod(e.target.value);
                                            fetchDoctorEarnings(selectedDoctorEarnings.id);
                                        }}
                                    >
                                        <option value="current_month">Current Month</option>
                                        <option value="last_30_days">Last 30 Days</option>
                                        <option value="current_year">Current Year</option>
                                        <option value="all">All Time</option>
                                    </select>
                                </div>
                            </div>

                            <div className="earnings-summary">
                                <div className="earnings-card total">
                                    <FaMoneyBillWave className="earnings-icon" />
                                    <div>
                                        <h4>Total Earnings</h4>
                                        <p className="earnings-amount">LKR {parseFloat(selectedDoctorEarnings.total_earnings).toFixed(2)}</p>
                                    </div>
                                </div>
                                
                                <div className="earnings-stats">
                                    <div className="stat-item">
                                        <FaCheckCircle className="stat-icon completed" />
                                        <div>
                                            <span className="stat-value">{selectedDoctorEarnings.completed_appointments}</span>
                                            <span className="stat-label">Completed</span>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <FaClock className="stat-icon confirmed" />
                                        <div>
                                            <span className="stat-value">{selectedDoctorEarnings.confirmed_appointments}</span>
                                            <span className="stat-label">Confirmed</span>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <FaCalendarAlt className="stat-icon pending" />
                                        <div>
                                            <span className="stat-value">{selectedDoctorEarnings.pending_appointments}</span>
                                            <span className="stat-label">Pending</span>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <FaTimesCircle className="stat-icon cancelled" />
                                        <div>
                                            <span className="stat-value">{selectedDoctorEarnings.cancelled_appointments}</span>
                                            <span className="stat-label">Cancelled</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="earnings-details">
                                <div className="detail-row">
                                    <span>Average per Completed Appointment:</span>
                                    <strong>LKR {parseFloat(selectedDoctorEarnings.consultation_fee).toFixed(2)}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Total Appointments (All Status):</span>
                                    <strong>{selectedDoctorEarnings.completed_appointments + selectedDoctorEarnings.confirmed_appointments + selectedDoctorEarnings.pending_appointments + selectedDoctorEarnings.cancelled_appointments}</strong>
                                </div>
                                {selectedDoctorEarnings.first_appointment && (
                                    <div className="detail-row">
                                        <span>First Appointment:</span>
                                        <strong>{new Date(selectedDoctorEarnings.first_appointment).toLocaleDateString()}</strong>
                                    </div>
                                )}
                                {selectedDoctorEarnings.last_appointment && (
                                    <div className="detail-row">
                                        <span>Last Appointment:</span>
                                        <strong>{new Date(selectedDoctorEarnings.last_appointment).toLocaleDateString()}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Doctor Schedule Management Modal */}
            {showScheduleModal && (
                <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
                    <div className="modal-content schedule-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Manage Schedule - Dr. {selectedDoctorName}</h2>
                            <button className="close-btn" onClick={() => setShowScheduleModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="schedule-section">
                                <h3>Add/Edit Schedule</h3>
                                <form onSubmit={handleScheduleSubmit} className="schedule-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Day of Week *</label>
                                            <select
                                                value={scheduleForm.day_of_week}
                                                onChange={(e) => setScheduleForm({...scheduleForm, day_of_week: e.target.value})}
                                                required
                                            >
                                                <option value="monday">Monday</option>
                                                <option value="tuesday">Tuesday</option>
                                                <option value="wednesday">Wednesday</option>
                                                <option value="thursday">Thursday</option>
                                                <option value="friday">Friday</option>
                                                <option value="saturday">Saturday</option>
                                                <option value="sunday">Sunday</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Start Time *</label>
                                            <input
                                                type="time"
                                                value={scheduleForm.start_time}
                                                onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>End Time *</label>
                                            <input
                                                type="time"
                                                value={scheduleForm.end_time}
                                                onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={scheduleForm.is_available}
                                                    onChange={(e) => setScheduleForm({...scheduleForm, is_available: e.target.checked})}
                                                />
                                                Available
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="cancel-btn" onClick={resetScheduleForm}>
                                            {editingSchedule ? 'Cancel Edit' : 'Reset'}
                                        </button>
                                        <button type="submit" className="submit-btn">
                                            {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="schedule-list-section">
                                <h3>Current Schedules</h3>
                                {selectedDoctorSchedules.length === 0 ? (
                                    <p className="no-schedules">No schedules set for this doctor.</p>
                                ) : (
                                    <div className="schedule-list">
                                        {selectedDoctorSchedules.map(schedule => (
                                            <div key={schedule.id} className="schedule-item">
                                                <div className="schedule-info">
                                                    <div className="day-time">
                                                        <span className="day">{schedule.day_of_week.charAt(0).toUpperCase() + schedule.day_of_week.slice(1)}</span>
                                                        <span className="time">{schedule.start_time} - {schedule.end_time}</span>
                                                    </div>
                                                    <div className={`status-badge ${schedule.is_available ? 'available' : 'unavailable'}`}>
                                                        {schedule.is_available ? 'Available' : 'Unavailable'}
                                                    </div>
                                                </div>
                                                <div className="schedule-actions">
                                                    <button 
                                                        className="edit-btn"
                                                        onClick={() => handleScheduleEdit(schedule)}
                                                    >
                                                        <FaEdit />
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className="delete-btn"
                                                        onClick={() => handleScheduleDelete(schedule.id)}
                                                    >
                                                        <FaTrash />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorPortal;

