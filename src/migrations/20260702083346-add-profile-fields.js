'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'avatar_url', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('users', 'address', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'avatar_url');
    await queryInterface.removeColumn('users', 'address');
  }
};
