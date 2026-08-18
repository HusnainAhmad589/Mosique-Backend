'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ArtistModerator extends Model {
    static associate(models) {
      // The artist who owns the moderator
      ArtistModerator.belongsTo(models.User, { foreignKey: 'artist_id', as: 'Artist' });
      // The user assigned as moderator
      ArtistModerator.belongsTo(models.User, { foreignKey: 'moderator_id', as: 'Moderator' });
    }
  }

  ArtistModerator.init({
    artist_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    moderator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'ArtistModerator',
    tableName: 'artist_moderators',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['artist_id', 'moderator_id'] }
    ]
  });

  return ArtistModerator;
};
