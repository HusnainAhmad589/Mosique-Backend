'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ListeningHistory extends Model {
    static associate(models) {
      ListeningHistory.belongsTo(models.User, { foreignKey: 'user_id', as: 'Listener' });
      ListeningHistory.belongsTo(models.Song, { foreignKey: 'song_id', as: 'Song' });
    }
  }

  ListeningHistory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    song_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'songs',
        key: 'id'
      }
    },
    played_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ListeningHistory',
    tableName: 'listening_history',
    underscored: true,
    timestamps: false // we only care about played_at
  });

  return ListeningHistory;
};
