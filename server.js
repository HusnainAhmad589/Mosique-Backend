const app                    = require('./src/app');
const db                     = require('./src/models');

const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────
const start = async () => {
  // 1. Test DB connection before accepting requests
  await db.sequelize.authenticate();
  console.log('✅  Database connected — host:', process.env.DB_HOST, '| db:', process.env.DB_NAME);

  // 2. Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('');
    console.log(`  🚀  Server running on  : http://localhost:${PORT}`);
    console.log(`  🌍  Environment        : ${process.env.NODE_ENV}`);
    console.log(`  🔒  Auth token expiry  : ${process.env.JWT_EXPIRES_IN || '24h'}`);
    console.log('');
    console.log('  Available endpoints:');
    console.log('');
    console.log('  🔓 Auth (public):');
    console.log(`    POST  http://localhost:${PORT}/api/auth/register`);
    console.log(`    POST  http://localhost:${PORT}/api/auth/login`);
    console.log(`    POST  http://localhost:${PORT}/api/auth/logout`);
    console.log(`    GET   http://localhost:${PORT}/api/auth/me`);
    console.log('');
    console.log('  🎧 Listener (listener+):');
    console.log(`    GET   http://localhost:${PORT}/api/listener/feed`);
    console.log(`    POST  http://localhost:${PORT}/api/listener/favorites`);
    console.log('');
    console.log('  🎸 Artist (artist+):');
    console.log(`    POST  http://localhost:${PORT}/api/artist/tracks`);
    console.log(`    GET   http://localhost:${PORT}/api/artist/stats`);
    console.log('');
    console.log('  🛡️  Moderator (moderator+):');
    console.log(`    GET   http://localhost:${PORT}/api/moderator/reports`);
    console.log(`    PUT   http://localhost:${PORT}/api/moderator/reports/:id/resolve`);
    console.log('');
    console.log('  👑 Admin (admin+):');
    console.log(`    GET   http://localhost:${PORT}/api/admin/users`);
    console.log(`    PUT   http://localhost:${PORT}/api/admin/users/:id/role  (superAdmin only)`);
    console.log('');
    console.log(`    GET   http://localhost:${PORT}/api/health`);
    console.log('');
  });
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
