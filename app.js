const express = require('express');
const app = express();

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
    res.send('Login')
})