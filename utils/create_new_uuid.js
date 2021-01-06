const conversationPermiss = require('../database/models').conversationPermiss;
const { v4: uuidv4 } = require('uuid');

module.exports = function createNewUuid(){
  const uuid = uuidv4();
  conversationPermiss.findOne({
    where: {
      conversationName: uuid
    }
  }).then(converName => {
    while(converName){
      createNewUuid()
    }
  })
  return uuid;
};