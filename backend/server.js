const express = require('express');
const cors = require('cors');

console.log('Starting server.js...');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
console.log('CORS enabled');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
console.log('Registering routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/medicine', require('./routes/medicine'));

app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.send('Hello from the backend!');
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});