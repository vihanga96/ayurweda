import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaClock, FaCalendar, FaCheck, FaTimes, FaUserMd } from 'react-icons/fa';
import axios from 'axios';
import './DoctorSchedule.css';

const DoctorSchedule = () => {
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const daysOfWeek = [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
    ];

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            const response = await axios.get('http://localhost:5001/api/doctors/schedule', { headers });
            setSchedule(response.data.schedule);
        } catch (err) {
            setError('Failed to fetch schedule');
            console.error('Error fetching schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleUpdate = async (scheduleId, updates) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            await axios.put(`http://localhost:5001/api/doctors/schedule/${scheduleId}`, updates, { headers });
            
            // Update local state
            setSchedule(prev => 
                prev.map(item => 
                    item.id === scheduleId 
                        ? { ...item, ...updates }
                        : item
                )
            );
            
            setSuccess('Schedule updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update schedule');
            console.error('Error updating schedule:', err);
        }
    };

    const getScheduleForDay = (dayKey) => {
        return schedule.find(item => item.day_of_week === dayKey) || {
            id: null,
            day_of_week: dayKey,
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
        };
    };

    const handleTimeChange = (dayKey, field, value) => {
        const daySchedule = getScheduleForDay(dayKey);
        if (daySchedule.id) {
            handleScheduleUpdate(daySchedule.id, { [field]: value });
        } else {
            // Create new schedule entry
            createScheduleEntry(dayKey, { [field]: value });
        }
    };

    const handleAvailabilityChange = (dayKey, isAvailable) => {
        const daySchedule = getScheduleForDay(dayKey);
        if (daySchedule.id) {
            handleScheduleUpdate(daySchedule.id, { is_available: isAvailable });
        } else {
            // Create new schedule entry
            createScheduleEntry(dayKey, { is_available: isAvailable });
        }
    };

    const createScheduleEntry = async (dayKey, updates) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            const scheduleData = {
                day_of_week: dayKey,
                start_time: '09:00',
                end_time: '17:00',
                is_available: true,
                ...updates
            };

            const response = await axios.post('http://localhost:5001/api/doctors/schedule', scheduleData, { headers });
            
            // Refresh the schedule to get the new entry
            await fetchSchedule();
            
            setSuccess('Schedule created successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to create schedule entry');
            console.error('Error creating schedule:', err);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading schedule...</p>
            </div>
        );
    }

    return (
        <div className="doctor-schedule-container">
            <header className="schedule-header">
                <div className="header-content">
                    <button onClick={() => navigate('/doctor-dashboard')} className="back-btn">
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="header-brand">
                        <FaCalendar className="header-logo" />
                        <h1>Manage Schedule</h1>
                    </div>
                </div>
            </header>

            <main className="schedule-main">
                <div className="schedule-content">
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    <div className="schedule-info">
                        <h2>Weekly Schedule</h2>
                        <p>Set your availability for each day of the week. Patients will only be able to book appointments during your available hours.</p>
                    </div>

                    <div className="schedule-grid">
                        {daysOfWeek.map(day => {
                            const daySchedule = getScheduleForDay(day.key);
                            return (
                                <div key={day.key} className={`schedule-day ${!daySchedule.is_available ? 'unavailable' : ''}`}>
                                    <div className="day-header">
                                        <h3>{day.label}</h3>
                                        <div className="availability-toggle">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={daySchedule.is_available}
                                                    onChange={(e) => handleAvailabilityChange(day.key, e.target.checked)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                            <span className="availability-label">
                                                {daySchedule.is_available ? 'Available' : 'Unavailable'}
                                            </span>
                                        </div>
                                    </div>

                                    {daySchedule.is_available && (
                                        <div className="time-slots">
                                            <div className="time-slot">
                                                <label>
                                                    <FaClock className="time-icon" />
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={daySchedule.start_time}
                                                    onChange={(e) => handleTimeChange(day.key, 'start_time', e.target.value)}
                                                    className="time-input"
                                                />
                                            </div>
                                            <div className="time-slot">
                                                <label>
                                                    <FaClock className="time-icon" />
                                                    End Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={daySchedule.end_time}
                                                    onChange={(e) => handleTimeChange(day.key, 'end_time', e.target.value)}
                                                    className="time-input"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!daySchedule.is_available && (
                                        <div className="unavailable-message">
                                            <FaTimes className="unavailable-icon" />
                                            <span>Not Available</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="schedule-actions">
                        <button onClick={() => navigate('/doctor-dashboard')} className="action-btn secondary">
                            <FaArrowLeft /> Back to Dashboard
                        </button>
                        <button onClick={fetchSchedule} className="action-btn">
                            <FaSave /> Refresh Schedule
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DoctorSchedule; 