import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch,
    FaLeaf, FaPills, FaToggleOn, FaToggleOff, FaBoxes,
    FaCalendarAlt, FaDollarSign, FaExclamationTriangle, FaCheckCircle,
    FaList, FaTh
} from 'react-icons/fa';
import axios from 'axios';
import './MedicineManagement.css';

const MedicineManagement = () => {
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('created_date');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    
    // Modal states
    const [showAddMedicine, setShowAddMedicine] = useState(false);
    const [showEditMedicine, setShowEditMedicine] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingMedicine, setDeletingMedicine] = useState(null);

    // Form data for adding/editing medicines
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category_id: '',
        price: '',
        stock_quantity: '',
        unit: 'unit',
        dosage_form: '',
        active_ingredients: '',
        therapeutic_effects: '',
        contraindications: '',
        side_effects: '',
        storage_instructions: '',
        expiry_date: '',
        manufacturer: '',
        is_prescription_required: false,
        image_url: ''
    });

    useEffect(() => {
        fetchMedicines();
        fetchCategories();
    }, [searchTerm, selectedCategory, sortBy, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchMedicines = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            
            if (searchTerm) params.append('search', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory);
            if (sortBy) params.append('sort', sortBy);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await axios.get(`http://localhost:5001/api/medicine/admin/medicines?${params}`, {
                headers: { 'x-auth-token': token }
            });
            
            setMedicines(response.data.medicines);
        } catch (err) {
            setError('Failed to fetch medicines');
            console.error('Error fetching medicines:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/medicine/admin/categories', {
                headers: { 'x-auth-token': token }
            });
            setCategories(response.data.categories);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddMedicine = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Prepare form data with proper date handling
            const submitData = {
                ...formData,
                expiry_date: formData.expiry_date && formData.expiry_date.trim() !== '' ? formData.expiry_date : null
            };
            
            await axios.post('http://localhost:5001/api/medicine/admin/medicines', submitData, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess('Medicine added successfully!');
            setShowAddMedicine(false);
            resetForm();
            fetchMedicines();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to add medicine');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEditMedicine = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Prepare form data with proper date handling
            const submitData = {
                ...formData,
                expiry_date: formData.expiry_date && formData.expiry_date.trim() !== '' ? formData.expiry_date : null
            };
            
            await axios.put(`http://localhost:5001/api/medicine/admin/medicines/${editingMedicine.id}`, submitData, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess('Medicine updated successfully!');
            setShowEditMedicine(false);
            setEditingMedicine(null);
            resetForm();
            fetchMedicines();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to update medicine');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDeleteMedicine = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5001/api/medicine/admin/medicines/${deletingMedicine.id}`, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess('Medicine deleted successfully!');
            setShowDeleteConfirm(false);
            setDeletingMedicine(null);
            fetchMedicines();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to delete medicine');
            setTimeout(() => setError(''), 3000);
        }
    };

    const toggleMedicineStatus = async (medicine) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/medicine/admin/medicines/${medicine.id}`, {
                is_active: !medicine.is_active
            }, {
                headers: { 'x-auth-token': token }
            });
            
            setSuccess(`Medicine ${!medicine.is_active ? 'activated' : 'deactivated'} successfully!`);
            fetchMedicines();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update medicine status');
            setTimeout(() => setError(''), 3000);
        }
    };

    const openEditModal = (medicine) => {
        setEditingMedicine(medicine);
        setFormData({
            name: medicine.name || '',
            description: medicine.description || '',
            category_id: medicine.category_id || '',
            price: medicine.price || '',
            stock_quantity: medicine.stock_quantity || '',
            unit: medicine.unit || 'unit',
            dosage_form: medicine.dosage_form || '',
            active_ingredients: medicine.active_ingredients || '',
            therapeutic_effects: medicine.therapeutic_effects || '',
            contraindications: medicine.contraindications || '',
            side_effects: medicine.side_effects || '',
            storage_instructions: medicine.storage_instructions || '',
            expiry_date: medicine.expiry_date ? medicine.expiry_date.split('T')[0] : '',
            manufacturer: medicine.manufacturer || '',
            is_prescription_required: medicine.is_prescription_required || false,
            image_url: medicine.image_url || ''
        });
        setShowEditMedicine(true);
    };

    const openDeleteModal = (medicine) => {
        setDeletingMedicine(medicine);
        setShowDeleteConfirm(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            category_id: '',
            price: '',
            stock_quantity: '',
            unit: 'unit',
            dosage_form: '',
            active_ingredients: '',
            therapeutic_effects: '',
            contraindications: '',
            side_effects: '',
            storage_instructions: '',
            expiry_date: '',
            manufacturer: '',
            is_prescription_required: false,
            image_url: ''
        });
    };

    const formatPrice = (price) => {
        return `LKR ${parseFloat(price).toFixed(2)}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading medicine inventory...</p>
            </div>
        );
    }

    return (
        <div className="medicine-management-container">
            <header className="management-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin-dashboard')} className="back-btn">
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="header-title">
                        <FaPills className="title-icon" />
                        <h1>Medicine Management</h1>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={() => navigate('/category-management')} className="manage-categories-btn">
                        <FaLeaf /> Manage Categories
                    </button>
                    <button onClick={() => setShowAddMedicine(true)} className="add-medicine-btn">
                        <FaPlus /> Add New Medicine
                    </button>
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="management-controls">
                <div className="search-filter-section">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search medicines..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-controls">
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.filter(cat => cat.is_active).map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                        
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="created_date">Latest First</option>
                            <option value="name">Name A-Z</option>
                            <option value="price_low">Price Low-High</option>
                            <option value="price_high">Price High-Low</option>
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

            <div className={`medicines-container ${viewMode}`}>
                {medicines.length === 0 ? (
                    <div className="no-medicines">
                        <FaPills className="empty-icon" />
                        <h3>No medicines found</h3>
                        <p>Start by adding your first medicine to the inventory.</p>
                        <button onClick={() => setShowAddMedicine(true)} className="add-first-btn">
                            <FaPlus /> Add First Medicine
                        </button>
                    </div>
                ) : (
                    medicines.map(medicine => (
                        <div key={medicine.id} className={`medicine-card ${!medicine.is_active ? 'inactive' : ''}`}>
                            <div className="medicine-image">
                                {medicine.image_url ? (
                                    <img src={medicine.image_url} alt={medicine.name} />
                                ) : (
                                    <div className="placeholder-image">
                                        <FaLeaf />
                                    </div>
                                )}
                                <div className="medicine-status">
                                    {medicine.is_active ? (
                                        <span className="status-active"><FaCheckCircle /> Active</span>
                                    ) : (
                                        <span className="status-inactive"><FaExclamationTriangle /> Inactive</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="medicine-info">
                                <h3>{medicine.name}</h3>
                                <p className="category">{medicine.category_name}</p>
                                <p className="description">{medicine.description}</p>
                                
                                <div className="medicine-details">
                                    <div className="detail-item">
                                        <FaDollarSign className="detail-icon" />
                                        <span>{formatPrice(medicine.price)} per {medicine.unit}</span>
                                    </div>
                                    <div className="detail-item">
                                        <FaBoxes className="detail-icon" />
                                        <span>Stock: {medicine.stock_quantity}</span>
                                    </div>
                                    {medicine.expiry_date && (
                                        <div className="detail-item">
                                            <FaCalendarAlt className="detail-icon" />
                                            <span>Expires: {formatDate(medicine.expiry_date)}</span>
                                        </div>
                                    )}
                                </div>
                            
                            </div>
                            
                            <div className="medicine-actions">
                                <button 
                                    onClick={() => openEditModal(medicine)}
                                    className="action-btn edit"
                                    title="Edit Medicine"
                                >
                                    <FaEdit />
                                </button>
                                <button 
                                    onClick={() => toggleMedicineStatus(medicine)}
                                    className={`action-btn toggle ${medicine.is_active ? 'active' : 'inactive'}`}
                                    title={medicine.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {medicine.is_active ? <FaToggleOn /> : <FaToggleOff />}
                                </button>
                                <button 
                                    onClick={() => openDeleteModal(medicine)}
                                    className="action-btn delete"
                                    title="Delete Medicine"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Medicine Modal */}
            {showAddMedicine && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2><FaPlus /> Add New Medicine</h2>
                            <button onClick={() => setShowAddMedicine(false)} className="close-btn">×</button>
                        </div>
                        
                        <form onSubmit={handleAddMedicine} className="medicine-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Medicine Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter medicine name"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.filter(cat => cat.is_active).map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="0.00"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Stock Quantity</label>
                                    <input
                                        type="number"
                                        name="stock_quantity"
                                        value={formData.stock_quantity}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Unit</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleInputChange}
                                        placeholder="unit, bottle, box, etc."
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Dosage Form</label>
                                    <input
                                        type="text"
                                        name="dosage_form"
                                        value={formData.dosage_form}
                                        onChange={handleInputChange}
                                        placeholder="tablet, syrup, powder, etc."
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Manufacturer</label>
                                    <input
                                        type="text"
                                        name="manufacturer"
                                        value={formData.manufacturer}
                                        onChange={handleInputChange}
                                        placeholder="Manufacturer name"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Medicine description..."
                                />
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Active Ingredients</label>
                                <textarea
                                    name="active_ingredients"
                                    value={formData.active_ingredients}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="List of active ingredients..."
                                />
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Therapeutic Effects</label>
                                <textarea
                                    name="therapeutic_effects"
                                    value={formData.therapeutic_effects}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="Therapeutic effects and benefits..."
                                />
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/image.jpg"
                                />
                                <small className="input-hint">
                                    💡 Use a direct image URL ending with .jpg, .png, .gif, or .webp. 
                                    Right-click on an image and select "Copy image address" to get the direct URL.
                                </small>
                            </div>
                            
                            <div className="form-checkbox">
                                <input
                                    type="checkbox"
                                    id="prescription_required"
                                    name="is_prescription_required"
                                    checked={formData.is_prescription_required}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="prescription_required">Prescription Required</label>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowAddMedicine(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    <FaPlus /> Add Medicine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Medicine Modal */}
            {showEditMedicine && editingMedicine && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2><FaEdit /> Edit Medicine: {editingMedicine.name}</h2>
                            <button onClick={() => setShowEditMedicine(false)} className="close-btn">×</button>
                        </div>
                        
                        <form onSubmit={handleEditMedicine} className="medicine-form">
                            {/* Same form structure as Add Medicine Modal */}
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Medicine Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter medicine name"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.filter(cat => cat.is_active).map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="0.00"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Stock Quantity</label>
                                    <input
                                        type="number"
                                        name="stock_quantity"
                                        value={formData.stock_quantity}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Unit</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleInputChange}
                                        placeholder="unit, bottle, box, etc."
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Dosage Form</label>
                                    <input
                                        type="text"
                                        name="dosage_form"
                                        value={formData.dosage_form}
                                        onChange={handleInputChange}
                                        placeholder="tablet, syrup, powder, etc."
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Manufacturer</label>
                                    <input
                                        type="text"
                                        name="manufacturer"
                                        value={formData.manufacturer}
                                        onChange={handleInputChange}
                                        placeholder="Manufacturer name"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Medicine description..."
                                />
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Active Ingredients</label>
                                <textarea
                                    name="active_ingredients"
                                    value={formData.active_ingredients}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="List of active ingredients..."
                                />
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Therapeutic Effects</label>
                                <textarea
                                    name="therapeutic_effects"
                                    value={formData.therapeutic_effects}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="Therapeutic effects and benefits..."
                                />
                            </div>
                            
                            <div className="form-group full-width">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/image.jpg"
                                />
                                <small className="input-hint">
                                    💡 Use a direct image URL ending with .jpg, .png, .gif, or .webp. 
                                    Right-click on an image and select "Copy image address" to get the direct URL.
                                </small>
                            </div>
                            
                            <div className="form-checkbox">
                                <input
                                    type="checkbox"
                                    id="edit_prescription_required"
                                    name="is_prescription_required"
                                    checked={formData.is_prescription_required}
                                    onChange={handleInputChange}
                                />
                                <label htmlFor="edit_prescription_required">Prescription Required</label>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowEditMedicine(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    <FaEdit /> Update Medicine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && deletingMedicine && (
                <div className="modal-overlay">
                    <div className="modal-content small">
                        <div className="modal-header">
                            <h2><FaTrash /> Delete Medicine</h2>
                        </div>
                        
                        <div className="modal-body">
                            <p>Are you sure you want to delete <strong>{deletingMedicine.name}</strong>?</p>
                            <p className="warning-text">This action cannot be undone.</p>
                        </div>
                        
                        <div className="modal-actions">
                            <button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                                Cancel
                            </button>
                            <button onClick={handleDeleteMedicine} className="delete-btn">
                                <FaTrash /> Delete Medicine
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicineManagement;
