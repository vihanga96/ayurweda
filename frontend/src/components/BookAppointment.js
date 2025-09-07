import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCalendar, FaClock, FaUserMd, FaArrowLeft, FaCheck } from 'react-icons/fa';
import './BookAppointment.css';

const BookAppointment = () => {
    const { doctorId } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [consultationType, setConsultationType] = useState('in-person');
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchDoctorDetails();
    }, [doctorId]);

    useEffect(() => {
        if (selectedDate) {
            fetchAvailableSlots();
        }
    }, [selectedDate]);

    const fetchDoctorDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/appointments/doctors/${doctorId}`, {
                headers: { 'x-auth-token': token }
            });
            setDoctor(response.data.doctor);
        } catch (err) {
            setError('Failed to fetch doctor details.');
            console.error('Error fetching doctor:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableSlots = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/appointments/doctors/${doctorId}/available-slots?date=${selectedDate}`, {
                headers: { 'x-auth-token': token }
            });
            console.log('Available slots received:', response.data.availableSlots);
            setAvailableSlots(response.data.availableSlots);
        } catch (err) {
            setError('Failed to fetch available time slots.');
            console.error('Error fetching slots:', err);
        }
    };

    const handleDateChange = (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        setSelectedTime('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedDate || !selectedTime) {
            setError('Please select both date and time.');
            return;
        }

        setBooking(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5001/api/appointments/book', {
                doctorId: parseInt(doctorId),
                appointmentDate: selectedDate,
                appointmentTime: selectedTime,
                consultationType,
                symptoms
            }, {
                headers: { 'x-auth-token': token }
            });

            setSuccess('Appointment booked successfully!');
            setTimeout(() => {
                navigate('/my-appointments');
            }, 2000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.msg) {
                setError(err.response.data.msg);
            } else {
                setError('Failed to book appointment. Please try again.');
            }
        } finally {
            setBooking(false);
        }
    };

    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getMaxDate = () => {
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 2); // Allow booking up to 2 months ahead
        return maxDate.toISOString().split('T')[0];
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading doctor details...</p>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="error-container">
                <p>Doctor not found.</p>
                <button onClick={() => navigate('/doctors')} className="back-btn">
                    <FaArrowLeft /> Back to Doctors
                </button>
            </div>
        );
    }

    return (
        <div className="book-appointment-container">
            <div className="book-appointment-header">
                <button onClick={() => navigate('/doctors')} className="back-btn">
                    <FaArrowLeft /> Back to Doctors
                </button>
                <h1>Book Appointment</h1>
            </div>

            <div className="book-appointment-content">
                <div className="doctor-summary">
                    <div className="doctor-avatar">
                        <FaUserMd />
                    </div>
                    <div className="doctor-info">
                        <h2>{doctor.name}</h2>
                        <p className="specialization">{doctor.specialization}</p>
                        <p className="fee">Consultation Fee: LKR {doctor.consultation_fee.toLocaleString()}</p>
                    </div>
                </div>

                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}

                <form onSubmit={handleSubmit} className="booking-form">
                    <div className="form-group">
                        <label>
                            <FaCalendar /> Appointment Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            min={getMinDate()}
                            max={getMaxDate()}
                            required
                        />
                    </div>

                    {selectedDate && (
                        <div className="form-group">
                            <label>
                                <FaClock /> Available Time Slots
                            </label>
                            <div className="time-slots">
                                {console.log('Rendering slots:', availableSlots)}
                                {availableSlots.length > 0 ? (
                                    availableSlots.map(slot => (
                                        <button
                                            key={slot}
                                            type="button"
                                            className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                                            onClick={() => setSelectedTime(slot)}
                                        >
                                            {slot}
                                        </button>
                                    ))
                                ) : (
                                    <p className="no-slots">No available slots for this date.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Consultation Type</label>
                        <select
                            value={consultationType}
                            onChange={(e) => setConsultationType(e.target.value)}
                            required
                        >
                            <option value="in-person">In-Person</option>
                            <option value="video">Video Call</option>
                            <option value="phone">Phone Call</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Symptoms/Reason for Visit</label>
                        <textarea
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            placeholder="Please describe your symptoms or reason for the appointment..."
                            rows="4"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="book-btn"
                        disabled={booking || !selectedDate || !selectedTime}
                    >
                        {booking ? 'Booking...' : 'Book Appointment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookAppointment; 