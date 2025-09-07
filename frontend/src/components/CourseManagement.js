import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FaPlus, FaEdit, FaTrash, FaEye, FaGraduationCap, 
    FaUsers, FaDollarSign, FaCalendarAlt, FaFilter,
    FaSearch, FaToggleOn, FaToggleOff, FaBook, FaChartLine
} from 'react-icons/fa';
import './CourseManagement.css';

const CourseManagement = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        level: '',
        status: 'all'
    });

    const [newCourse, setNewCourse] = useState({
        name: '',
        code: '',
        description: '',
        category_id: '',
        level: 'beginner',
        duration: '',
        credits: 0,
        max_students: 0,
        fee: 0,
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchCourses();
        fetchCategories();
        fetchStats();
    }, []);

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

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/course-categories', {
                headers: { 'x-auth-token': token }
            });
            setCategories(response.data.categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/auth/admin/courses/stats', {
                headers: { 'x-auth-token': token }
            });
            setStats(response.data.stats);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/auth/admin/courses', newCourse, {
                headers: { 'x-auth-token': token }
            });
            
            setShowAddModal(false);
            setNewCourse({
                name: '',
                code: '',
                description: '',
                category_id: '',
                level: 'beginner',
                duration: '',
                credits: 0,
                max_students: 0,
                fee: 0,
                start_date: '',
                end_date: ''
            });
            fetchCourses();
            fetchStats();
        } catch (error) {
            console.error('Error adding course:', error);
            alert('Error adding course: ' + (error.response?.data?.msg || 'Unknown error'));
        }
    };

    const handleEditCourse = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/courses/${editingCourse.id}`, editingCourse, {
                headers: { 'x-auth-token': token }
            });
            
            setShowEditModal(false);
            setEditingCourse(null);
            fetchCourses();
            fetchStats();
        } catch (error) {
            console.error('Error updating course:', error);
            alert('Error updating course: ' + (error.response?.data?.msg || 'Unknown error'));
        }
    };

    const handleDeleteCourse = async (courseId, courseName) => {
        if (!window.confirm(`Are you sure you want to delete "${courseName}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`http://localhost:5001/api/auth/admin/courses/${courseId}`, {
                headers: { 'x-auth-token': token }
            });
            
            alert(response.data.msg);
            fetchCourses();
            fetchStats();
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Error deleting course: ' + (error.response?.data?.msg || 'Unknown error'));
        }
    };

    const openEditModal = (course) => {
        setEditingCourse({
            ...course,
            category_id: course.category_id || '',
            credits: course.credits || 0,
            max_students: course.max_students || 0,
            fee: course.fee || 0,
            start_date: course.start_date ? course.start_date.split('T')[0] : '',
            end_date: course.end_date ? course.end_date.split('T')[0] : ''
        });
        setShowEditModal(true);
    };

    const toggleCourseStatus = async (courseId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/auth/admin/courses/${courseId}`, 
                { ...courses.find(c => c.id === courseId), is_active: !currentStatus },
                { headers: { 'x-auth-token': token } }
            );
            fetchCourses();
        } catch (error) {
            console.error('Error toggling course status:', error);
        }
    };

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                            course.code.toLowerCase().includes(filters.search.toLowerCase());
        const matchesCategory = !filters.category || course.category_id == filters.category;
        const matchesLevel = !filters.level || course.level === filters.level;
        const matchesStatus = filters.status === 'all' || 
                            (filters.status === 'active' && course.is_active) ||
                            (filters.status === 'inactive' && !course.is_active);
        
        return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
    });

    if (loading) {
        return <div className="loading">Loading course management...</div>;
    }

    return (
        <div className="course-management">
            <div className="management-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin-dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <div className="header-title">
                        <h1><FaGraduationCap /> Course Management</h1>
                        <span className="course-count">{courses.length} Total Courses</span>
                    </div>
                </div>
                <button className="add-course-btn" onClick={() => setShowAddModal(true)}>
                    <FaPlus /> Add New Course
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <FaBook className="stat-icon" />
                    <div className="stat-content">
                        <h3>{stats.total_courses || 0}</h3>
                        <p>Total Courses</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaToggleOn className="stat-icon active" />
                    <div className="stat-content">
                        <h3>{stats.active_courses || 0}</h3>
                        <p>Active Courses</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaUsers className="stat-icon" />
                    <div className="stat-content">
                        <h3>{stats.total_capacity || 0}</h3>
                        <p>Total Capacity</p>
                    </div>
                </div>
                <div className="stat-card">
                    <FaDollarSign className="stat-icon" />
                    <div className="stat-content">
                        <h3>LKR {(stats.average_fee || 0).toLocaleString()}</h3>
                        <p>Average Fee</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
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
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            {/* Courses Grid */}
            <div className="courses-grid">
                {filteredCourses.map(course => (
                    <div key={course.id} className={`course-card ${!course.is_active ? 'inactive' : ''}`}>
                        <div className="course-header">
                            <h3>{course.name}</h3>
                            <div className="course-actions">
                                <button 
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(course)}
                                    title="Edit Course"
                                >
                                    <FaEdit />
                                </button>
                                <button 
                                    className="action-btn toggle-btn"
                                    onClick={() => toggleCourseStatus(course.id, course.is_active)}
                                    title={course.is_active ? "Deactivate" : "Activate"}
                                >
                                    {course.is_active ? <FaToggleOn /> : <FaToggleOff />}
                                </button>
                                <button 
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteCourse(course.id, course.name)}
                                    title="Delete Course"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>

                        <div className="course-info">
                            <div className="course-code">{course.code}</div>
                            <div className="course-category">{course.category_name || 'No Category'}</div>
                            <div className="course-level">{course.level}</div>
                        </div>

                        <div className="course-details">
                            <div className="detail-item">
                                <FaUsers /> {course.application_count} Applications
                            </div>
                            <div className="detail-item">
                                <FaUsers /> {course.max_students || 'No Limit'} Max Students
                            </div>
                            <div className="detail-item">
                                <FaDollarSign /> LKR {course.fee ? course.fee.toLocaleString() : 0}
                            </div>
                            <div className="detail-item">
                                <FaCalendarAlt /> {course.duration || 'No Duration'}
                            </div>
                        </div>

                        {!course.is_active && (
                            <div className="inactive-badge">Inactive</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Course Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Add New Course</h2>
                            <button onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddCourse}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Course Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCourse.name}
                                        onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Course Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCourse.code}
                                        onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                                    rows="3"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={newCourse.category_id}
                                        onChange={(e) => setNewCourse({...newCourse, category_id: e.target.value})}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Level</label>
                                    <select
                                        value={newCourse.level}
                                        onChange={(e) => setNewCourse({...newCourse, level: e.target.value})}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                        <option value="expert">Expert</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 6 months, 2 years"
                                        value={newCourse.duration}
                                        onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Credits</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newCourse.credits}
                                        onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Max Students</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newCourse.max_students}
                                        onChange={(e) => setNewCourse({...newCourse, max_students: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fee (LKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={newCourse.fee}
                                        onChange={(e) => setNewCourse({...newCourse, fee: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={newCourse.start_date}
                                        onChange={(e) => setNewCourse({...newCourse, start_date: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={newCourse.end_date}
                                        onChange={(e) => setNewCourse({...newCourse, end_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit">Add Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {showEditModal && editingCourse && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Edit Course</h2>
                            <button onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleEditCourse}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Course Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingCourse.name}
                                        onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Course Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingCourse.code}
                                        onChange={(e) => setEditingCourse({...editingCourse, code: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editingCourse.description || ''}
                                    onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                                    rows="3"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={editingCourse.category_id}
                                        onChange={(e) => setEditingCourse({...editingCourse, category_id: e.target.value})}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Level</label>
                                    <select
                                        value={editingCourse.level}
                                        onChange={(e) => setEditingCourse({...editingCourse, level: e.target.value})}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                        <option value="expert">Expert</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 6 months, 2 years"
                                        value={editingCourse.duration || ''}
                                        onChange={(e) => setEditingCourse({...editingCourse, duration: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Credits</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingCourse.credits}
                                        onChange={(e) => setEditingCourse({...editingCourse, credits: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Max Students</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingCourse.max_students}
                                        onChange={(e) => setEditingCourse({...editingCourse, max_students: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fee (LKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={editingCourse.fee}
                                        onChange={(e) => setEditingCourse({...editingCourse, fee: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={editingCourse.start_date}
                                        onChange={(e) => setEditingCourse({...editingCourse, start_date: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={editingCourse.end_date}
                                        onChange={(e) => setEditingCourse({...editingCourse, end_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={editingCourse.is_active}
                                        onChange={(e) => setEditingCourse({...editingCourse, is_active: e.target.checked})}
                                    />
                                    Course is active
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit">Update Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManagement;
