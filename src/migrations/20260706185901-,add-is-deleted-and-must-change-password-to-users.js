'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'must_change_password', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'is_deleted');
    await queryInterface.removeColumn('users', 'must_change_password');
  }
};
