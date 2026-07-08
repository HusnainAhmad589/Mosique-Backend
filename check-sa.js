const { User } = require('./src/models');

async function check() {
  const user = await User.findOne({ where: { email: 'superadmin@example.com' } });
  if (user) {
    console.log(user.toJSON());
  } else {
    console.log("No superadmin found");
  }
  process.exit();
}
check();
