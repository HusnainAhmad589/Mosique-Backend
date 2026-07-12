'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FavoriteSong extends Model {
    static associate(models) {
      FavoriteSong.belongsTo(models.User, { foreignKey: 'user_id' });
      FavoriteSong.belongsTo(models.Song, { foreignKey: 'song_id' });
    }
  }
  FavoriteSong.init({
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
    }
  }, {
    sequelize,
    modelName: 'FavoriteSong',
    tableName: 'favorite_songs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return FavoriteSong;
};
