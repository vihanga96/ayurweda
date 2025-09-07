import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, 
    FaLeaf, FaToggleOn, FaToggleOff,
    FaCheckCircle, FaExclamationTriangle, FaList, FaTh
} from 'react-icons/fa';
import axios from 'axios';
import './CategoryManagement.css';

const CategoryManagement = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    
    // Modal states
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showEditCategory, setShowEditCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState(null);

    // Form data for adding/editing categories
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: ''
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    // Filter categories based on search and status
    const filteredCategories = categories.filter(category => {
        const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             category.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && category.is_active) ||
                             (statusFilter === 'inactive' && !category.is_active);
        return matchesSearch && matchesStatus;
    });

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/medicine/admin/categories', {
                headers: { 'x-auth-token': token }
            });
            setCategories(response.data.categories);
        } catch (err) {
            setError('Failed to fetch categories');
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/medicine/admin/categories', formData, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess('Category added successfully!');
            setShowAddCategory(false);
            resetForm();
            fetchCategories();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to add category');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEditCategory = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/medicine/admin/categories/${editingCategory.id}`, formData, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess('Category updated successfully!');
            setShowEditCategory(false);
            setEditingCategory(null);
            resetForm();
            fetchCategories();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to update category');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDeleteCategory = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5001/api/medicine/admin/categories/${deletingCategory.id}`, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess('Category deleted successfully!');
            setShowDeleteConfirm(false);
            setDeletingCategory(null);
            fetchCategories();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to delete category');
            setTimeout(() => setError(''), 3000);
        }
    };

    const toggleCategoryStatus = async (category) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/medicine/admin/categories/${category.id}`, {
                is_active: !category.is_active
            }, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess(`Category ${!category.is_active ? 'activated' : 'deactivated'} successfully!`);
            fetchCategories();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update category status');
            setTimeout(() => setError(''), 3000);
        }
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name || '',
            description: category.description || '',
            image_url: category.image_url || ''
        });
        setShowEditCategory(true);
    };

    const openDeleteModal = (category) => {
        setDeletingCategory(category);
        setShowDeleteConfirm(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            image_url: ''
        });
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading categories...</p>
            </div>
        );
    }

    return (
        <div className="category-management-container">
            <header className="management-header">
                <div className="header-left">
                    <button onClick={() => navigate('/medicine-management')} className="back-btn">
                        <FaArrowLeft /> Back to Medicine Management
                    </button>
                    <div className="header-title">
                        <FaLeaf className="title-icon" />
                        <h1>Category Management</h1>
                        <span className="category-count">{filteredCategories.length} categories</span>
                    </div>
                </div>
                <button onClick={() => setShowAddCategory(true)} className="add-category-btn">
                    <FaPlus /> Add New Category
                </button>
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="management-controls">
                <div className="search-filter-section">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-controls">
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
                
                <div className="view-controls">
                    <button 
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <FaTh />
                    </button>
                    <button 
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <FaList />
                    </button>
                </div>
            </div>

            <div className={`categories-container ${viewMode}`}>
                {filteredCategories.length === 0 ? (
                    <div className="no-categories">
                        <FaLeaf className="empty-icon" />
                        <h3>No categories found</h3>
                        <p>Start by adding your first medicine category.</p>
                        <button onClick={() => setShowAddCategory(true)} className="add-first-btn">
                            <FaPlus /> Add First Category
                        </button>
                    </div>
                ) : (
                    filteredCategories.map(category => (
                        <div key={category.id} className={`category-card ${!category.is_active ? 'inactive' : ''}`}>
                            <div className="category-image">
                                {category.image_url ? (
                                    <img src={category.image_url} alt={category.name} />
                                ) : (
                                    <div className="placeholder-image">
                                        <FaLeaf />
                                    </div>
                                )}
                                <div className="category-status">
                                    {category.is_active ? (
                                        <span className="status-active"><FaCheckCircle /> Active</span>
                                    ) : (
                                        <span className="status-inactive"><FaExclamationTriangle /> Inactive</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="category-info">
                                <h3>{category.name}</h3>
                                <p className="description">{category.description || 'No description available'}</p>
                                
                                <div className="category-meta">
                                    <small>Created: {new Date(category.created_at).toLocaleDateString('en-IN')}</small>
                                    {category.updated_at !== category.created_at && (
                                        <small>Updated: {new Date(category.updated_at).toLocaleDateString('en-IN')}</small>
                                    )}
                                </div>
                            </div>
                            
                            <div className="category-actions">
                                <button 
                                    onClick={() => openEditModal(category)}
                                    className="action-btn edit"
                                    title="Edit Category"
                                >
                                    <FaEdit />
                                </button>
                                <button 
                                    onClick={() => toggleCategoryStatus(category)}
                                    className={`action-btn toggle ${category.is_active ? 'active' : 'inactive'}`}
                                    title={category.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {category.is_active ? <FaToggleOn /> : <FaToggleOff />}
                                </button>
                                <button 
                                    onClick={() => openDeleteModal(category)}
                                    className="action-btn delete"
                                    title="Delete Category"
                                    disabled={category.is_active} // Prevent deleting active categories
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Category Modal */}
            {showAddCategory && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2><FaPlus /> Add New Category</h2>
                            <button onClick={() => setShowAddCategory(false)} className="close-btn">×</button>
                        </div>
                        
                        <form onSubmit={handleAddCategory} className="category-form">
                            <div className="form-group">
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter category name"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Category description..."
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowAddCategory(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    <FaPlus /> Add Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Category Modal */}
            {showEditCategory && editingCategory && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2><FaEdit /> Edit Category: {editingCategory.name}</h2>
                            <button onClick={() => setShowEditCategory(false)} className="close-btn">×</button>
                        </div>
                        
                        <form onSubmit={handleEditCategory} className="category-form">
                            <div className="form-group">
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter category name"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Category description..."
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowEditCategory(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    <FaEdit /> Update Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && deletingCategory && (
                <div className="modal-overlay">
                    <div className="modal-content small">
                        <div className="modal-header">
                            <h2><FaTrash /> Delete Category</h2>
                        </div>
                        
                        <div className="modal-body">
                            <p>Are you sure you want to delete <strong>{deletingCategory.name}</strong>?</p>
                            <p className="warning-text">This action cannot be undone and may affect medicines in this category.</p>
                        </div>
                        
                        <div className="modal-actions">
                            <button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                                Cancel
                            </button>
                            <button onClick={handleDeleteCategory} className="delete-btn">
                                <FaTrash /> Delete Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;
