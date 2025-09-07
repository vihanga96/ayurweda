import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEye, FaTimes, FaCheckCircle, FaClock, FaTruck, FaBox, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import './OrderHistory.css';

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [filterStatus]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = filterStatus ? `?status=${filterStatus}` : '';
            const response = await axios.get(`http://localhost:5001/api/medicine/orders${params}`, {
                headers: { 'x-auth-token': token }
            });
            setOrders(response.data.orders);
        } catch (err) {
            setError('Failed to fetch orders');
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5001/api/medicine/orders/${orderId}`, {
                headers: { 'x-auth-token': token }
            });
            setSelectedOrder(response.data);
            setShowOrderDetails(true);
        } catch (err) {
            setError('Failed to fetch order details');
            console.error('Error fetching order details:', err);
        }
    };

    const cancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/medicine/orders/${orderId}/cancel`, {}, {
                headers: { 'x-auth-token': token }
            });
            fetchOrders(); // Refresh the list
            setShowOrderDetails(false);
        } catch (err) {
            setError('Failed to cancel order');
            console.error('Error cancelling order:', err);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <FaClock className="status-icon pending" />;
            case 'confirmed':
                return <FaCheckCircle className="status-icon confirmed" />;
            case 'processing':
                return <FaBox className="status-icon processing" />;
            case 'ready':
                return <FaTruck className="status-icon ready" />;
            case 'delivered':
                return <FaCheckCircle className="status-icon delivered" />;
            case 'cancelled':
                return <FaTimes className="status-icon cancelled" />;
            default:
                return <FaClock className="status-icon" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#ffc107';
            case 'confirmed':
                return '#17a2b8';
            case 'processing':
                return '#007bff';
            case 'ready':
                return '#28a745';
            case 'delivered':
                return '#28a745';
            case 'cancelled':
                return '#dc3545';
            default:
                return '#6c757d';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading your orders...</p>
            </div>
        );
    }

    return (
        <div className="order-history-container">
            <div className="history-header">
                <button className="back-btn" onClick={() => navigate('/patient-dashboard')}>
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <h1>My Order History</h1>
            </div>

            {error && (
                <div className="error-message">
                    <FaExclamationTriangle />
                    {error}
                </div>
            )}

            <div className="filter-section">
                <label>Filter by Status:</label>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="status-filter"
                >
                    <option value="">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div className="orders-list">
                {orders.length === 0 ? (
                    <div className="no-orders">
                        <FaBox />
                        <h3>No orders found</h3>
                        <p>You haven't placed any orders yet.</p>
                        <button onClick={() => navigate('/medicine-catalog')}>
                            Browse Medicines
                        </button>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="order-card">
                            <div className="order-header">
                                <div className="order-info">
                                    <h3>Order #{order.order_number}</h3>
                                    <p className="order-date">{formatDate(order.order_date)}</p>
                                    <p className="order-items">{order.item_count} items</p>
                                </div>
                                <div className="order-status">
                                    {getStatusIcon(order.status)}
                                    <span 
                                        className="status-text"
                                        style={{ color: getStatusColor(order.status) }}
                                    >
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="order-summary">
                                <div className="order-amount">
                                    <strong>Total: Rs. {order.total_amount}</strong>
                                </div>
                                <div className="order-actions">
                                    <button 
                                        className="view-details-btn"
                                        onClick={() => fetchOrderDetails(order.id)}
                                    >
                                        <FaEye /> View Details
                                    </button>
                                    {order.status === 'pending' && (
                                        <button 
                                            className="cancel-btn"
                                            onClick={() => cancelOrder(order.id)}
                                        >
                                            <FaTimes /> Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
                <div className="modal-overlay" onClick={() => setShowOrderDetails(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Order Details</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowOrderDetails(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="order-details">
                            <div className="detail-section">
                                <h3>Order Information</h3>
                                <p><strong>Order Number:</strong> {selectedOrder.order.order_number}</p>
                                <p><strong>Order Date:</strong> {formatDate(selectedOrder.order.order_date)}</p>
                                <p><strong>Status:</strong> 
                                    <span style={{ color: getStatusColor(selectedOrder.order.status) }}>
                                        {selectedOrder.order.status.charAt(0).toUpperCase() + selectedOrder.order.status.slice(1)}
                                    </span>
                                </p>
                                <p><strong>Total Amount:</strong> Rs. {selectedOrder.order.total_amount}</p>
                            </div>

                            {selectedOrder.order.delivery_address && (
                                <div className="detail-section">
                                    <h3>Delivery Information</h3>
                                    <p><strong>Address:</strong> {selectedOrder.order.delivery_address}</p>
                                    {selectedOrder.order.delivery_instructions && (
                                        <p><strong>Instructions:</strong> {selectedOrder.order.delivery_instructions}</p>
                                    )}
                                </div>
                            )}

                            <div className="detail-section">
                                <h3>Order Items</h3>
                                <div className="order-items">
                                    {selectedOrder.items.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <div className="item-info">
                                                <h4>{item.medicine_name}</h4>
                                                <p>Quantity: {item.quantity} {item.unit}</p>
                                                <p>Price: Rs. {item.unit_price} per {item.unit}</p>
                                            </div>
                                            <div className="item-total">
                                                Rs. {item.total_price}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOrder.order.notes && (
                                <div className="detail-section">
                                    <h3>Notes</h3>
                                    <p>{selectedOrder.order.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderHistory; 