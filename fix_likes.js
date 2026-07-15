const { Song, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function fix() {
  await Song.update({ likes_count: 0 }, { where: { likes_count: { [Op.lt]: 0 } } });
  console.log("Fixed negative likes");
}
fix().catch(console.error);
