'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`SET GLOBAL event_scheduler = ON;`);
    await queryInterface.sequelize.query(`
      CREATE EVENT IF NOT EXISTS cleanup_expired_tokens
        ON SCHEDULE EVERY 1 HOUR
        DO
          DELETE FROM token_blacklist WHERE expires_at < NOW();
    `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP EVENT IF EXISTS cleanup_expired_tokens;`);
  }
};
