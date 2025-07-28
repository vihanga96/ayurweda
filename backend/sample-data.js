const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Sample doctors data
const sampleDoctors = [
    {
        name: 'Dr. Rajesh Kumar',
        email: 'dr.rajesh@ayurweda.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'doctor',
        specialization: 'Ayurvedic Medicine',
        experience_years: 15,
        consultation_fee: 2500
    },
    {
        name: 'Dr. Priya Sharma',
        email: 'dr.priya@ayurweda.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'doctor',
        specialization: 'Panchakarma Therapy',
        experience_years: 12,
        consultation_fee: 3500
    },
    {
        name: 'Dr. Amit Patel',
        email: 'dr.amit@ayurweda.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'doctor',
        specialization: 'Herbal Medicine',
        experience_years: 10,
        consultation_fee: 2000
    }
];

// Sample schedules
const sampleSchedules = [
    // Dr. Rajesh Kumar - Monday to Friday, 9 AM to 5 PM
    { day_of_week: 'monday', start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'tuesday', start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'wednesday', start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'thursday', start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'friday', start_time: '09:00', end_time: '17:00' },
    
    // Dr. Priya Sharma - Monday to Saturday, 10 AM to 6 PM
    { day_of_week: 'monday', start_time: '10:00', end_time: '18:00' },
    { day_of_week: 'tuesday', start_time: '10:00', end_time: '18:00' },
    { day_of_week: 'wednesday', start_time: '10:00', end_time: '18:00' },
    { day_of_week: 'thursday', start_time: '10:00', end_time: '18:00' },
    { day_of_week: 'friday', start_time: '10:00', end_time: '18:00' },
    { day_of_week: 'saturday', start_time: '10:00', end_time: '18:00' },
    
    // Dr. Amit Patel - Tuesday to Saturday, 8 AM to 4 PM
    { day_of_week: 'tuesday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: 'wednesday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: 'thursday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: 'friday', start_time: '08:00', end_time: '16:00' },
    { day_of_week: 'saturday', start_time: '08:00', end_time: '16:00' }
];

async function insertSampleData() {
    try {
        console.log('Connecting to database...');
        
        for (let i = 0; i < sampleDoctors.length; i++) {
            const doctor = sampleDoctors[i];
            
            // Insert user
            const userQuery = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
            const [userResult] = await db.promise().query(userQuery, [
                doctor.name, doctor.email, doctor.password, doctor.role
            ]);
            
            console.log(`Created user: ${doctor.name}`);
            
            // Insert doctor record
            const doctorQuery = 'INSERT INTO doctors (user_id, specialization, experience_years, consultation_fee) VALUES (?, ?, ?, ?)';
            const [doctorResult] = await db.promise().query(doctorQuery, [
                userResult.insertId, doctor.specialization, doctor.experience_years, doctor.consultation_fee
            ]);
            
            console.log(`Created doctor record for: ${doctor.name}`);
            
            // Insert schedules
            const scheduleStartIndex = i * 5; // 5 schedules per doctor (except last one)
            const schedulesToInsert = sampleSchedules.slice(scheduleStartIndex, scheduleStartIndex + 5);
            
            for (const schedule of schedulesToInsert) {
                const scheduleQuery = 'INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)';
                await db.promise().query(scheduleQuery, [
                    doctorResult.insertId, schedule.day_of_week, schedule.start_time, schedule.end_time
                ]);
            }
            
            console.log(`Created schedules for: ${doctor.name}`);
        }
        
        console.log('Sample data inserted successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('Error inserting sample data:', error);
        process.exit(1);
    }
}

// Run the script
insertSampleData(); 