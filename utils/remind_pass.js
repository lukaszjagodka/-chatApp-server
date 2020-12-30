const apiKey = require('../config/keys');

module.exports = function register_mail(address, temppassword) {
    var api_key = apiKey;
    var domain = 'sandbox4ae78e850b854342bfc407e3d53939a4.mailgun.org';
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
    
    var data = {
      from: 'Mailgun Sandbox <postmaster@sandboxad7654b0a4fd4803a653d23efdc8f2c2.mailgun.org>',
      to: `${address}`,
      subject: 'abc',
      text: `Someone has turned on a password reminder for your account. If that's not you, ignore this message.<br /> 
       Your temporary password to account: ${temppassword}. You can change it on another in your account settings.`,
    };
    
    mailgun.messages().send(data, function (error, body) {
      console.log(body);
    });
};
  