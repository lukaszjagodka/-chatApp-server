'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
        queryInterface.addColumn('users', 'addedUsers', {
          type: Sequelize.ARRAY(Sequelize.INTEGER),
          allowNull: true,
        } 
      )
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([queryInterface.removeColumn('users', 'addedUsers')]);
  }
};
