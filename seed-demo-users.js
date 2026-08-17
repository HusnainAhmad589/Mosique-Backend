const db = require('./src/models');
const bcrypt = require('bcryptjs');

async function seedDemoUsers() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected.');

    // Normalize roles in database
    const roles = await db.Role.findAll();
    for (const r of roles) {
      let newSlug = r.slug;
      if (r.slug === 'super admin' || r.slug === 'superAdmin') {
        newSlug = 'superadmin';
      }
      if (newSlug !== r.slug) {
        await r.update({ slug: newSlug });
        console.log(`Updated role ${r.name} slug to ${newSlug}`);
      }
    }

    const superAdminRole = await db.Role.findOne({ where: { slug: ['superadmin', 'superAdmin', 'super admin'] } });
    const adminRole      = await db.Role.findOne({ where: { slug: 'admin' } });
    const moderatorRole  = await db.Role.findOne({ where: { slug: 'moderator' } });
    const artistRole     = await db.Role.findOne({ where: { slug: 'artist' } });
    const listenerRole   = await db.Role.findOne({ where: { slug: 'listener' } });

    const hashedPass = await bcrypt.hash('password123', 10);

    const demoAccounts = [
      { username: 'superadmin_demo', email: 'superadmin@mosique.com', role_id: superAdminRole?.id, display_name: 'Super Admin' },
      { username: 'admin_demo',      email: 'admin@mosique.com',      role_id: adminRole?.id,      display_name: 'Admin' },
      { username: 'moderator_demo',  email: 'moderator@mosique.com',  role_id: moderatorRole?.id,  display_name: 'Moderator' },
      { username: 'artist_demo',     email: 'artist@mosique.com',     role_id: artistRole?.id,     display_name: 'Artist' },
      { username: 'listener_demo',   email: 'listener@mosique.com',   role_id: listenerRole?.id,   display_name: 'Listener' }
    ];

    for (const acc of demoAccounts) {
      if (!acc.role_id) {
        console.warn(`Warning: Role not found for ${acc.email}`);
        continue;
      }
      const [u, created] = await db.User.findOrCreate({
        where: { email: acc.email },
        defaults: {
          username: acc.username,
          email: acc.email,
          password_hash: hashedPass,
          role_id: acc.role_id,
          display_name: acc.display_name,
          is_active: true,
          is_deleted: false,
          must_change_password: false
        }
      });
      if (!created) {
        await u.update({
          password_hash: hashedPass,
          role_id: acc.role_id,
          is_active: true,
          is_deleted: false,
          must_change_password: false
        });
        console.log(`Updated demo user credentials for: ${acc.email}`);
      } else {
        console.log(`Created demo user: ${acc.email}`);
      }
    }

    console.log('✅ All 5 role demo accounts configured successfully.');
  } catch (err) {
    console.error('Error seeding demo users:', err);
  } finally {
    await db.sequelize.close();
  }
}

seedDemoUsers();
