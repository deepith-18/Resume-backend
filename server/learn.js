const express = require('express');
const app = express();

//Middleware
app.use(express.json());

//Get route
app.get('/users' ,(req,res)=>{
    res.json({message:"Get all the users"})
});

//Post route
app.post('/users',(req,res)=>{
    const data = req.body;
    res.json({message:"user created",data});
});

app.listen(3000,()=>{console.log("Server is running on port 3000")});
