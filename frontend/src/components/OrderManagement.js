import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaArrowLeft, FaSearch, FaEye, FaCheck, FaTimes, FaClock, FaTruck,
    FaShippingFast, FaBoxOpen, FaClipboardList, FaUser, FaPhone,
    FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaPills, FaFilter,
    FaSort, FaChevronLeft, FaChevronRight, FaEdit, FaStickyNote
} from 'react-icons/fa';
import axios from 'axios';
import './OrderManagement.css';

const OrderManagement = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters and pagination
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        currentPage: 1
    });

    // Modals
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });

    useEffect(() => {
        fetchOrders();
        fetchStats();
    }, [filters]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.search) queryParams.append('search', filters.search);
            queryParams.append('page', filters.page);
            queryParams.append('limit', filters.limit);

            const response = await axios.get(
                `http://localhost:5001/api/medicine/admin/orders?${queryParams}`,
                { headers: { 'x-auth-token': token } }
            );

            setOrders(response.data.orders);
            setPagination({
                total: response.data.total,
                totalPages: response.data.totalPages,
                currentPage: response.data.page
            });
        } catch (err) {
            setError('Failed to fetch orders');
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                'http://localhost:5001/api/medicine/admin/orders/stats',
                { headers: { 'x-auth-token': token } }
            );
            setStats(response.data.stats);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchOrderDetails = async (orderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5001/api/medicine/admin/orders/${orderId}`,
                { headers: { 'x-auth-token': token } }
            );
            setSelectedOrder(response.data.order);
            setOrderItems(response.data.items);
            setShowOrderDetails(true);
        } catch (err) {
            setError('Failed to fetch order details');
            console.error('Error fetching order details:', err);
        }
    };

    const updateOrderStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `http://localhost:5001/api/medicine/admin/orders/${selectedOrder.id}/status`,
                statusUpdate,
                { headers: { 'x-auth-token': token } }
            );
            
            setSuccess('Order status updated successfully');
            setShowStatusModal(false);
            setShowOrderDetails(false);
            fetchOrders();
            fetchStats();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update order status');
            console.error('Error updating status:', err);
            setTimeout(() => setError(''), 3000);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <FaClock />;
            case 'confirmed': return <FaCheck />;
            case 'processing': return <FaBoxOpen />;
            case 'ready': return <FaShippingFast />;
            case 'delivered': return <FaTruck />;
            case 'cancelled': return <FaTimes />;
            default: return <FaClipboardList />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ff9800';
            case 'confirmed': return '#4caf50';
            case 'processing': return '#2196f3';
            case 'ready': return '#9c27b0';
            case 'delivered': return '#8bc34a';
            case 'cancelled': return '#f44336';
            default: return '#666';
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset to first page when filtering
        }));
    };

    const handlePageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const openStatusModal = (order) => {
        setSelectedOrder(order);
        setStatusUpdate({ status: order.status, notes: order.notes || '' });
        setShowStatusModal(true);
    };

    return (
        <div className="order-management-container">
            <header className="management-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin-dashboard')} className="back-btn">
                        <FaArrowLeft /> Back to Admin Dashboard
                    </button>
                    <div className="header-title">
                        <FaClipboardList className="title-icon" />
                        <h1>Order Management</h1>
                        <span className="order-count">{pagination.total} orders</span>
                    </div>
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Statistics Dashboard */}
            <div className="stats-dashboard">
                <div className="stat-card pending">
                    <div className="stat-icon">
                        <FaClock />
                    </div>
                    <div className="stat-content">
                        <h3>Pending</h3>
                        <p className="stat-number">{stats.pending_orders || 0}</p>
                    </div>
                </div>
                <div className="stat-card confirmed">
                    <div className="stat-icon">
                        <FaCheck />
                    </div>
                    <div className="stat-content">
                        <h3>Confirmed</h3>
                        <p className="stat-number">{stats.confirmed_orders || 0}</p>
                    </div>
                </div>
                <div className="stat-card processing">
                    <div className="stat-icon">
                        <FaBoxOpen />
                    </div>
                    <div className="stat-content">
                        <h3>Processing</h3>
                        <p className="stat-number">{stats.processing_orders || 0}</p>
                    </div>
                </div>
                <div className="stat-card ready">
                    <div className="stat-icon">
                        <FaShippingFast />
                    </div>
                    <div className="stat-content">
                        <h3>Ready</h3>
                        <p className="stat-number">{stats.ready_orders || 0}</p>
                    </div>
                </div>
                <div className="stat-card delivered">
                    <div className="stat-icon">
                        <FaTruck />
                    </div>
                    <div className="stat-content">
                        <h3>Delivered</h3>
                        <p className="stat-number">{stats.delivered_orders || 0}</p>
                    </div>
                </div>
                <div className="stat-card revenue">
                    <div className="stat-icon">
                        <FaDollarSign />
                    </div>
                    <div className="stat-content">
                        <h3>Revenue (30d)</h3>
                        <p className="stat-number">LKR {(parseFloat(stats.total_revenue) || 0).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="management-controls">
                <div className="search-filter-section">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by order number, patient name..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <div className="filter-controls">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="ready">Ready</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="orders-container">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="no-orders">
                        <FaClipboardList className="empty-icon" />
                        <h3>No orders found</h3>
                        <p>No orders match your current filters.</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="order-card">
                            <div className="order-header">
                                <div className="order-info">
                                    <h3>#{order.order_number}</h3>
                                    <div className="patient-info">
                                        <FaUser /> {order.patient_name}
                                    </div>
                                </div>
                                <div className="order-status">
                                    <span 
                                        className={`status-badge status-${order.status}`}
                                        style={{ backgroundColor: getStatusColor(order.status) }}
                                    >
                                        {getStatusIcon(order.status)}
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </span>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="detail-item">
                                    <FaCalendarAlt />
                                    <span>{new Date(order.order_date).toLocaleString()}</span>
                                </div>
                                <div className="detail-item">
                                    <FaPills />
                                    <span>{order.total_items} items</span>
                                </div>
                                <div className="detail-item">
                                    <FaDollarSign />
                                    <span>LKR {order.total_amount}</span>
                                </div>
                                {order.patient_email && (
                                    <div className="detail-item">
                                        <span>{order.patient_email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="order-actions">
                                <button 
                                    onClick={() => fetchOrderDetails(order.id)}
                                    className="action-btn view"
                                >
                                    <FaEye /> View Details
                                </button>
                                <button 
                                    onClick={() => openStatusModal(order)}
                                    className="action-btn edit"
                                >
                                    <FaEdit /> Update Status
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="page-btn"
                    >
                        <FaChevronLeft />
                    </button>
                    
                    <span className="page-info">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    
                    <button 
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="page-btn"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2>Order Details - #{selectedOrder.order_number}</h2>
                            <button onClick={() => setShowOrderDetails(false)} className="close-btn">
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="order-detail-grid">
                                <div className="detail-section">
                                    <h4>Customer Information</h4>
                                    <div className="info-grid">
                                        <div><strong>Name:</strong> {selectedOrder.patient_name}</div>
                                        <div><strong>Email:</strong> {selectedOrder.patient_email}</div>
                                        {selectedOrder.patient_phone && (
                                            <div><strong>Phone:</strong> {selectedOrder.patient_phone}</div>
                                        )}
                                        <div><strong>Order Date:</strong> {new Date(selectedOrder.order_date).toLocaleString()}</div>
                                    </div>
                                </div>
                                
                                <div className="detail-section">
                                    <h4>Order Information</h4>
                                    <div className="info-grid">
                                        <div><strong>Status:</strong> 
                                            <span 
                                                className={`status-badge status-${selectedOrder.status}`}
                                                style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                                            >
                                                {getStatusIcon(selectedOrder.status)}
                                                {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                                            </span>
                                        </div>
                                        <div><strong>Total Amount:</strong> LKR {selectedOrder.total_amount}</div>
                                        {selectedOrder.delivery_address && (
                                            <div><strong>Delivery Address:</strong> {selectedOrder.delivery_address}</div>
                                        )}
                                        {selectedOrder.delivery_instructions && (
                                            <div><strong>Instructions:</strong> {selectedOrder.delivery_instructions}</div>
                                        )}
                                        {selectedOrder.notes && (
                                            <div><strong>Notes:</strong> {selectedOrder.notes}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Order Items</h4>
                                <div className="items-list">
                                    {orderItems.map(item => (
                                        <div key={item.id} className="item-card">
                                            <div className="item-image">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.medicine_name} />
                                                ) : (
                                                    <div className="placeholder-image">
                                                        <FaPills />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="item-info">
                                                <h5>{item.medicine_name}</h5>
                                                <p className="item-category">{item.category_name}</p>
                                                <div className="item-details">
                                                    <span>Qty: {item.quantity} {item.unit}</span>
                                                    <span>Price: LKR {item.unit_price} each</span>
                                                    <span className="item-total">Total: LKR {item.total_price}</span>
                                                </div>
                                                {item.prescription_required && (
                                                    <div className="prescription-required">
                                                        Prescription Required
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                onClick={() => openStatusModal(selectedOrder)}
                                className="action-btn edit"
                            >
                                <FaEdit /> Update Status
                            </button>
                            <button onClick={() => setShowOrderDetails(false)} className="cancel-btn">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {showStatusModal && selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Update Order Status</h2>
                            <button onClick={() => setShowStatusModal(false)} className="close-btn">
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Order: #{selectedOrder.order_number}</label>
                                <label>Customer: {selectedOrder.patient_name}</label>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={statusUpdate.status}
                                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="processing">Processing</option>
                                    <option value="ready">Ready for Delivery</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <textarea
                                    value={statusUpdate.notes}
                                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Add notes about this status update..."
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={updateOrderStatus} className="submit-btn">
                                <FaCheck /> Update Status
                            </button>
                            <button onClick={() => setShowStatusModal(false)} className="cancel-btn">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
