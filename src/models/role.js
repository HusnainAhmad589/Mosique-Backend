'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      // define association here
      Role.hasMany(models.User, { foreignKey: 'role_id' });
    }
  }
  Role.init({
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  return Role;
};