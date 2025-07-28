const express = require('express');
const app = express();
const port = 5001;

console.log('Starting test server...');

app.get('/', (req, res) => {
    console.log('Test endpoint hit');
    res.send('Test server is working!');
});

app.listen(port, () => {
    console.log(`Test server is running on port: ${port}`);
}); 