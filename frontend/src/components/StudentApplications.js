import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowLeft, FaClipboardList, FaClock, FaCheckCircle, 
    FaTimes, FaExclamationTriangle, FaCalendarAlt, FaBook, FaSearch
} from 'react-icons/fa';
import './StudentApplications.css';

const StudentApplications = () => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    const statusIcons = {
        pending: FaClock,
        approved: FaCheckCircle,
        rejected: FaTimes,
        waitlisted: FaExclamationTriangle
    };

    const statusColors = {
        pending: '#ffc107',
        approved: '#28a745',
        rejected: '#dc3545',
        waitlisted: '#17a2b8'
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/students/application-status', {
                headers: { 'x-auth-token': token }
            });
            setApplications(response.data.applications);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching applications:', error);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusText = (status) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (loading) {
        return <div className="loading">Loading applications...</div>;
    }

    return (
        <div className="student-applications">
            <div className="applications-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/student-dashboard')}>
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="header-title">
                        <h1><FaClipboardList /> My Applications</h1>
                        <span className="applications-count">{applications.length} total applications</span>
                    </div>
                </div>
                <button 
                    className="browse-courses-btn"
                    onClick={() => navigate('/student/courses')}
                    title="Browse Courses"
                >
                    <FaSearch />
                </button>
            </div>

            <div className="applications-content">
                {applications.length > 0 ? (
                    <div className="applications-grid">
                        {applications.map(application => {
                            const StatusIcon = statusIcons[application.status];
                            return (
                                <div key={application.id} className="application-card">
                                    <div className="application-header">
                                        <div className="course-info">
                                            <h3>{application.course_name}</h3>
                                            <p className="course-description">
                                                {application.course_description ? 
                                                    `${application.course_description.substring(0, 100)}...` : 
                                                    'No description available'
                                                }
                                            </p>
                                        </div>
                                        <div 
                                            className={`status-badge ${application.status}`}
                                            style={{ backgroundColor: statusColors[application.status] }}
                                        >
                                            <StatusIcon />
                                            {getStatusText(application.status)}
                                        </div>
                                    </div>

                                    <div className="application-details">
                                        <div className="detail-row">
                                            <div className="detail-item">
                                                <FaCalendarAlt />
                                                <div>
                                                    <strong>Applied On</strong>
                                                    <span>{formatDate(application.created_at)}</span>
                                                </div>
                                            </div>
                                            {application.reviewed_at && (
                                                <div className="detail-item">
                                                    <FaCheckCircle />
                                                    <div>
                                                        <strong>Reviewed On</strong>
                                                        <span>{formatDate(application.reviewed_at)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {application.personal_statement && (
                                            <div className="personal-statement">
                                                <h4>Personal Statement</h4>
                                                <p>{application.personal_statement}</p>
                                            </div>
                                        )}

                                        {application.admin_notes && (
                                            <div className="admin-notes">
                                                <h4>Admin Notes</h4>
                                                <p>{application.admin_notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="no-applications">
                        <FaBook />
                        <h3>No Applications Yet</h3>
                        <p>You haven't applied to any courses yet. Start browsing courses to submit your first application!</p>
                        <button 
                            className="cta-btn"
                            onClick={() => navigate('/student/courses')}
                        >
                            <FaSearch /> Browse Courses
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentApplications;
