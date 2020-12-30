const apiKey = require('../config/keys');

module.exports = function register_mail(address, token) {
    var api_key = apiKey;
    var domain = 'sandbox4ae78e850b854342bfc407e3d53939a4.mailgun.org';
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
    
    var data = {
      from: 'Mailgun Sandbox <postmaster@sandboxad7654b0a4fd4803a653d23efdc8f2c2.mailgun.org>',
      to: `${address}`,
      subject: 'abc',
      text: `Thanks for signing up with Opengrid! You must follow this link to activate your account:<br /> 
       <html><a href="http://localhost:3000/app/signup/${token}">Click here to activate</a></html>`,
    };
    
    mailgun.messages().send(data, function (error, body) {
      console.log(body);
    });
};
  