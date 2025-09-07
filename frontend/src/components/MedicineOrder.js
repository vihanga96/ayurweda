import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCreditCard, FaTruck, FaFileUpload, FaCheckCircle, FaExclamationTriangle, FaClock, FaShieldAlt, FaHome, FaComment, FaTrash, FaLeaf, FaNotesMedical } from 'react-icons/fa';
import axios from 'axios';
import './MedicineOrder.css';

const MedicineOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState([]);
    
    const [orderData, setOrderData] = useState({
        delivery_address: '',
        delivery_instructions: '',
        consultation_notes: '',
        payment_method: 'cash_on_delivery'
    });
    
    const [prescriptions, setPrescriptions] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [, setPatientPrescriptions] = useState([]);

    // Load cart from navigation state or localStorage
    useEffect(() => {
        let cartData = location.state?.cart || [];
        
        console.log('MedicineOrder: Received cart data:', cartData);
        
        // If no cart in navigation state, try to load from localStorage
        if (!cartData || cartData.length === 0) {
            const savedCart = localStorage.getItem('medicineCart');
            if (savedCart) {
                try {
                    cartData = JSON.parse(savedCart);
                } catch (err) {
                    console.error('Error parsing saved cart:', err);
                    localStorage.removeItem('medicineCart');
                }
            }
        }
        
        // Handle database cart structure
        if (cartData && cartData.length > 0) {
            // Convert database cart items to expected format
            const processedCart = cartData.map(item => ({
                id: item.medicine_id || item.id,
                medicine_id: item.medicine_id || item.id, // Keep medicine_id for order submission
                name: item.medicine_name || item.name,
                unit_price: parseFloat(item.unit_price) || 0,
                quantity: parseInt(item.quantity) || 0,
                total_price: parseFloat(item.total_price) || 0,
                prescription_required: item.is_prescription_required || false,
                description: item.medicine_description || item.description
            }));
            setCart(processedCart);
        } else {
            setCart([]);
        }
    }, [location.state]);

    useEffect(() => {
        console.log('MedicineOrder: Cart state changed:', cart);
        if (!cart || cart.length === 0) {
            console.log('MedicineOrder: Cart is empty, but not redirecting for testing');
            // navigate('/medicine-catalog');
            // return;
        }
        fetchPatientPrescriptions();
    }, [cart, navigate]);

    const fetchPatientPrescriptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/medicine/prescriptions', {
                headers: { 'x-auth-token': token }
            });
            setPatientPrescriptions(response.data.prescriptions);
        } catch (err) {
            console.error('Error fetching prescriptions:', err);
        }
    };

    const handleInputChange = (e) => {
        setOrderData({
            ...orderData,
            [e.target.name]: e.target.value
        });
    };

    const handlePrescriptionUpload = (medicineId, file) => {
        setPrescriptions({
            ...prescriptions,
            [medicineId]: file
        });
    };

    const validateOrder = () => {
        if (!orderData.delivery_address.trim()) {
            setError('Please provide a delivery address');
            return false;
        }

        // Check if prescription is required but not uploaded
        const prescriptionRequiredItems = cart.filter(item => item.prescription_required);
        for (let item of prescriptionRequiredItems) {
            if (!prescriptions[item.medicine_id]) {
                setError(`Prescription is required for ${item.name}`);
                return false;
            }
        }

        return true;
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    };

    const clearCart = () => {
        localStorage.removeItem('medicineCart');
    };

    const handleSubmitOrder = async () => {
        if (!validateOrder()) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const orderPayload = {
                items: cart.map(item => ({
                    medicine_id: item.medicine_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    prescription_required: item.prescription_required
                })),
                delivery_address: orderData.delivery_address,
                delivery_instructions: orderData.delivery_instructions,
                notes: orderData.consultation_notes
            };

            console.log('Order payload:', orderPayload);
            console.log('Cart items being sent:', cart.map(item => ({ 
                medicine_id: item.medicine_id, 
                id: item.id, 
                name: item.name 
            })));

            await axios.post('http://localhost:5001/api/medicine/orders', orderPayload, {
                headers: { 'x-auth-token': token }
            });

            setSuccess('Order placed successfully!');
            
            // Clear the cart after successful order
            clearCart();
            
            setTimeout(() => {
                navigate('/order-history');
            }, 2000);

        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    if (!cart || cart.length === 0) {
        return (
            <div className="medicine-order-container">
                <div className="empty-cart">
                    <FaExclamationTriangle />
                    <h2>Your cart is empty</h2>
                    <p>Please add some Ayurvedic medicines to your cart before proceeding to checkout.</p>
                    <button onClick={() => navigate('/medicine-catalog')}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="medicine-order-container">
            <div className="checkout-header">
                <button className="back-btn" onClick={() => navigate('/medicine-catalog')}>
                    <FaArrowLeft /> Back
                </button>
                <h1>Complete Your Order</h1>
            </div>

            {error && (
                <div className="error-message">
                    <FaExclamationTriangle />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="success-message">
                    <FaCheckCircle />
                    <span>{success}</span>
                </div>
            )}

            <div className="checkout-content">
                <div className="checkout-left">
                    {/* Delivery Information */}
                    <div className="address-section">
                        <div className="form-group">
                            <label>
                                <FaHome />
                                Delivery Address
                            </label>
                            <input
                                type="text"
                                name="delivery_address"
                                value={orderData.delivery_address}
                                onChange={handleInputChange}
                                placeholder="Enter your complete delivery address..."
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FaComment />
                                Special Instructions
                            </label>
                            <input
                                type="text"
                                name="delivery_instructions"
                                value={orderData.delivery_instructions}
                                onChange={handleInputChange}
                                placeholder="Any special delivery instructions..."
                            />
                        </div>
                    </div>

                    {/* Consultation Notes */}
                    <div className="consultation-section">
                        <div className="form-group">
                            <label>
                                <FaNotesMedical />
                                Consultation Notes
                            </label>
                            <textarea
                                name="consultation_notes"
                                value={orderData.consultation_notes}
                                onChange={handleInputChange}
                                placeholder="Any health concerns, symptoms, or consultation notes for the Ayurvedic practitioner..."
                                rows="3"
                            />
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="cart-section">
                        <div className="cart-header">
                            <span>Medicine</span>
                            <span>Price</span>
                            <span>Quantity</span>
                            <span>Total</span>
                            <span></span>
                        </div>
                        
                        <div className="cart-items">
                            {cart.map((item, index) => (
                                <div key={index} className="cart-item">
                                    <div className="item-description">
                                        <span className="item-name">{item.name}</span>
                                        {item.prescription_required && (
                                            <span className="prescription-badge">Prescription Required</span>
                                        )}
                                        <span className="ayurveda-type">Ayurvedic Medicine</span>
                                    </div>
                                    <div className="item-price">Rs. {item.unit_price}</div>
                                    <div className="item-quantity">{item.quantity}</div>
                                    <div className="item-total">Rs. {(item.unit_price * item.quantity).toFixed(2)}</div>
                                    <button className="remove-btn" disabled>
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Prescription Uploads */}
                    {cart.some(item => item.prescription_required) && (
                        <div className="prescription-section">
                            <h3>Prescription Uploads</h3>
                            {cart.filter(item => item.prescription_required).map((item, index) => (
                                <div key={index} className="prescription-upload">
                                    <div className="upload-header">
                                        <FaFileUpload />
                                        <span>{item.name}</span>
                                    </div>
                                    <label className="upload-btn">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => handlePrescriptionUpload(item.medicine_id, e.target.files[0])}
                                        />
                                        {prescriptions[item.medicine_id] ? 'Change File' : 'Upload Prescription'}
                                    </label>
                                    {prescriptions[item.medicine_id] && (
                                        <span className="upload-success">
                                            <FaCheckCircle /> Uploaded
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Payment Method */}
                    <div className="payment-section">
                        <h3>Payment Method</h3>
                        <div className="payment-options">
                            <label className="payment-option">
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cash_on_delivery"
                                    checked={orderData.payment_method === 'cash_on_delivery'}
                                    onChange={handleInputChange}
                                />
                                <div className="option-content">
                                    <FaTruck />
                                    <div>
                                        <span className="option-title">Cash on Delivery</span>
                                        <span className="option-desc">Pay when you receive your order</span>
                                    </div>
                                </div>
                            </label>
                            
                            <label className="payment-option">
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="online_payment"
                                    checked={orderData.payment_method === 'online_payment'}
                                    onChange={handleInputChange}
                                />
                                <div className="option-content">
                                    <FaCreditCard />
                                    <div>
                                        <span className="option-title">Online Payment</span>
                                        <span className="option-desc">Pay securely with card or UPI</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="checkout-right">
                    <div className="total-summary">
                        <div className="total-amount">
                            <span className="amount">Rs. {calculateTotal().toFixed(2)}</span>
                            <span className="label">Total Amount</span>
                        </div>
                    </div>

                    <div className="order-actions">
                        <div className="delivery-info">
                            <FaClock />
                            <span>Estimated delivery: 3-5 business days</span>
                        </div>
                        
                        <div className="ayurveda-info">
                            <FaLeaf />
                            <span>100% Natural Ayurvedic Medicines</span>
                        </div>
                        
                        <button 
                            className="place-order-btn"
                            onClick={handleSubmitOrder}
                            disabled={loading}
                        >
                            {loading ? 'Placing Order...' : 'Place Order'}
                        </button>
                        
                        <div className="security-note">
                            <FaShieldAlt />
                            <span>Your health information is secure and confidential</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicineOrder; 