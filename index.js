const express = require('express');
const cors = require('cors');
const app = express();

app.get('/', (req, res) => {
	res.send('Goals Microservice Test');
});

app.listen(4001, () => {
	console.log(`Server running on http://localhost:3000`);
});
