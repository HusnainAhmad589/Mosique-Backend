'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Playlist extends Model {
    static associate(models) {
      Playlist.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
      Playlist.belongsToMany(models.Song, {
        through: models.PlaylistSong,
        foreignKey: 'playlist_id',
        otherKey: 'song_id',
        as: 'Songs'
      });
    }
  }
  
  Playlist.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Playlist',
    tableName: 'playlists',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Playlist;
};
