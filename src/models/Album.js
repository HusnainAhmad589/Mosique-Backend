'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Album extends Model {
    static associate(models) {
      Album.belongsTo(models.User, { foreignKey: 'artist_id', as: 'Artist' });
      Album.belongsTo(models.User, { foreignKey: 'reviewed_by', as: 'Reviewer' });
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
      type: DataTypes.ENUM('draft', 'pending_review', 'scheduled', 'published', 'archived'),
      defaultValue: 'draft'
    },
    release_date: DataTypes.DATE,
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
    modelName: 'Album',
    tableName: 'albums',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Album;
};
