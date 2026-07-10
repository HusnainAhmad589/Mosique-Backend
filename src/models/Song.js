'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Song extends Model {
    static associate(models) {
      Song.belongsTo(models.User, { foreignKey: 'artist_id', as: 'Artist' });
      Song.belongsTo(models.Album, { foreignKey: 'album_id' });
      Song.belongsTo(models.Category, { foreignKey: 'category_id' });
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
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft'
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
