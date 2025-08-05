-- Ayurvedic Medicine Ordering System Database Schema
-- This file contains the database tables for the medicine ordering system

USE ayurweda;

-- Medicine Categories Table
CREATE TABLE IF NOT EXISTS medicine_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'unit',
    dosage_form VARCHAR(100), -- tablet, syrup, powder, etc.
    active_ingredients TEXT,
    therapeutic_effects TEXT,
    contraindications TEXT,
    side_effects TEXT,
    storage_instructions TEXT,
    expiry_date DATE,
    manufacturer VARCHAR(255),
    is_prescription_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES medicine_categories(id) ON DELETE SET NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address TEXT,
    delivery_instructions TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    prescription_required BOOLEAN DEFAULT FALSE,
    prescription_uploaded BOOLEAN DEFAULT FALSE,
    prescription_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT,
    prescription_date DATE NOT NULL,
    diagnosis TEXT,
    medicines_prescribed TEXT,
    dosage_instructions TEXT,
    duration VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(user_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category_id);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON medicines(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_medicine ON order_items(medicine_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);

-- Insert sample medicine categories
INSERT INTO medicine_categories (name, description) VALUES
('Herbal Medicines', 'Traditional herbal preparations for various ailments'),
('Ayurvedic Oils', 'Medicated oils for external application and massage'),
('Powders and Churnas', 'Fine powders for internal consumption'),
('Tablets and Pills', 'Compressed medicines in tablet form'),
('Syrups and Tonics', 'Liquid medicines for easy consumption'),
('External Applications', 'Ointments, creams, and external medicines');

-- Insert sample medicines
INSERT INTO medicines (name, description, category_id, price, stock_quantity, unit, dosage_form, active_ingredients, therapeutic_effects) VALUES
('Triphala Churna', 'Traditional three-fruit powder for digestive health', 3, 150.00, 100, 'gram', 'powder', 'Haritaki, Bibhitaki, Amalaki', 'Digestive health, detoxification'),
('Ashwagandha Tablets', 'Stress relief and energy booster tablets', 4, 250.00, 50, 'tablet', 'tablet', 'Withania somnifera', 'Stress relief, energy boost'),
('Sesame Oil (Tila Taila)', 'Medicated sesame oil for massage', 2, 300.00, 30, 'ml', 'oil', 'Sesame oil, herbs', 'Pain relief, relaxation'),
('Ginger Tea', 'Natural ginger tea for cold and cough', 5, 120.00, 75, 'pack', 'tea', 'Zingiber officinale', 'Cold relief, digestion'),
('Neem Tablets', 'Blood purifier and skin health tablets', 4, 180.00, 60, 'tablet', 'tablet', 'Azadirachta indica', 'Blood purification, skin health'),
('Turmeric Powder', 'Anti-inflammatory turmeric powder', 3, 200.00, 80, 'gram', 'powder', 'Curcuma longa', 'Anti-inflammatory, immunity'),
('Brahmi Syrup', 'Memory and brain health syrup', 5, 350.00, 40, 'ml', 'syrup', 'Bacopa monnieri', 'Memory enhancement, brain health'),
('Eucalyptus Oil', 'Respiratory relief essential oil', 2, 280.00, 25, 'ml', 'oil', 'Eucalyptus globulus', 'Respiratory relief, congestion'),
('Amla Juice', 'Vitamin C rich amla juice', 5, 220.00, 35, 'ml', 'juice', 'Emblica officinalis', 'Immunity boost, vitamin C'),
('Shatavari Powder', 'Women health and hormonal balance', 3, 180.00, 45, 'gram', 'powder', 'Asparagus racemosus', 'Women health, hormonal balance');

-- Insert sample prescription
INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, diagnosis, medicines_prescribed, dosage_instructions, duration) VALUES
(1, 1, CURDATE(), 'Digestive issues and stress', 'Triphala Churna, Ashwagandha Tablets', 'Take Triphala 1 tsp with warm water at night. Ashwagandha 1 tablet twice daily', '30 days'); 