'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      { name: 'Super Admin', slug: 'superAdmin', description: 'Full system access, manages admins.', created_at: new Date() },
      { name: 'Admin', slug: 'admin', description: 'Manages users, content, and moderators.', created_at: new Date() },
      { name: 'Moderator', slug: 'moderator', description: 'Reviews reports and removes content.', created_at: new Date() },
      { name: 'Artist', slug: 'artist', description: 'Creator profile with rich public data.', created_at: new Date() },
      { name: 'Listener', slug: 'listener', description: 'Standard user profile.', created_at: new Date() }
    ], { ignoreDuplicates: true });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
