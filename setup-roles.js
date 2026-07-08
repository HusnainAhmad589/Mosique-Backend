const bcrypt = require('bcryptjs');
const db = require('./src/models');
const { Role, User } = db;

async function setupRoles() {
  try {
    await db.sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const rolesToCreate = [
      { name: 'Listener', slug: 'listener', description: 'Regular listener' },
      { name: 'Artist', slug: 'artist', description: 'Music creator' },
      { name: 'Admin', slug: 'admin', description: 'Administrator' },
      { name: 'Super Admin', slug: 'super admin', description: 'Super Administrator' },
      { name: 'Moderator', slug: 'moderator', description: 'Content Moderator' },
    ];

    for (const role of rolesToCreate) {
      await Role.findOrCreate({
        where: { slug: role.slug },
        defaults: role
      });
    }
    console.log('Roles created/verified.');

    const superAdminRole = await Role.findOne({ where: { slug: 'super admin' } });
    if (!superAdminRole) {
      throw new Error('Super admin role not found');
    }

    const [user, created] = await User.findOrCreate({
      where: { username: 'Super_Admin' },
      defaults: {
        username: 'Super_Admin',
        email: 'superadmin@mosique.com',
        password_hash: await bcrypt.hash('admin123', 10),
        role_id: superAdminRole.id,
        display_name: 'Super Admin'
      }
    });

    if (!created) {
      await user.update({ role_id: superAdminRole.id });
      console.log('Super_Admin user role updated to super admin.');
    } else {
      console.log('Super_Admin user created with super admin role.');
    }

  } catch (error) {
    console.error('Unable to connect to the database or setup roles:', error);
  } finally {
    await db.sequelize.close();
  }
}

setupRoles();
