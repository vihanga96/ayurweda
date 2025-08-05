-- Ayurverda Database Setup Script
-- Run this script to initialize the complete database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ayurweda;
USE ayurweda;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'patient', 'student') NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    experience_years INT NOT NULL,
    consultation_fee DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    bio TEXT,
    qualifications TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Doctor schedules table
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    consultation_type ENUM('in-person', 'video', 'phone') DEFAULT 'in-person',
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    symptoms TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Consultation notes table
CREATE TABLE IF NOT EXISTS consultation_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    diagnosis TEXT,
    prescription TEXT,
    treatment_plan TEXT,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Medicine inventory table
CREATE TABLE IF NOT EXISTS medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    manufacturer VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    record_type ENUM('allergy', 'condition', 'medication', 'procedure', 'test') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_recorded DATE NOT NULL,
    doctor_id INT,
    file_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);
CREATE INDEX idx_doctor_schedules_day ON doctor_schedules(day_of_week);
CREATE INDEX idx_medicines_category ON medicines(category);
CREATE INDEX idx_medicines_available ON medicines(is_available);
CREATE INDEX idx_orders_patient_id ON orders(patient_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);

-- Insert sample data

-- Admin users
INSERT INTO users (name, email, password, role) VALUES
('System Administrator', 'admin@ayurweda.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Ayurweda Manager', 'manager@ayurweda.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Sample doctors
INSERT INTO users (name, email, password, role, phone) VALUES
('Dr. Rajesh Kumar', 'dr.rajesh@ayurweda.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', '+94 11 234 5678'),
('Dr. Priya Sharma', 'dr.priya@ayurweda.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', '+94 11 234 5679'),
('Dr. Amit Patel', 'dr.amit@ayurweda.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', '+94 11 234 5680')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert doctor records
INSERT INTO doctors (user_id, specialization, experience_years, consultation_fee, bio) VALUES
((SELECT id FROM users WHERE email = 'dr.rajesh@ayurweda.com'), 'Ayurvedic Medicine', 15, 2500, 'Specialized in traditional Ayurvedic treatments with 15 years of experience'),
((SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com'), 'Panchakarma Therapy', 12, 3500, 'Expert in Panchakarma detoxification and rejuvenation therapies'),
((SELECT id FROM users WHERE email = 'dr.amit@ayurweda.com'), 'Herbal Medicine', 10, 2000, 'Specialized in herbal formulations and natural remedies')
ON DUPLICATE KEY UPDATE specialization = VALUES(specialization);

-- Insert sample schedules
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.rajesh@ayurweda.com')), 'monday', '09:00', '17:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.rajesh@ayurweda.com')), 'tuesday', '09:00', '17:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.rajesh@ayurweda.com')), 'wednesday', '09:00', '17:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.rajesh@ayurweda.com')), 'thursday', '09:00', '17:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.rajesh@ayurweda.com')), 'friday', '09:00', '17:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com')), 'monday', '10:00', '18:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com')), 'tuesday', '10:00', '18:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com')), 'wednesday', '10:00', '18:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com')), 'thursday', '10:00', '18:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com')), 'friday', '10:00', '18:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.priya@ayurweda.com')), 'saturday', '10:00', '18:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.amit@ayurweda.com')), 'tuesday', '08:00', '16:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.amit@ayurweda.com')), 'wednesday', '08:00', '16:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.amit@ayurweda.com')), 'thursday', '08:00', '16:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.amit@ayurweda.com')), 'friday', '08:00', '16:00'),
((SELECT id FROM doctors WHERE user_id = (SELECT id FROM users WHERE email = 'dr.amit@ayurweda.com')), 'saturday', '08:00', '16:00')
ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time);

-- Sample medicines
INSERT INTO medicines (name, description, category, price, stock_quantity, unit, manufacturer) VALUES
('Ashwagandha Powder', 'Traditional herb for stress relief and energy', 'Herbs', 1500.00, 100, '100g', 'Ayurweda Herbs'),
('Triphala Churna', 'Digestive health and detoxification', 'Digestive', 800.00, 150, '200g', 'Ayurweda Herbs'),
('Brahmi Capsules', 'Memory enhancement and brain health', 'Brain Health', 1200.00, 80, '60 capsules', 'Ayurweda Herbs'),
('Neem Oil', 'Skin care and purification', 'Skin Care', 950.00, 120, '100ml', 'Ayurweda Herbs'),
('Sesame Oil', 'Traditional massage and therapy oil', 'Oils', 750.00, 200, '250ml', 'Ayurweda Herbs'),
('Ginger Tea', 'Digestive and immunity support', 'Teas', 450.00, 300, '50 bags', 'Ayurweda Herbs'),
('Turmeric Powder', 'Anti-inflammatory and immunity booster', 'Immunity', 650.00, 180, '100g', 'Ayurweda Herbs'),
('Amla Juice', 'Vitamin C rich immunity booster', 'Juices', 1200.00, 90, '500ml', 'Ayurweda Herbs')
ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity);

SELECT 'Database setup completed successfully!' as message; 