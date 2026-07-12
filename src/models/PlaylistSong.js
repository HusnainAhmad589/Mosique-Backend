'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PlaylistSong extends Model {
    static associate(models) {
      // Junction model doesn't strictly need associations here, 
      // they are defined in Playlist and Song via belongsToMany
    }
  }
  
  PlaylistSong.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    playlist_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'playlists',
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
    modelName: 'PlaylistSong',
    tableName: 'playlist_songs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false // usually we only care when it was added
  });
  
  return PlaylistSong;
};
