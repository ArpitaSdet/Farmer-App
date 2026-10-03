const {
  Categories,
  Products,
  Machines,
  Banners,
  Posters,
  Users,
  Orders,
  RentalBookings,
  Notifications,
  db,
} = require('../config/db');

const {
  seedCategories,
  seedProducts,
  seedMachines,
  seedBanners,
  seedPosters,
  seedUsers,
  seedOrders,
  seedRentals,
  seedNotifications,
} = require('./seedData');

async function seedDatabase(force = false) {
  try {
    const existingCats = await Categories.find();
    if (existingCats.length > 0 && !force) {
      console.log('Database already contains data, skipping auto-seed.');
      return;
    }

    console.log('Seeding Indian Agriculture & Machinery Data...');

    if (force) {
      await Categories.clear();
      await Products.clear();
      await Machines.clear();
      await Banners.clear();
      await Posters.clear();
      await Users.clear();
      await Orders.clear();
      await RentalBookings.clear();
      await Notifications.clear();
    }

    for (const c of seedCategories) await Categories.create(c);
    for (const p of seedProducts) await Products.create(p);
    for (const m of seedMachines) await Machines.create(m);
    for (const b of seedBanners) await Banners.create(b);
    for (const pos of seedPosters) await Posters.create(pos);
    for (const u of seedUsers) await Users.create(u);
    for (const o of seedOrders) await Orders.create(o);
    for (const r of seedRentals) await RentalBookings.create(r);
    for (const n of seedNotifications) await Notifications.create(n);

    console.log('✓ Successfully seeded Farmer App database!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

if (require.main === module) {
  seedDatabase(true).then(() => {
    console.log('Seeding process finished.');
    process.exit(0);
  });
}

module.exports = { seedDatabase };
