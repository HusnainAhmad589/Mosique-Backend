'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Album extends Model {
    static associate(models) {
      Album.belongsTo(models.User, { foreignKey: 'artist_id', as: 'Artist' });
    }
  }
  
  Album.init({
    artist_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    cover_url: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft'
    },
    release_date: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Album',
    tableName: 'albums',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Album;
};
