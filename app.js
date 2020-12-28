const express = require('express');
const app = express();

app.use(express.json());

app.listen(3001, () =>{
    console.log("Server working");
})

app.post('/signup', (req, res) => {
    res.send('Signup')
})

app.post('/login', (req, res) => {
    res.send('Login')
})