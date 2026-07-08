'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TokenBlacklist extends Model {
    static associate(models) {
      // define association here
      TokenBlacklist.belongsTo(models.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
    }
  }
  TokenBlacklist.init({
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TokenBlacklist',
    tableName: 'token_blacklist',
    underscored: true,
    timestamps: true,
    createdAt: 'blacklisted_at',
    updatedAt: false
  });
  return TokenBlacklist;
};