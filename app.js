const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

const User = require('./database/models').user;

app.use(express.json());

app.listen(3001, () =>{
    console.log("Server working");
})

app.post('/signup', (req, res) => {
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password

    User.findOne({where:{ email: email }})
    .then(emailUser =>{
        if(emailUser == null){
            let token = null;
            crypto.randomBytes(45, (err, buf) => {
                if (err) throw err;
                return token = buf.toString('hex')
              });
            bcrypt.hash(password, 10, async (err, hash) => {
                try {
                    await User.create({
                        name,
                        email,
                        password: hash,
                        active: true,
                        token: token
                    },{
                        fields: ['name','email','password', 'active', 'token']
                    }).then(user => {
                        
                        return res.json({
                            success: true,
                            code: 200
                        })
                    }).catch(err => console.log(err))
                }catch (err) {
                    console.error(err);
                }
            })
        }else{
            return res.sendStatus(400);
        }
    })
})

app.post('/login', (req, res) => {
    User.findOne({where: { email: req.body.email}})
    .then(user =>{
        if(user == null){
            return res.sendStatus(404)
        }else{ 
            bcrypt.compare(req.body.password, user.dataValues.password, (err, result) => {
                if(err){
                    console.log(err)
                }
                if(result){
                    console.log('zalogowany:', user.dataValues.email)
                    var claims = {
                        iss: 'http://chatapp.com/',
                        email: req.body.email,
                        name: user.dataValues.name
                    }
                    const jwtToken = jwt.sign(claims,  keys.access_token_secret.tokenKey.toString());
                    try {
                        User.update({
                          authToken: jwtToken,
                        }, {
                            where: { email: user.email }
                        });
                        return res.json({
                            success: true,
                            code: 200,
                            jwtToken
                        })
                    } catch (err) {
                        return res.json({
                            success: false,
                            code: 404,
                            message:'Failed'
                        })
                    }
                }else{
                    return res.sendStatus(404)
                }
            })
        }
    })
})