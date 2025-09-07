import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FaClipboardList, FaUser, FaGraduationCap, FaCalendarAlt,
    FaFilter, FaSearch, FaEye, FaCheck, FaTimes, FaClock,
    FaExclamationTriangle, FaChartLine, FaUsers, FaFileAlt
} from 'react-icons/fa';
import './ApplicationManagement.css';

const ApplicationManagement = () => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({});
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        course_id: '',
        page: 1
    });

    const statusColors = {
        pending: '#ffc107',
        approved: '#28a745',
        rejected: '#dc3545',
        waitlisted: '#17a2b8'
    };

    const statusIcons = {
        pending: FaClock,
        approved: FaCheck,
        rejected: FaTimes,
        waitlisted: FaExclamationTriangle
    };

    useEffect(() => {
        fetchApplications();
        fetchStats();
        fetchCourses();
    }, [filters]);

    const fetchApplications = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            
            if (filters.status) params.append('status', filters.status);
            if (filters.course_id) params.append('course_id', filters.course_id);
            params.append('page', filters.page);
            params.append('limit', 20);

            const response = await axios.get(`http://localhost:5001/api/auth/admin/applications?${params}`, {
                headers: { 'x-auth-token': token }
            });
            setApplications(response.data.applications);
        } catch (error) {
            console.error('Error fetching applications:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/applications/stats', {
                headers: { 'x-auth-token': token }
            });
            setStats(response.data.stats);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/courses', {
                headers: { 'x-auth-token': token }
            });
            setCourses(response.data.courses);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const updateApplicationStatus = async (applicationId, status, adminNotes = '') => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/applications/${applicationId}`, {
                status,
                admin_notes: adminNotes
            }, {
                headers: { 'x-auth-token': token }
            });
            
            fetchApplications();
            fetchStats();
            setShowDetailModal(false);
        } catch (error) {
            console.error('Error updating application:', error);
            alert('Error updating application: ' + (error.response?.data?.msg || 'Unknown error'));
        }
    };

    const openDetailModal = (application) => {
        setSelectedApplication(application);
        setShowDetailModal(true);
    };

    const filteredApplications = applications.filter(app => {
        const matchesSearch = app.student_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                            app.student_email.toLowerCase().includes(filters.search.toLowerCase()) ||
                            app.course_name.toLowerCase().includes(filters.search.toLowerCase());
        return matchesSearch;
    });

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <div className="loading">Loading application management...</div>;
    }

    return (
        <div className="application-management">
            <div className="management-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin-dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <div className="header-title">
                        <h1><FaClipboardList /> Application Management</h1>
                        <span className="application-count">{applications.length} Applications</span>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <FaFileAlt className="stat-icon" />
                    <div className="stat-content">
                        <h3>{stats.total_applications || 0}</h3>
                        <p>Total Applications</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaClock className="stat-icon pending" />
                    <div className="stat-content">
                        <h3>{stats.pending_applications || 0}</h3>
                        <p>Pending Review</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaCheck className="stat-icon approved" />
                    <div className="stat-content">
                        <h3>{stats.approved_applications || 0}</h3>
                        <p>Approved</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaTimes className="stat-icon rejected" />
                    <div className="stat-content">
                        <h3>{stats.rejected_applications || 0}</h3>
                        <p>Rejected</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaExclamationTriangle className="stat-icon waitlisted" />
                    <div className="stat-content">
                        <h3>{stats.waitlisted_applications || 0}</h3>
                        <p>Waitlisted</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filter-group">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Search by student name, email, or course..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                </div>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="waitlisted">Waitlisted</option>
                </select>

                <select
                    value={filters.course_id}
                    onChange={(e) => setFilters({...filters, course_id: e.target.value})}
                >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                </select>
            </div>

            {/* Applications Table */}
            <div className="applications-container">
                <div className="applications-table">
                    <div className="table-header">
                        <div className="header-cell">Student</div>
                        <div className="header-cell">Course</div>
                        <div className="header-cell">Status</div>
                        <div className="header-cell">Applied Date</div>
                        <div className="header-cell">Reviewer</div>
                        <div className="header-cell">Actions</div>
                    </div>

                    {filteredApplications.map(application => {
                        const StatusIcon = statusIcons[application.status];
                        return (
                            <div key={application.id} className="table-row">
                                <div className="table-cell student-info">
                                    <div className="student-name">{application.student_name}</div>
                                    <div className="student-email">{application.student_email}</div>
                                </div>
                                <div className="table-cell course-info">
                                    <div className="course-name">{application.course_name}</div>
                                    <div className="course-code">{application.course_code}</div>
                                </div>
                                <div className="table-cell">
                                    <div 
                                        className={`status-badge ${application.status}`}
                                        style={{ backgroundColor: statusColors[application.status] }}
                                    >
                                        <StatusIcon />
                                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                    </div>
                                </div>
                                <div className="table-cell">
                                    {formatDate(application.created_at)}
                                </div>
                                <div className="table-cell">
                                    {application.reviewer_name || 'Unassigned'}
                                </div>
                                <div className="table-cell actions">
                                    <button 
                                        className="action-btn view-btn"
                                        onClick={() => openDetailModal(application)}
                                        title="View Details"
                                    >
                                        <FaEye />
                                    </button>
                                    {application.status === 'pending' && (
                                        <>
                                            <button 
                                                className="action-btn approve-btn"
                                                onClick={() => updateApplicationStatus(application.id, 'approved')}
                                                title="Approve"
                                            >
                                                <FaCheck />
                                            </button>
                                            <button 
                                                className="action-btn reject-btn"
                                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                                title="Reject"
                                            >
                                                <FaTimes />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredApplications.length === 0 && (
                    <div className="no-applications">
                        <FaClipboardList />
                        <h3>No applications found</h3>
                        <p>No applications match your current filters.</p>
                    </div>
                )}
            </div>

            {/* Application Detail Modal */}
            {showDetailModal && selectedApplication && (
                <div className="modal-overlay">
                    <div className="modal large">
                        <div className="modal-header">
                            <h2>Application Details</h2>
                            <button onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="detail-section">
                                <h3><FaUser /> Student Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Name:</label>
                                        <span>{selectedApplication.student_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Email:</label>
                                        <span>{selectedApplication.student_email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3><FaGraduationCap /> Course Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Course:</label>
                                        <span>{selectedApplication.course_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Code:</label>
                                        <span>{selectedApplication.course_code}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Application Date:</label>
                                        <span>{formatDate(selectedApplication.created_at)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Current Status:</label>
                                        <span className={`status-text ${selectedApplication.status}`}>
                                            {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3><FaFileAlt /> Application Content</h3>
                                
                                {selectedApplication.personal_statement && (
                                    <div className="content-block">
                                        <h4>Personal Statement</h4>
                                        <p>{selectedApplication.personal_statement}</p>
                                    </div>
                                )}

                                {selectedApplication.previous_education && (
                                    <div className="content-block">
                                        <h4>Previous Education</h4>
                                        <p>{selectedApplication.previous_education}</p>
                                    </div>
                                )}

                                {selectedApplication.student_references && (
                                    <div className="content-block">
                                        <h4>References</h4>
                                        <p>{selectedApplication.student_references}</p>
                                    </div>
                                )}
                            </div>

                            {selectedApplication.admin_notes && (
                                <div className="detail-section">
                                    <h3>Admin Notes</h3>
                                    <div className="content-block">
                                        <p>{selectedApplication.admin_notes}</p>
                                    </div>
                                </div>
                            )}

                            {selectedApplication.reviewer_name && (
                                <div className="detail-section">
                                    <h3>Review Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <label>Reviewed By:</label>
                                            <span>{selectedApplication.reviewer_name}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Review Date:</label>
                                            <span>{selectedApplication.reviewed_at ? formatDate(selectedApplication.reviewed_at) : 'Not reviewed'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            {selectedApplication.status === 'pending' && (
                                <>
                                    <button 
                                        className="action-button approve"
                                        onClick={() => {
                                            const notes = prompt('Add approval notes (optional):');
                                            updateApplicationStatus(selectedApplication.id, 'approved', notes || '');
                                        }}
                                    >
                                        <FaCheck /> Approve
                                    </button>
                                    <button 
                                        className="action-button reject"
                                        onClick={() => {
                                            const notes = prompt('Add rejection reason:');
                                            if (notes) {
                                                updateApplicationStatus(selectedApplication.id, 'rejected', notes);
                                            }
                                        }}
                                    >
                                        <FaTimes /> Reject
                                    </button>
                                    <button 
                                        className="action-button waitlist"
                                        onClick={() => {
                                            const notes = prompt('Add waitlist notes (optional):');
                                            updateApplicationStatus(selectedApplication.id, 'waitlisted', notes || '');
                                        }}
                                    >
                                        <FaExclamationTriangle /> Waitlist
                                    </button>
                                </>
                            )}
                            <button 
                                className="action-button secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationManagement;
