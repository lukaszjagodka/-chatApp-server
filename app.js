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
const temporaryMessages = require('./database/models').temporaryMessages;
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

app.use(express.json());

const WebSocket = require('ws');
const server = require('http').createServer(app);

const wss = new WebSocket.Server({ server: server });
var sockets = {}

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", function connection(ws, req) {
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  console.log("new client conn " +req.socket.remoteAddress);
  const id = req.socket.remoteAddress;
  console.log(wss.clients.size)

  ws.on("close", (code, reason) => {
    console.log(id+' closed connection - '+code+" "+reason)
    delete sockets[id]
  })
  ws.on("error", (error) => {
    console.log("error "+error);
  })
  ws.on("unexpected-response", (req, res) => {
    console.log("unexpected "+req);
  })
  ws.on("upgrade", (WebSocket, req) => {
    console.log("upgrade "+WebSocket);
  })
  ws.on("message", (data) => {
    date_ob = timer()
    let hours = ("0" + (date_ob.getHours() + 1)).slice(-2);
    let minutes = ("0" + (date_ob.getMinutes() + 1)).slice(-2);
    let seconds = ("0" + (date_ob.getSeconds() + 1)).slice(-2);
    // console.log("clients: " +Object.getOwnPropertyNames(sockets))
    let halo = JSON.parse(data)
    if(halo.type == "userping"){
      console.log(wss.clients.size +" "+ hours + ":" + minutes + ":" + seconds +" "+ id)
      let json = JSON.stringify({"type":"userping"})
      ws.send(json)
    }else if(halo.type == "userevent" && halo.convName){
      console.log(wss.clients.size +" "+ hours + ":" + minutes + ":" + seconds +" "+ id +" "+ data)
      sockets[id] = {ws, data}
    }
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        if(sockets){
            for (const [key, value] of Object.entries(sockets)) {
              let dataParse = JSON.parse(value.data)
              // console.log(`${key}: ${value.ws} ${value.data}`);
              if(halo.type == "userevent" && halo.convName){
                if(halo.convName == dataParse.convName){
                  let wsData = JSON.parse(value.data)
                  //Shared canal
                  if(halo.name != wsData.name){
                    client.send(data)
                  }
                }else{
                  let wsData = JSON.parse(value.data)
                  let {name, convName, message} = wsData;
                  console.log("differents canals - save to db")
                  // console.log(halo)
                  conversationPermiss.findOne({
                    where: { 
                      conversationName: halo.convName
                    }
                  }).then(x => {
                    let sender = x.dataValues.conversationUsers[0];
                    let recipient = x.dataValues.conversationUsers[1];
                    User.findOne({
                      where: {
                        id: sender
                      }
                    }).then(z => {
                      if(z.name == halo.name){
                        temporaryMessages.create({
                          sender,
                          recipient,
                          message,
                          conversationName: convName
                        })
                      }else{
                        temporaryMessages.create({
                          sender: recipient,
                          recipient: sender,
                          message: halo.message,
                          conversationName: convName
                        })
                      }
                    })
                  })
                }
              }
            }
          }else{
            console.log('no sockets')
          }
        }
      })
  })
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

server.listen(3001, () =>{
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
                            success: true
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
                            jwtToken
                        })
                    } catch (err) {
                      return res.status(404).json({
                        success: false,
                        message:'Failed.'
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
                                message: 'Your account is active now. Please log in.',
                            })
                        )
                        remindPass(user.dataValues.email,tempPassword)
                    }catch (err) {
                      return res.status(404).json({
                        success: false,
                        message:'Failed.'
                      })
                    }
                  }
                    // console.log(tempPassword)
                  })
              }else{
                return res.status(400).json({
                  success: false,
                  message:'Account is not active. Check your email.'
                })
              }
          }else{
            return res.status(400).json({
              success: false,
              message:'Failed.'
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
          return res.status(400).json({
            success: false,
            message:'Actual password is wrong.'
          })
        } else {
            bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
              return res.status(400).json({
                success: false,
                message:'Problem with new password.'
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
        if(user.length === 0 || user === null){
            return res.json({
              success: true,
              findedUsers: []
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
              findedUsers: helperVar
            })
          }else if(findedUsers.length >= 5 && moreCounter >= 1){
            moreCounter *= basic
            if(findedUsers.length < moreCounter){
              helperVar = findedUsers.slice(0, findedUsers.length);
              console.log(helperVar, 'x')
              return res.json({
                success: true,
                findedUsers: helperVar
              })
            }else{
              return res.json({
                success: true,
                findedUsers: findedUsers
              })
            }
          }else if(findedUsers.length < 5 ){
            return res.json({
              success: true,
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

app.post('/searchconversation', (req, res) => {
  const userEmail = req.body.email;
  const recipient = req.body.recipient;
  User.findOne({
    where: {
      email: userEmail
    }
  }).then(userId => {
    const user = userId.dataValues.id;
    conversationPermiss.findOne({
    where: {
      conversationUsers: { [Op.contains]: [user, recipient]}
    }
  }).then(users => {
    if(users){
      const conversationName = users.dataValues.conversationName;
        return res.json({
          success: true,
          conversationName
        })
    }else{
      createUuid = createNewUuid();
      if(createUuid){
        const users = [user, recipient];
          conversationPermiss.create({
            conversationName: createUuid,
            conversationUsers: users
        },{
            fields: ['conversationName','conversationUsers']
        }).then(user => {
          const conversationId = user.dataValues.id;
          const conversationName = user.dataValues.conversationName;

          User.update({
            conversationId: Sequelize.fn('array_append', Sequelize.col('conversationId'), conversationId)
          },{
            where: { id: users}
          }).then(x => {
            return res.json({
              success: true,
              conversationName
            })
          })

        }).catch(err => console.log(err))
      }
    }
  })
  })
})

app.post('/addusertocontactlist', authenticateToken, (req, res) => {
  var idToSave = req.body.addedUserId;
  var userEmail = req.body.email;
  var addedUArray = [];

  User.findOne({
    where: { email: userEmail }
  }).then(user => {
    addedUArray = user.addedUsers
    if(addedUArray == null){
      updateColAddedUsers(idToSave, userEmail)
    }else if(addedUArray != null){
      var arrayIncludes = addedUArray.includes(+idToSave)
      if(arrayIncludes){
        removeColAddedUsers(idToSave, userEmail)
        updateColAddedUsers(idToSave, userEmail)
      }else if(!arrayIncludes){
        updateColAddedUsers(idToSave, userEmail)
      }
    }
  })
})

app.post('/deleteuserfromcontactlist', authenticateToken, (req, res) => {
  let userIdToDelete = req.body.userIdToDelete;
  let userEmail = req.body.email;
  removeColAddedUsers(userIdToDelete, userEmail);
})

app.post('/checkcontacts', authenticateToken, 
  async (req, res, next) => {
    let i=0, findedUsers=[];
    try {
        const foundUser = await User.findOne({
            where: { email: req.body.email }
        });

        const { addedUsers } = foundUser;
        if(addedUsers == null){
          return res.json({
            success: true
          })
        }else{
          const data = await fnKurs(addedUsers);
          data.forEach(element => {
            id = element.id
            namee = element.name
            findedUsers[i] = {"id": id, "name": namee}
            i++
          })
          return res.json({
            success: true,
            findedUsers
          });
        }
    } catch (err) {
        return next(err)
    }
})

app.post('/checkMessages', authenticateToken,
  async (req, res, next) => {
    console.log(req.body);
    let i=0, offlineMessages=[];
    try {
      const foundUser = await User.findOne({
        where: { email: req.body.email }
      });

      const { id } = foundUser;
      if(id == null){
        return res.json({
          success: true
        })
      }else{
        const dataValues = await findRecipientMessages(id);
        const receivedMessages = await findUsersName(dataValues);
        // console.log(receivedMessages)
        receivedMessages.forEach(element => {
          namee = element.name
          message = element.message
          createdAt = element.createdAt
          // offlineMessages[i] = {"name": namee, "message": message, "timestamp":createdAt}
          offlineMessages[i] = {"name": namee, "message": message}
          i++
        })
        console.log(offlineMessages)
        return res.json({
          success: true,
          offlineMessages
        })
      }
    }catch (err) {
      return next(err)
    }
})

const findRecipientMessages = async (id) => {
  let result = [];

    const foundOffilneMessages = await temporaryMessages.findAll({
      where: { recipient: id }
    });

    foundOffilneMessages.forEach(element => {
      console.log(foundOffilneMessages)
      const { sender, message, createdAt } = element;
        result.push({ sender, message });
    })
  
  return Promise.all(result);
}

const findUsersName = async (objects) => {
  let result = [];

  for (const object of objects) {
    let { message, createdAt } = object;
    const foundUser = await User.findOne({
      where: { id: object.sender }
    });

    if (foundUser) {
        const { name } = foundUser;
        result.push({ name, message, createdAt });
    }
  }
  return Promise.all(result);
}

const fnKurs = async (items) => {
  let result = [];

  for (const item of items) {
    const foundUser = await User.findOne({
      where: { id: item }
    });

    if (foundUser) {
        const { id, name } = foundUser;
        result.push({ id, name });
    }
  }
  return Promise.all(result);
}

function updateColAddedUsers(idToSave, userEmail){
  User.update({
    addedUsers: Sequelize.fn('array_append', Sequelize.col('addedUsers'), idToSave)
  },{
    where: { email: userEmail }
  })
}

function removeColAddedUsers(idToSave, userEmail){
  User.update({
    addedUsers: Sequelize.fn('array_remove', Sequelize.col('addedUsers'), idToSave)
  },{
    where: { email: userEmail }
  })
}

function timer(){
  let ts = Date.now();
  let date_ob = new Date(ts);
  
  return date_ob
}