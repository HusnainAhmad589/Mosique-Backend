'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'dob', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'postal_code', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
    await queryInterface.addColumn('users', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
    await queryInterface.addColumn('users', 'gender', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'dob');
    await queryInterface.removeColumn('users', 'postal_code');
    await queryInterface.removeColumn('users', 'phone_number');
    await queryInterface.removeColumn('users', 'gender');
  }
};
