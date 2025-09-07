import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FaGraduationCap, FaClipboardList, 
    FaCalendarAlt, FaUserGraduate, FaSearch,
    FaClock, FaCheckCircle, FaTimes, FaExclamationTriangle
} from 'react-icons/fa';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const navigate = useNavigate();

    const [recentApplications, setRecentApplications] = useState([]);

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
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };



            // Fetch recent applications
            try {
                const applicationsResponse = await axios.get('http://localhost:5001/api/students/application-status', { headers });
                setRecentApplications(applicationsResponse.data.applications.slice(0, 3));
            } catch (error) {
                console.error('Error fetching applications:', error);
            }



            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <div className="loading">Loading student dashboard...</div>;
    }

    return (
        <div className="student-dashboard">
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="welcome-section">
                        <h1><FaUserGraduate /> Student Portal</h1>
                        <p>Welcome back! Manage your academic journey.</p>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>



            {/* Main Navigation Cards */}
            <div className="navigation-grid">
                <div className="nav-card" onClick={() => navigate('/student/courses')}>
                    <div className="nav-icon">
                        <FaSearch />
                    </div>
                    <div className="nav-content">
                        <h3>Browse Courses</h3>
                        <p>Explore available courses and programs</p>
                    </div>
                </div>



                <div className="nav-card" onClick={() => navigate('/student/applications')}>
                    <div className="nav-icon">
                        <FaGraduationCap />
                    </div>
                    <div className="nav-content">
                        <h3>My Applications</h3>
                        <p>Track your application status</p>
                    </div>
                </div>



                <div className="nav-card" onClick={() => navigate('/profile')}>
                    <div className="nav-icon">
                        <FaUserGraduate />
                    </div>
                    <div className="nav-content">
                        <h3>My Profile</h3>
                        <p>Update your personal information</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="activity-section">
                <div className="activity-column">
                    <div className="activity-card">
                        <div className="activity-header">
                            <h3><FaClipboardList /> Recent Applications</h3>
                            <button 
                                className="view-all-btn"
                                onClick={() => navigate('/student/applications')}
                            >
                                View All
                            </button>
                        </div>
                        <div className="activity-content">
                            {recentApplications.length > 0 ? (
                                recentApplications.map(application => {
                                    const StatusIcon = statusIcons[application.status];
                                    return (
                                        <div key={application.id} className="activity-item">
                                            <div className="activity-info">
                                                <h4>{application.course_name}</h4>
                                                <p>Applied on {formatDate(application.created_at)}</p>
                                            </div>
                                            <div 
                                                className={`status-badge ${application.status}`}
                                                style={{ backgroundColor: statusColors[application.status] }}
                                            >
                                                <StatusIcon />
                                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="no-activity">
                                    <p>No applications yet</p>
                                    <button 
                                        className="cta-btn"
                                        onClick={() => navigate('/student/courses')}
                                    >
                                        Browse Courses
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


            </div>


        </div>
    );
};

export default StudentDashboard;