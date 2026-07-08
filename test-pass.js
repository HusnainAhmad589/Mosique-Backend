const bcrypt = require('bcryptjs');

async function testPass() {
  const hash = '$2a$12$g3VfPqdMRmR2Wdi9ndXzs.wU8Ff2MiGG7kOGjRmrtBbLYgomg.bnC';
  const isMatchAdmin = await bcrypt.compare('admin', hash);
  const isMatchSuperAdmin = await bcrypt.compare('superadmin', hash);
  const isMatch12345 = await bcrypt.compare('12345', hash);
  
  console.log('admin:', isMatchAdmin);
  console.log('superadmin:', isMatchSuperAdmin);
  console.log('12345:', isMatch12345);
}

testPass();
