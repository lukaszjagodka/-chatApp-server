'use strict';
const { Model } = require('sequelize');
const user = require('./user').user
module.exports = (sequelize, DataTypes) => {
  class Convpermiss extends Model {
    static associate(models) {
      Convpermiss.hasMany(models.user, {
        foreignKey: 'conversationId'
      })
    }
  };
  Convpermiss.init({
    conversationName: DataTypes.UUID,
    conversationUsers: DataTypes.ARRAY(DataTypes.INTEGER)
  }, {
    sequelize,
    modelName: 'conversationPermiss',
  });
  return Convpermiss;
};