import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaFilter, FaShoppingCart, FaEye, FaArrowLeft, FaLeaf, FaPills, FaFlask, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';
import axios from 'axios';
import './MedicineCatalog.css';

// Get auth token from localStorage
const getAuthToken = () => {
    return localStorage.getItem('token');
};

const MedicineCatalog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [medicines, setMedicines] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [showFilters, setShowFilters] = useState(false);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

    // Load cart from database on component mount
    useEffect(() => {
        loadCartFromDatabase();
    }, []);

    const loadCartFromDatabase = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No auth token found, skipping cart load');
                return;
            }

            const response = await axios.get('http://localhost:5001/api/medicine/cart', {
                headers: { 'x-auth-token': token }
            });
            
            console.log('Cart loaded from database:', response.data.cart_items);
            // Ensure all cart items have proper numeric values
            const processedCart = response.data.cart_items.map(item => ({
                ...item,
                unit_price: parseFloat(item.unit_price) || 0,
                quantity: parseInt(item.quantity) || 0,
                total_price: parseFloat(item.total_price) || 0
            }));
            console.log('Processed cart items:', processedCart);
            setCart(processedCart);
        } catch (err) {
            console.error('Error loading cart from database:', err);
            // If unauthorized, user might not be logged in
            if (err.response?.status !== 401) {
                setError('Failed to load cart items');
            }
        }
    }, []);

    // Reload cart when component becomes visible (for when returning from other pages)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('Page became visible, refreshing cart...');
                loadCartFromDatabase();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Also reload cart when the component mounts or when the page gains focus
        const handleFocus = () => {
            console.log('Page gained focus, refreshing cart...');
            loadCartFromDatabase();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    // Cart is now managed by the database, no need to save to localStorage

    // Check for prescription medicines from navigation state
    useEffect(() => {
        if (location.state?.prescriptionMedicines) {
            const prescriptionMedicines = location.state.prescriptionMedicines;
            console.log('Adding prescription medicines to cart:', prescriptionMedicines);
            // Clear the state to prevent re-adding on refresh
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, navigate, location.pathname]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/medicine/categories');
            setCategories(response.data.categories);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchMedicines = useCallback(async () => {
        try {
            setLoading(true);
            setError(''); // Clear any previous errors
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory);
            if (sortBy) params.append('sort', sortBy);

            const url = `http://localhost:5001/api/medicine/medicines?${params}`;
            console.log('Fetching medicines from:', url);
            
            const response = await axios.get(url);
            console.log('Medicines response:', response.data);
            setMedicines(response.data.medicines);
        } catch (err) {
            console.error('Error fetching medicines:', err);
            setError('Failed to fetch medicines. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, selectedCategory, sortBy]);

    const addToCart = useCallback(async (medicine) => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Please log in to add items to cart');
                return;
            }

            const response = await axios.post('http://localhost:5001/api/medicine/cart', {
                medicine_id: medicine.id,
                quantity: 1
            }, {
                headers: { 'x-auth-token': token }
            });

            console.log('Item added to cart:', response.data);
            
            // Reload cart from database
            await loadCartFromDatabase();
            setShowCart(true);
        } catch (err) {
            console.error('Error adding to cart:', err);
            if (err.response?.status === 401) {
                setError('Please log in to add items to cart');
            } else {
                setError('Failed to add item to cart');
            }
        }
    }, [loadCartFromDatabase]);

    useEffect(() => {
        fetchCategories();
        // Initial load without search
        const loadInitialMedicines = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axios.get('http://localhost:5001/api/medicine/medicines');
                setMedicines(response.data.medicines);
            } catch (err) {
                console.error('Error fetching initial medicines:', err);
                setError('Failed to fetch medicines. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialMedicines();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMedicines();
        }, 500); // Increased debounce to 500ms

        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedCategory, sortBy]);

    const removeFromCart = useCallback(async (cartItemId) => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Please log in to manage cart');
                return;
            }

            await axios.delete(`http://localhost:5001/api/medicine/cart/${cartItemId}`, {
                headers: { 'x-auth-token': token }
            });

            console.log('Item removed from cart');
            await loadCartFromDatabase();
        } catch (err) {
            console.error('Error removing from cart:', err);
            setError('Failed to remove item from cart');
        }
    }, [loadCartFromDatabase]);

    const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Please log in to manage cart');
                return;
            }

            await axios.put(`http://localhost:5001/api/medicine/cart/${cartItemId}`, {
                quantity: newQuantity
            }, {
                headers: { 'x-auth-token': token }
            });

            console.log('Cart item quantity updated');
            await loadCartFromDatabase();
        } catch (err) {
            console.error('Error updating cart quantity:', err);
            setError('Failed to update cart quantity');
        }
    }, [loadCartFromDatabase]);

    const clearCart = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Please log in to manage cart');
                return;
            }

            await axios.delete('http://localhost:5001/api/medicine/cart', {
                headers: { 'x-auth-token': token }
            });

            console.log('Cart cleared');
            setCart([]);
        } catch (err) {
            console.error('Error clearing cart:', err);
            setError('Failed to clear cart');
        }
    }, []);

    // refreshCart function removed as it's no longer needed

    const getCategoryIcon = (categoryName) => {
        switch (categoryName?.toLowerCase()) {
            case 'herbal medicines':
                return <FaLeaf />;
            case 'tablets and pills':
                return <FaPills />;
            case 'syrups and tonics':
                return <FaFlask />;
            default:
                return <FaLeaf />;
        }
    };

    const getTotalCartValue = () => {
        return cart.reduce((total, item) => {
            const unitPrice = parseFloat(item.unit_price) || 0;
            const quantity = parseInt(item.quantity) || 0;
            return total + (unitPrice * quantity);
        }, 0);
    };

    const handleCheckout = () => {
        alert('Checkout button was clicked!');
        window.location.href = '/medicine-order';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Ayurvedic medicines...</p>
            </div>
        );
    }

    return (
        <div className="medicine-catalog-container">
            <div className="catalog-header">
                <button className="back-btn" onClick={() => navigate('/patient-dashboard')}>
                    <FaArrowLeft />
                </button>
                <div className="header-title">
                    <FaLeaf />
                    <h1>Ayurvedic Medicine Catalog</h1>
                </div>
                <div className="cart-button" onClick={() => setShowCart(!showCart)}>
                    <FaShoppingCart />
                    {cart.length > 0 && (
                        <span className="cart-count">{cart.length}</span>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}

            <div className="catalog-content">
                <div className="filters-section">
                    <div className="search-bar">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search medicines by name, description, or ingredients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    fetchMedicines();
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                }
                            }}
                        />
                        {searchTerm && (
                            <button 
                                className="clear-search"
                                onClick={() => setSearchTerm('')}
                                title="Clear search"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                    
                    <button 
                        className="filter-toggle"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FaFilter />
                        Filters
                    </button>
                    
                    {showFilters && (
                        <div className="filters-panel">
                            <div className="filter-group">
                                <label>Category</label>
                                <select 
                                    value={selectedCategory} 
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="filter-group">
                                <label>Sort By</label>
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="name">Name</option>
                                    <option value="price_low">Price: Low to High</option>
                                    <option value="price_high">Price: High to Low</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="medicines-grid">
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Searching medicines...</p>
                        </div>
                    ) : medicines.length === 0 ? (
                        <div className="no-medicines">
                            <FaLeaf />
                            <h3>No medicines found</h3>
                            <p>Try adjusting your search terms or filters</p>
                        </div>
                    ) : (
                        medicines.map(medicine => (
                        <div key={medicine.id} className="medicine-card">
                            <div className="medicine-image">
                                {medicine.image_url ? (
                                    <img src={medicine.image_url} alt={medicine.name} />
                                ) : (
                                    <div className="medicine-placeholder">
                                        {getCategoryIcon(medicine.category_name)}
                                    </div>
                                )}
                                {medicine.is_prescription_required && (
                                    <div className="prescription-badge">
                                        Prescription Required
                                    </div>
                                )}
                            </div>
                            
                            <div className="medicine-info">
                                <h3 className="medicine-name">{medicine.name}</h3>
                                <p className="medicine-description">{medicine.description}</p>
                                
                                <div className="medicine-details">
                                    <span className="category">{medicine.category_name}</span>
                                    <span className="price">Rs. {medicine.price}</span>
                                </div>
                                
                                <div className="medicine-actions">
                                    <button 
                                        className="view-btn"
                                        onClick={() => {/* Add view details functionality */}}
                                        title="View Details"
                                    >
                                        <FaEye />
                                    </button>
                                    <button 
                                        className="add-to-cart-btn"
                                        onClick={() => addToCart(medicine)}
                                        title="Add to Cart"
                                    >
                                        <FaShoppingCart />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                    )}
                </div>
            </div>

            {showCart && (
                <div className="cart-sidebar">
                    <div className="cart-header">
                        <h3>Shopping Cart ({cart.length} items)</h3>
                        <button className="close-cart" onClick={() => setShowCart(false)}>
                            <FaTimes />
                        </button>
                    </div>
                    
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <FaShoppingCart />
                            <p>Your cart is empty</p>
                            <p>Add some medicines to get started</p>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {cart.map(item => (
                                    <div key={item.cart_item_id} className="cart-item">
                                        <div className="cart-item-info">
                                            <h4>{item.medicine_name}</h4>
                                            <p>Rs. {item.unit_price} per {item.unit}</p>
                                        </div>
                                        <div className="cart-item-quantity">
                                            <button onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}>
                                                <FaMinus />
                                            </button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}>
                                                <FaPlus />
                                            </button>
                                        </div>
                                        <div className="cart-item-total">
                                            Rs. {(parseFloat(item.total_price) || 0).toFixed(2)}
                                        </div>
                                        <button 
                                            className="remove-btn"
                                            onClick={() => removeFromCart(item.cart_item_id)}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="cart-footer">
                                <div className="cart-total">
                                    <span>Total:</span>
                                    <span>Rs. {getTotalCartValue().toFixed(2)}</span>
                                </div>
                                
                                <div className="cart-actions">
                                    <button className="clear-cart-btn" onClick={clearCart}>
                                        Clear Cart
                                    </button>
                                    <button 
                                        className="checkout-btn" 
                                        onClick={() => {
                                            navigate('/medicine-order', { state: { cart: cart } });
                                        }}
                                    >
                                        Proceed to Checkout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MedicineCatalog; 