'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const commonFields = {
        scheduled_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        archived_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        rejection_reason: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        reviewed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }
      };

      for (const table of ['songs', 'albums']) {
        // Since modifying ENUM directly can be problematic in some DBs, it's safer to use changeColumn for MySQL
        await queryInterface.changeColumn(table, 'status', {
          type: Sequelize.ENUM('draft', 'pending_review', 'scheduled', 'published', 'archived'),
          defaultValue: 'draft',
        }, { transaction });

        await queryInterface.addColumn(table, 'scheduled_at', commonFields.scheduled_at, { transaction });
        await queryInterface.addColumn(table, 'archived_at', commonFields.archived_at, { transaction });
        await queryInterface.addColumn(table, 'rejection_reason', commonFields.rejection_reason, { transaction });
        await queryInterface.addColumn(table, 'reviewed_by', commonFields.reviewed_by, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const table of ['songs', 'albums']) {
        // Change back to original enum values
        await queryInterface.changeColumn(table, 'status', {
          type: Sequelize.ENUM('draft', 'published'),
          defaultValue: 'draft'
        }, { transaction });

        await queryInterface.removeColumn(table, 'scheduled_at', { transaction });
        await queryInterface.removeColumn(table, 'archived_at', { transaction });
        await queryInterface.removeColumn(table, 'rejection_reason', { transaction });
        await queryInterface.removeColumn(table, 'reviewed_by', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
