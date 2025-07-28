const db = require('./db');

const addCreatedAtColumn = () => {
    console.log('Adding created_at column to users table...');
    
    const alterQuery = `
        ALTER TABLE users 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `;
    
    db.query(alterQuery, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('created_at column already exists');
            } else {
                console.error('Error adding created_at column:', err);
            }
        } else {
            console.log('created_at column added successfully');
        }
        
        // Update existing records to have a created_at value
        const updateQuery = `
            UPDATE users 
            SET created_at = CURRENT_TIMESTAMP 
            WHERE created_at IS NULL
        `;
        
        db.query(updateQuery, (err, result) => {
            if (err) {
                console.error('Error updating existing records:', err);
            } else {
                console.log('Updated existing records with created_at timestamp');
            }
            
            // Close database connection
            db.end();
            console.log('Database connection closed');
        });
    });
};

// Run the script
addCreatedAtColumn(); 