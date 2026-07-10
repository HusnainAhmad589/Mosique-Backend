'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ArtistProfile extends Model {
    static associate(models) {
      ArtistProfile.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  
  ArtistProfile.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    bio: DataTypes.TEXT,
    banner_url: DataTypes.STRING,
    twitter_url: DataTypes.STRING,
    instagram_url: DataTypes.STRING,
    spotify_url: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'ArtistProfile',
    tableName: 'artist_profiles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return ArtistProfile;
};
