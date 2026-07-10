'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    const now = new Date();
    await queryInterface.bulkInsert('categories', [
      { name: 'Pop', slug: 'pop', description: 'Popular music', created_at: now, updated_at: now },
      { name: 'Rock', slug: 'rock', description: 'Rock music', created_at: now, updated_at: now },
      { name: 'Hip Hop', slug: 'hip-hop', description: 'Hip Hop music', created_at: now, updated_at: now },
      { name: 'Jazz', slug: 'jazz', description: 'Jazz music', created_at: now, updated_at: now },
      { name: 'Electronic', slug: 'electronic', description: 'Electronic music', created_at: now, updated_at: now },
      { name: 'Classical', slug: 'classical', description: 'Classical music', created_at: now, updated_at: now },
      { name: 'Lofi', slug: 'lofi', description: 'Lofi hip hop', created_at: now, updated_at: now },
      { name: 'R&B', slug: 'rnb', description: 'Rhythm and blues', created_at: now, updated_at: now }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('categories');
  }
};
