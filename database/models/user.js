'use strict';
const { Model } = require('sequelize');
const conversationPermiss = require('./conversationpermiss');
module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    static associate(models) {
      user.hasMany(models.conversationPermiss, {
        foreignKey: 'conversationUsers'
      })
    }
  };
  user.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    authToken: DataTypes.STRING,
    token: DataTypes.STRING,
    active: DataTypes.BOOLEAN,
    conversationId: DataTypes.ARRAY(DataTypes.INTEGER),
    addedUsers: DataTypes.ARRAY(DataTypes.INTEGER)
  }, {
    sequelize,
    modelName: 'user',
  });
  return user;
};