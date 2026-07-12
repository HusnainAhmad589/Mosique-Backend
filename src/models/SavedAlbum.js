'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SavedAlbum extends Model {
    static associate(models) {
      SavedAlbum.belongsTo(models.User, { foreignKey: 'user_id' });
      SavedAlbum.belongsTo(models.Album, { foreignKey: 'album_id' });
    }
  }
  SavedAlbum.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    album_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'albums',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'SavedAlbum',
    tableName: 'saved_albums',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return SavedAlbum;
};
