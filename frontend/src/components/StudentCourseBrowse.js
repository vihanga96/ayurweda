import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FaSearch, FaFilter, FaGraduationCap, FaCalendarAlt,
    FaDollarSign, FaUsers, FaClock, FaBook, FaClipboardList,
    FaInfo, FaArrowLeft, FaStar
} from 'react-icons/fa';
import './StudentCourseBrowse.css';

const StudentCourseBrowse = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [applicationForm, setApplicationForm] = useState({
        personal_statement: '',
        previous_education: '',
        references: ''
    });
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        level: '',
        sortBy: 'name'
    });

    useEffect(() => {
        fetchCourses();
        fetchCategories();
        checkApplicationStatus();
    }, [filters]);

    const checkApplicationStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get('http://localhost:5001/api/students/application-status', {
                headers: { 'x-auth-token': token }
            });
            
            const statusMap = {};
            response.data.applications.forEach(app => {
                statusMap[app.course_id] = app;
            });
            setApplicationStatus(statusMap);
        } catch (error) {
            console.error('Error fetching application status:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.category) params.append('category', filters.category);
            if (filters.level) params.append('level', filters.level);

            const response = await axios.get(`http://localhost:5001/api/students/courses?${params}`);
            let coursesData = response.data.courses;

            // Sort courses
            if (filters.sortBy === 'name') {
                coursesData.sort((a, b) => a.name.localeCompare(b.name));
            } else if (filters.sortBy === 'fee') {
                coursesData.sort((a, b) => (a.fee || 0) - (b.fee || 0));
            } else if (filters.sortBy === 'level') {
                const levelOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
                coursesData.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
            }

            setCourses(coursesData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/students/course-categories');
            setCategories(response.data.categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const openCourseDetail = async (courseId) => {
        try {
            const response = await axios.get(`http://localhost:5001/api/students/courses/${courseId}`);
            setSelectedCourse(response.data.course);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error fetching course details:', error);
        }
    };

    const handleApply = (course) => {
        setSelectedCourse(course);
        setApplicationForm({
            personal_statement: '',
            previous_education: '',
            references: ''
        });
        setShowApplicationModal(true);
    };

    const submitApplication = async () => {
        if (!applicationForm.personal_statement.trim()) {
            alert('Personal statement is required');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/students/applications', {
                course_id: selectedCourse.id,
                personal_statement: applicationForm.personal_statement,
                previous_education: applicationForm.previous_education,
                references: applicationForm.references
            }, {
                headers: { 'x-auth-token': token }
            });

            alert('Application submitted successfully!');
            setShowApplicationModal(false);
            checkApplicationStatus(); // Refresh application status
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Error submitting application. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getApplicationButtonText = (courseId) => {
        const application = applicationStatus[courseId];
        if (!application) return 'Apply';
        
        switch (application.status) {
            case 'pending': return 'Applied (Pending)';
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            case 'waitlisted': return 'Waitlisted';
            default: return 'Apply';
        }
    };

    const getApplicationButtonClass = (courseId) => {
        const application = applicationStatus[courseId];
        if (!application) return 'apply-btn';
        
        switch (application.status) {
            case 'pending': return 'apply-btn pending';
            case 'approved': return 'apply-btn approved';
            case 'rejected': return 'apply-btn rejected';
            case 'waitlisted': return 'apply-btn waitlisted';
            default: return 'apply-btn';
        }
    };

    const isApplicationDisabled = (courseId) => {
        const application = applicationStatus[courseId];
        return application && ['pending', 'approved'].includes(application.status);
    };

    const getLevelColor = (level) => {
        const colors = {
            beginner: '#28a745',
            intermediate: '#ffc107',
            advanced: '#fd7e14',
            expert: '#dc3545'
        };
        return colors[level] || '#6c757d';
    };

    const getLevelLabel = (level) => {
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <div className="loading">Loading courses...</div>;
    }

    return (
        <div className="student-course-browse">
            <div className="browse-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/student-dashboard')}>
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="header-title">
                        <h1><FaBook /> Browse Courses</h1>
                        <span className="course-count">{courses.length} courses available</span>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="filters-section">
                <div className="filter-group">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                </div>

                <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>

                <select
                    value={filters.level}
                    onChange={(e) => setFilters({...filters, level: e.target.value})}
                >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                </select>

                <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                >
                    <option value="name">Sort by Name</option>
                    <option value="fee">Sort by Fee</option>
                    <option value="level">Sort by Level</option>
                </select>
            </div>

            {/* Courses Grid */}
            <div className="courses-grid">
                {courses.map(course => (
                    <div key={course.id} className="course-card">
                        <div className="course-header">
                            <div className="course-title">
                                <h3>{course.name}</h3>
                                <span className="course-code">{course.code}</span>
                            </div>
                            <div 
                                className="course-level"
                                style={{ backgroundColor: getLevelColor(course.level) }}
                            >
                                {getLevelLabel(course.level)}
                            </div>
                        </div>

                        <div className="course-category">
                            <FaGraduationCap />
                            {course.category_name || 'General'}
                        </div>

                        <div className="course-description">
                            {course.description ? 
                                course.description.substring(0, 120) + '...' : 
                                'No description available'
                            }
                        </div>

                        <div className="course-details">
                            <div className="detail-item">
                                <FaDollarSign />
                                <span>LKR {course.fee ? course.fee.toLocaleString() : 'Free'}</span>
                            </div>
                            <div className="detail-item">
                                <FaClock />
                                <span>{course.duration || 'Flexible'}</span>
                            </div>
                            <div className="detail-item">
                                <FaUsers />
                                <span>{course.max_students || 'Unlimited'} max</span>
                            </div>
                            <div className="detail-item">
                                <FaClipboardList />
                                <span>{course.application_count || 0} applications</span>
                            </div>
                        </div>

                        {course.credits && (
                            <div className="course-credits">
                                <FaStar />
                                {course.credits} Credits
                            </div>
                        )}

                        <div className="course-dates">
                            <div className="date-item">
                                <strong>Start:</strong> {formatDate(course.start_date)}
                            </div>
                            <div className="date-item">
                                <strong>End:</strong> {formatDate(course.end_date)}
                            </div>
                        </div>

                        <div className="course-actions">
                            <button 
                                className="action-btn info-btn"
                                onClick={() => openCourseDetail(course.id)}
                            >
                                <FaInfo /> Details
                            </button>
                            <button 
                                className={`action-btn ${getApplicationButtonClass(course.id)}`}
                                onClick={() => handleApply(course)}
                                disabled={isApplicationDisabled(course.id)}
                            >
                                <FaClipboardList /> {getApplicationButtonText(course.id)}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {courses.length === 0 && (
                <div className="no-courses">
                    <FaBook />
                    <h3>No courses found</h3>
                    <p>Try adjusting your search filters to find more courses.</p>
                </div>
            )}

            {/* Course Detail Modal */}
            {showDetailModal && selectedCourse && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{selectedCourse.name}</h2>
                            <button onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="course-info-grid">
                                <div className="info-section">
                                    <h4>Course Information</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>Course Code:</label>
                                            <span>{selectedCourse.code}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Category:</label>
                                            <span>{selectedCourse.category_name || 'General'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Level:</label>
                                            <span 
                                                className="level-badge"
                                                style={{ backgroundColor: getLevelColor(selectedCourse.level) }}
                                            >
                                                {getLevelLabel(selectedCourse.level)}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <label>Credits:</label>
                                            <span>{selectedCourse.credits || 'Not specified'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="info-section">
                                    <h4>Course Details</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>Duration:</label>
                                            <span>{selectedCourse.duration || 'Not specified'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Fee:</label>
                                            <span>LKR {selectedCourse.fee ? selectedCourse.fee.toLocaleString() : 'Free'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Max Students:</label>
                                            <span>{selectedCourse.max_students || 'Unlimited'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Applications:</label>
                                            <span>{selectedCourse.application_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section full-width">
                                <h4>Description</h4>
                                <p className="course-full-description">
                                    {selectedCourse.description || 'No description available for this course.'}
                                </p>
                            </div>

                            <div className="course-dates-detail">
                                <div className="date-section">
                                    <h4>Important Dates</h4>
                                    <div className="dates-grid">
                                        <div className="date-item">
                                            <FaCalendarAlt />
                                            <div>
                                                <strong>Start Date</strong>
                                                <span>{formatDate(selectedCourse.start_date)}</span>
                                            </div>
                                        </div>
                                        <div className="date-item">
                                            <FaCalendarAlt />
                                            <div>
                                                <strong>End Date</strong>
                                                <span>{formatDate(selectedCourse.end_date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="action-button secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Close
                            </button>
                            <button 
                                className={`action-button primary ${getApplicationButtonClass(selectedCourse.id)}`}
                                onClick={() => {
                                    setShowDetailModal(false);
                                    handleApply(selectedCourse);
                                }}
                                disabled={isApplicationDisabled(selectedCourse.id)}
                            >
                                <FaClipboardList /> {getApplicationButtonText(selectedCourse.id)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Course Application Modal */}
            {showApplicationModal && selectedCourse && (
                <div className="modal-overlay">
                    <div className="modal application-modal">
                        <div className="modal-header">
                            <h2>Apply to {selectedCourse.name}</h2>
                            <button onClick={() => setShowApplicationModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="course-info-summary">
                                <div className="info-row">
                                    <span><strong>Course Code:</strong> {selectedCourse.code}</span>
                                    <span><strong>Fee:</strong> LKR {selectedCourse.fee ? selectedCourse.fee.toLocaleString() : 'Free'}</span>
                                </div>
                                <div className="info-row">
                                    <span><strong>Duration:</strong> {selectedCourse.duration || 'Not specified'}</span>
                                    <span><strong>Credits:</strong> {selectedCourse.credits || 'Not specified'}</span>
                                </div>
                            </div>

                            <div className="application-form">
                                <div className="form-group">
                                    <label>Personal Statement *</label>
                                    <textarea
                                        value={applicationForm.personal_statement}
                                        onChange={(e) => setApplicationForm({...applicationForm, personal_statement: e.target.value})}
                                        placeholder="Why do you want to take this course? What are your goals and expectations?"
                                        required
                                        rows={6}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Previous Education</label>
                                    <textarea
                                        value={applicationForm.previous_education}
                                        onChange={(e) => setApplicationForm({...applicationForm, previous_education: e.target.value})}
                                        placeholder="Describe your educational background and relevant experience"
                                        rows={4}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>References</label>
                                    <textarea
                                        value={applicationForm.references}
                                        onChange={(e) => setApplicationForm({...applicationForm, references: e.target.value})}
                                        placeholder="List any professional or academic references (optional)"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="action-button secondary"
                                onClick={() => setShowApplicationModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button 
                                className="action-button primary"
                                onClick={submitApplication}
                                disabled={submitting || !applicationForm.personal_statement.trim()}
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCourseBrowse;
