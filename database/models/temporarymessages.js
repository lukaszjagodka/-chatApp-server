'use strict';
const { Model } = require('sequelize');
const user = require('./user');

module.exports = (sequelize, DataTypes) => {
  class temporaryMessages extends Model {
    static associate(models) {
      temporaryMessages.belongsTo(models.user, {
        foreignKey: 'recipient'
      })
    }
  };
  temporaryMessages.init({
    sender: DataTypes.INTEGER,
    recipient: DataTypes.INTEGER,
    message: DataTypes.STRING,
    conversationName: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'temporaryMessages',
  });
  return temporaryMessages;
};