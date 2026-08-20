'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('songs', 'lyrics_status', {
      type: Sequelize.ENUM('idle', 'processing', 'completed', 'failed'),
      defaultValue: 'idle',
      allowNull: false
    });

    await queryInterface.addColumn('songs', 'lyrics_error', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('songs', 'lyrics_status');
    await queryInterface.removeColumn('songs', 'lyrics_error');
    // Drop ENUM type in Postgres/MySQL if needed
  }
};
