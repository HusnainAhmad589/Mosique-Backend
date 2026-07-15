'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Song extends Model {
    static associate(models) {
      Song.belongsTo(models.User, { foreignKey: 'artist_id', as: 'Artist' });
      Song.belongsTo(models.Album, { foreignKey: 'album_id' });
      Song.belongsTo(models.Category, { foreignKey: 'category_id' });
      Song.belongsToMany(models.Playlist, {
        through: models.PlaylistSong,
        foreignKey: 'song_id',
        otherKey: 'playlist_id',
        as: 'Playlists'
      });
      Song.belongsTo(models.User, { foreignKey: 'reviewed_by', as: 'Reviewer' });
    }
  }
  
  Song.init({
    artist_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    album_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'albums',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    duration: DataTypes.INTEGER,
    audio_url: DataTypes.STRING,
    lyrics: DataTypes.TEXT,
    track_number: DataTypes.INTEGER,
    play_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likes_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending_review', 'scheduled', 'published', 'archived'),
      defaultValue: 'draft' // Changed default from 'published' to 'draft' since it makes more sense for a lifecycle
    },
    scheduled_at: DataTypes.DATE,
    archived_at: DataTypes.DATE,
    rejection_reason: DataTypes.TEXT,
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Song',
    tableName: 'songs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Song;
};
