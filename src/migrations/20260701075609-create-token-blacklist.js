'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('token_blacklist', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      blacklisted_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('token_blacklist', ['token_hash']);
    await queryInterface.addIndex('token_blacklist', ['expires_at']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('token_blacklist');
  }
};