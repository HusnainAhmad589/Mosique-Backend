const db = require('./src/models');
db.sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced');
  process.exit();
}).catch(err => {
  console.error('Sync failed', err);
  process.exit(1);
});
