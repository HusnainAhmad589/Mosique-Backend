'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      Report.belongsTo(models.User, { foreignKey: 'reporter_id', as: 'Reporter' });
      Report.belongsTo(models.Song, { foreignKey: 'song_id', as: 'Song' });
      Report.belongsTo(models.User, { foreignKey: 'resolved_by', as: 'Resolver' });
    }
  }

  Report.init({
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    song_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'songs', key: 'id' }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'resolved', 'dismissed'),
      defaultValue: 'pending'
    },
    resolved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    resolution_note: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Report',
    tableName: 'reports',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Report;
};
