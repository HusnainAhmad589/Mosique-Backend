'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ArtistFollow extends Model {
    static associate(models) {
      // The listener (follower)
      ArtistFollow.belongsTo(models.User, { foreignKey: 'follower_id', as: 'Follower' });
      // The artist being followed
      ArtistFollow.belongsTo(models.User, { foreignKey: 'artist_id', as: 'Artist' });
    }
  }
  ArtistFollow.init({
    follower_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    artist_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'ArtistFollow',
    tableName: 'artist_follows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['follower_id', 'artist_id'] }
    ]
  });
  return ArtistFollow;
};
