'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('listening_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      song_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'songs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      played_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add composite unique index to ensure one record per user/song, 
    // so we can just update the `played_at` timestamp if played again.
    await queryInterface.addIndex('listening_history', ['user_id', 'song_id'], {
      unique: true,
      name: 'listening_history_user_song_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('listening_history');
  }
};
