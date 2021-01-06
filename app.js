const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const keys = require('./config/keys');
const registerMail = require('./utils/mails/register_mail');
const remindPass = require('./utils/mails/remind_pass');
const authenticateToken = require('./authToken/authToken');
const createNewUuid = require('./utils/create_new_uuid');

const User = require('./database/models').user;
const conversationPermiss = require('./database/models').conversationPermiss;
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

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

app.get('/signup/:token', (req, res) => {
    User.findOne({
      where: {
        token: req.params.token,
      },
    }).then((user) => {
      if (!user) {
        res.json({
          success: false,
          message: 'Invalid token.',
        });
      }
      if (user.dataValues.active) {
        res.json({
          success: false,
          message: 'Account is already active.',
        });
      }
      User.update({
        active: true,
      }, {
        where: { id: user.dataValues.id },
      }).then(() => res.json({
        success: true,
        code: 200,
        message: 'Your account is active now. Please log in.',
      })).catch((err) => console.log(err));
    }).catch((err) => console.log(err));
})

app.post('/rememberpassword', (req, res) => {
    let tempPassword = "";
    crypto.randomBytes(5, (err, buf) => {
      if (err) throw err;
      return tempPassword = buf.toString('hex');
    });
      User.findOne({
          where: { email: req.body.email}
      }).then(user =>{
          if(user){
              if (user.dataValues.active) {
              
                  bcrypt.hash(tempPassword, 10, async (err, hash) => {
                    if(err){
                      console.log(err)
                    }else{
                      try{
                        User.update({
                            password: hash,
                        },{
                            where: { email: user.dataValues.email },
                        }).then(() => 
                            res.json({
                                success: true,
                                code: 200,
                                message: 'Your account is active now. Please log in.',
                            })
                        )
                        remindPass(user.dataValues.email,tempPassword)
                    }catch (err) {
                        return res.json({
                            success: false,
                            code: 404, //
                            message:'Failed'
                        })
                    }
                    }
                      console.log(tempPassword)
                  })
              }else{
                  return res.json({
                      success: false,
                      message: 'Account is not active. Check your email.',
                  });
              }
          }else{
              return res.json({
                  success: false,
                  code: 404,
                  message:'Failed'
              })
          }
      }).catch((err) => console.log(err));
})

app.post('/passwordchange', authenticateToken, (req, res) => {
    const actualPassword = req.body.actualPass
    const newPassword = req.body.newPassword
    User.findOne({
        where: {
            email: req.user.email
        }
    }).then(user => {
        bcrypt.compare(actualPassword, user.password, (err, result) => {
        if (err) {
            return res.json({
            success: false,
            code: 400,
            message: 'Actual password is wrong.'
            })
        } else {
            bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
                return res.json({
                success: false,
                code: 400,
                message: 'Problem with new password.'
                })
            } else {
                try {
                    User.update({
                        password: hash
                    }, {
                        where: { email: user.email }
                    }).then(() => {
                        return res.json({
                            success: true,
                            code: 200,
                            message: 'New password confirmed.'
                        })
                    })
                } catch (error) {
                    console.log(error)
                }
            }
            });
        }
        });
    });
})

app.post('/searchuser', (req, res) => {
    var id, i=0, helperVar, basic=5;
    var findedUsers = [];
    var moreCounter = req.body.more;
    const fnLiveSearching = async (name) => {
      await User.findAll({
        where:{
          name: { [Op.iLike]: `%${name}%` }
        },
      }).then(user =>{
        if(user.length == 0 || user == null){
          return res.json({
            success: false,
            code: 400,
            message:'User not exist.'
          })
        }else{
          user.forEach(element => {
            id = element.id
            name = element.name
            findedUsers[i] = {"id": id, "name": name}
            i++
          });
          if(findedUsers.length >= 5 && moreCounter == 1){
            helperVar = findedUsers.slice(0,4);
            return res.json({
              success: true,
              code: 200,
              findedUsers: helperVar
            })
          }else if(findedUsers.length >= 5 && moreCounter >= 1){
            moreCounter *= basic
            if(findedUsers.length < moreCounter){
              helperVar = findedUsers.slice(0, findedUsers.length);
              console.log(helperVar, 'x')
              return res.json({
                success: true,
                code: 200,
                findedUsers: helperVar
              })
            }else{
              return res.json({
                success: true,
                code: 200,
                findedUsers: findedUsers
              })
            }
          }else if(findedUsers.length < 5 ){
            return res.json({
              success: true,
              code: 200,
              findedUsers: findedUsers
            })
          }
        }
      })
    }
    if(req.body.name == ""){
      return res.json({
        success: false,
        code: 400,
        message:'Request cant be empty.'
      })
    }else{
      fnLiveSearching(req.body.name)
    }
})