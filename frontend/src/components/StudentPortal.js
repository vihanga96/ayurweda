import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowLeft, FaUserGraduate, FaUsers, FaClipboardList, FaChartLine, 
    FaEye, FaEdit, FaSearch, FaFilter, FaPlus, FaTrash, FaGraduationCap,
    FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaBookOpen,
    FaCheckCircle, FaClock, FaTimesCircle, FaExclamationTriangle
} from 'react-icons/fa';
import axios from 'axios';
import './StudentPortal.css';

const StudentPortal = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [selectedApplications, setSelectedApplications] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0
    });
    const [newStudent, setNewStudent] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchStudents();
        fetchStats();
    }, [filters, pagination.page]);

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.search && { search: filters.search }),
                ...(filters.status && { status: filters.status })
            });

            const response = await axios.get(`http://localhost:5001/api/auth/admin/students?${params}`, {
                headers: { 'x-auth-token': token }
            });
            
            setStudents(response.data.students);
            setPagination(prev => ({
                ...prev,
                total: response.data.total
            }));
        } catch (err) {
            setError('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/students/stats', {
                headers: { 'x-auth-token': token }
            });
            setStats(response.data.stats);
        } catch (err) {
            setError('Failed to fetch student statistics');
        }
    };

    const fetchStudentDetails = async (studentId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/auth/admin/students/${studentId}`, {
                headers: { 'x-auth-token': token }
            });
            setSelectedStudent(response.data);
            setShowStudentModal(true);
        } catch (err) {
            setError('Failed to fetch student details');
        }
    };

    const addNewStudent = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/auth/admin/register', {
                ...newStudent,
                role: 'student'
            }, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('Student added successfully');
            setShowAddModal(false);
            setNewStudent({
                name: '',
                email: '',
                password: '',
                phone: '',
                address: ''
            });
            fetchStudents();
            fetchStats();
        } catch (err) {
            setError('Failed to add student');
        }
    };

    const openEditModal = (student) => {
        setEditingStudent({
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone || '',
            address: student.address || '',
            password: '' // Empty password field for optional update
        });
        setShowEditModal(true);
    };

    const updateStudent = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/students/${editingStudent.id}`, editingStudent, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('Student updated successfully');
            setShowEditModal(false);
            setEditingStudent(null);
            fetchStudents();
            fetchStats();
        } catch (err) {
            setError('Failed to update student');
        }
    };

    const deleteStudent = async (studentId, studentName) => {
        if (window.confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone and will remove all associated data.`)) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5001/api/auth/admin/students/${studentId}`, {
                    headers: { 'x-auth-token': token }
                });
                setSuccess('Student deleted successfully');
                fetchStudents();
                fetchStats();
            } catch (err) {
                setError('Failed to delete student');
            }
        }
    };

    const viewApplications = (student) => {
        setSelectedApplications(selectedStudent?.applications || []);
        setShowApplicationModal(true);
    };

    const updateApplicationStatus = async (studentId, applicationId, status, notes = '') => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/students/${studentId}/applications/${applicationId}`, {
                status,
                admin_notes: notes
            }, {
                headers: { 'x-auth-token': token }
            });
            setSuccess('Application status updated successfully');
            fetchStudentDetails(studentId);
        } catch (err) {
            setError('Failed to update application status');
        }
    };

    const filteredStudents = students;

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="student-portal">
            {/* Header */}
            <div className="portal-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin-dashboard')}>
                        <FaArrowLeft />
                    </button>
                    <div className="header-title">
                        <FaUserGraduate className="title-icon" />
                        <h1>Student Portal</h1>
                    </div>
                    <div className="student-count">
                        {pagination.total} total students
                    </div>
                </div>
                <button 
                    className="add-student-btn"
                    onClick={() => setShowAddModal(true)}
                >
                    <FaPlus />
                    Add New Student
                </button>
            </div>

            {/* Messages */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon students">
                        <FaUserGraduate />
                    </div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.total_students || 0}</div>
                        <div className="stat-label">Total Students</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon applications">
                        <FaClipboardList />
                    </div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.total_applications || 0}</div>
                        <div className="stat-label">Applications</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon courses">
                        <FaBookOpen />
                    </div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.active_courses || 0}</div>
                        <div className="stat-label">Active Courses</div>
                    </div>
                </div>

            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="search-box">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                </div>
                <div className="filter-controls">
                    <FaFilter />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Students List */}
            {loading ? (
                <div className="loading">Loading students...</div>
            ) : (
                <div className="students-container">
                    <div className="students-grid">
                        {filteredStudents.map(student => (
                            <div key={student.id} className="student-card">
                                <div className="student-header">
                                    <div className="student-avatar">
                                        <FaUserGraduate />
                                    </div>
                                    <div className="student-basic-info">
                                        <h3>{student.name}</h3>
                                        <p>{student.email}</p>
                                        {student.phone && <p><FaPhone /> {student.phone}</p>}
                                    </div>
                                </div>

                                <div className="student-stats">
                                    <div className="stat-item">
                                        <FaClipboardList className="stat-icon" />
                                        <div>
                                            <span className="stat-value">{student.total_applications}</span>
                                            <span className="stat-label">Applications</span>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <FaBookOpen className="stat-icon" />
                                        <div>
                                            <span className="stat-value">{student.academic_records}</span>
                                            <span className="stat-label">Records</span>
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <FaGraduationCap className="stat-icon" />
                                        <div>
                                            <span className="stat-value">{student.average_gpa ? student.average_gpa.toFixed(2) : 'N/A'}</span>
                                            <span className="stat-label">GPA</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="student-actions">
                                    <button 
                                        className="action-btn view-btn"
                                        onClick={() => fetchStudentDetails(student.id)}
                                    >
                                        <FaEye />
                                        View
                                    </button>
                                    <button 
                                        className="action-btn edit-btn"
                                        onClick={() => openEditModal(student)}
                                    >
                                        <FaEdit />
                                        Edit
                                    </button>
                                    <button 
                                        className="action-btn delete-btn"
                                        onClick={() => deleteStudent(student.id, student.name)}
                                    >
                                        <FaTrash />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
                            >
                                Previous
                            </button>
                            <span>Page {pagination.page} of {totalPages}</span>
                            <button 
                                disabled={pagination.page === totalPages}
                                onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Student Details Modal */}
            {showStudentModal && selectedStudent && (
                <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
                    <div className="modal-content student-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Student Details</h2>
                            <button className="close-btn" onClick={() => setShowStudentModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="student-details">
                                <div className="detail-section">
                                    <h3>Personal Information</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span>Name:</span>
                                            <strong>{selectedStudent.student.name}</strong>
                                        </div>
                                        <div className="detail-item">
                                            <span>Email:</span>
                                            <strong>{selectedStudent.student.email}</strong>
                                        </div>
                                        <div className="detail-item">
                                            <span>Phone:</span>
                                            <strong>{selectedStudent.student.phone || 'Not provided'}</strong>
                                        </div>
                                        <div className="detail-item">
                                            <span>Address:</span>
                                            <strong>{selectedStudent.student.address || 'Not provided'}</strong>
                                        </div>
                                        <div className="detail-item">
                                            <span>Joined:</span>
                                            <strong>{new Date(selectedStudent.student.created_at).toLocaleDateString()}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h3>Applications ({selectedStudent.applications.length})</h3>
                                    {selectedStudent.applications.length > 0 ? (
                                        <div className="applications-list">
                                            {selectedStudent.applications.map(app => (
                                                <div key={app.id} className="application-item">
                                                    <div className="application-info">
                                                        <h4>{app.course_name} ({app.course_code})</h4>
                                                        <span className={`status-badge ${app.status}`}>
                                                            {app.status === 'approved' && <FaCheckCircle />}
                                                            {app.status === 'pending' && <FaClock />}
                                                            {app.status === 'rejected' && <FaTimesCircle />}
                                                            {app.status === 'waitlisted' && <FaExclamationTriangle />}
                                                            {app.status}
                                                        </span>
                                                    </div>
                                                    <p>{new Date(app.created_at).toLocaleDateString()}</p>
                                                    {app.admin_notes && <p className="admin-notes">Notes: {app.admin_notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No applications submitted</p>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h3>Academic Records ({selectedStudent.academic_records.length})</h3>
                                    {selectedStudent.academic_records.length > 0 ? (
                                        <div className="academic-records-list">
                                            {selectedStudent.academic_records.map(record => (
                                                <div key={record.id} className="academic-item">
                                                    <div className="academic-info">
                                                        <h4>{record.course_name} ({record.course_code})</h4>
                                                        <div className="academic-details">
                                                            <span>Year: {record.semester_year}</span>
                                                            <span>Semester: {record.semester_number}</span>
                                                            <span>GPA: {record.gpa || 'N/A'}</span>
                                                            <span className={`status-badge ${record.status}`}>{record.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No academic records</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content add-student-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Student</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => { e.preventDefault(); addNewStudent(); }}>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newStudent.name}
                                        onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                                        placeholder="Enter student's full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={newStudent.email}
                                        onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={newStudent.password}
                                        onChange={(e) => setNewStudent({...newStudent, password: e.target.value})}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={newStudent.phone}
                                        onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <textarea
                                        value={newStudent.address}
                                        onChange={(e) => setNewStudent({...newStudent, address: e.target.value})}
                                        placeholder="Enter full address"
                                        rows="3"
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        Add Student
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && editingStudent && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content add-student-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Student</h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => { e.preventDefault(); updateStudent(); }}>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingStudent.name}
                                        onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                                        placeholder="Enter student's full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editingStudent.email}
                                        onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={editingStudent.password}
                                        onChange={(e) => setEditingStudent({...editingStudent, password: e.target.value})}
                                        placeholder="Leave empty to keep current password"
                                    />
                                    <small style={{color: '#666', fontSize: '0.8rem', marginTop: '5px', display: 'block'}}>
                                        * Leave empty if you don't want to change the password
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editingStudent.phone}
                                        onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})}
                                        placeholder="Enter phone number"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <textarea
                                        value={editingStudent.address}
                                        onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
                                        placeholder="Enter full address"
                                        rows="3"
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        Update Student
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentPortal;
