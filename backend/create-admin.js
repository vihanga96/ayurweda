const bcrypt = require('bcryptjs');
const db = require('./db');

const createAdminUsers = async () => {
    try {
        // Admin users to create
        const adminUsers = [
            {
                name: 'System Administrator',
                email: 'admin@ayurweda.com',
                password: 'admin123',
                role: 'admin'
            },
            {
                name: 'Ayurweda Manager',
                email: 'manager@ayurweda.com',
                password: 'manager123',
                role: 'admin'
            }
        ];

        for (const user of adminUsers) {
            // Check if user already exists
            db.query('SELECT email FROM users WHERE email = ?', [user.email], async (err, results) => {
                if (err) {
                    console.error('Error checking user:', err);
                    return;
                }

                if (results.length > 0) {
                    console.log(`Admin user ${user.email} already exists`);
                    return;
                }

                // Hash password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.password, salt);

                // Create user object
                const newUser = {
                    name: user.name,
                    email: user.email,
                    password: hashedPassword,
                    role: user.role
                };

                // Insert user
                db.query('INSERT INTO users SET ?', newUser, (err, result) => {
                    if (err) {
                        console.error('Error creating admin user:', err);
                        return;
                    }
                    console.log(`Admin user ${user.email} created successfully`);
                });
            });
        }

        console.log('Admin user creation process completed');
    } catch (error) {
        console.error('Error creating admin users:', error);
    }
};

// Run the script
createAdminUsers();

// Close database connection after 5 seconds
setTimeout(() => {
    db.end();
    console.log('Database connection closed');
}, 5000); 