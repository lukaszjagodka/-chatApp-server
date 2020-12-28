const express = require('express');
const app = express();

app.use(express.json());


app.get('/', (req, res) => {
    res.send('Hello')
  })

app.listen(3001, () =>{
    console.log("Server working");
  })