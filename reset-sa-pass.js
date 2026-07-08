const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function fix() {
  const hash = await bcrypt.hash('admin', 12);
  await User.update({ password_hash: hash }, { where: { email: 'superadmin@example.com' } });
  console.log("Superadmin password reset to 'admin'");
  process.exit();
}

fix();
