const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'db.json');

// Initial schema blueprint
const defaultState = {
  users: [],
  farmerProfiles: [],
  addresses: [],
  categories: [],
  products: [],
  machines: [],
  machineAvailabilities: [],
  rentalBookings: [],
  orders: [],
  payments: [],
  reviews: [],
  notifications: [],
  banners: [],
  posters: [],
  promotions: [],
  coupons: [],
  supportTickets: [],
  aiAssets: [],
  creativeGenerations: [],
};

class Database {
  constructor() {
    this.filePath = dbFilePath;
    this.data = { ...defaultState };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = { ...defaultState, ...JSON.parse(raw) };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database file, initializing fresh:', err.message);
      this.data = { ...defaultState };
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err.message);
    }
  }

  getRepository(collectionName) {
    if (!this.data[collectionName]) {
      this.data[collectionName] = [];
    }
    const self = this;

    return {
      find: async (filter = {}) => {
        let items = self.data[collectionName] || [];
        if (Object.keys(filter).length > 0) {
          items = items.filter((item) => {
            return Object.entries(filter).every(([key, val]) => {
              if (val === undefined) return true;
              if (typeof val === 'function') return val(item[key]);
              if (Array.isArray(val)) return val.includes(item[key]);
              if (typeof val === 'object' && val !== null) {
                // simple operator support: $regex, $gt, $lt, $in
                if (val.$regex) return new RegExp(val.$regex, val.$options || 'i').test(item[key]);
                if (val.$in) return val.$in.includes(item[key]);
                if (val.$gt !== undefined) return item[key] > val.$gt;
                if (val.$lt !== undefined) return item[key] < val.$lt;
              }
              return item[key] === val;
            });
          });
        }
        return JSON.parse(JSON.stringify(items));
      },

      findOne: async (filter = {}) => {
        const items = await self.getRepository(collectionName).find(filter);
        return items.length > 0 ? items[0] : null;
      },

      findById: async (id) => {
        const items = self.data[collectionName] || [];
        const item = items.find((x) => String(x.id) === String(id) || String(x._id) === String(id));
        return item ? JSON.parse(JSON.stringify(item)) : null;
      },

      create: async (doc) => {
        const id = doc.id || doc._id || `id_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const newRecord = {
          ...doc,
          id,
          _id: id,
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        self.data[collectionName].push(newRecord);
        self.save();
        return JSON.parse(JSON.stringify(newRecord));
      },

      findByIdAndUpdate: async (id, updateData) => {
        const index = self.data[collectionName].findIndex(
          (x) => String(x.id) === String(id) || String(x._id) === String(id)
        );
        if (index === -1) return null;
        self.data[collectionName][index] = {
          ...self.data[collectionName][index],
          ...updateData,
          updatedAt: new Date().toISOString(),
        };
        self.save();
        return JSON.parse(JSON.stringify(self.data[collectionName][index]));
      },

      findByIdAndDelete: async (id) => {
        const index = self.data[collectionName].findIndex(
          (x) => String(x.id) === String(id) || String(x._id) === String(id)
        );
        if (index === -1) return false;
        self.data[collectionName].splice(index, 1);
        self.save();
        return true;
      },

      count: async (filter = {}) => {
        const items = await self.getRepository(collectionName).find(filter);
        return items.length;
      },

      clear: async () => {
        self.data[collectionName] = [];
        self.save();
      },
    };
  }
}

const dbInstance = new Database();

module.exports = {
  db: dbInstance,
  Users: dbInstance.getRepository('users'),
  FarmerProfiles: dbInstance.getRepository('farmerProfiles'),
  Addresses: dbInstance.getRepository('addresses'),
  Categories: dbInstance.getRepository('categories'),
  Products: dbInstance.getRepository('products'),
  Machines: dbInstance.getRepository('machines'),
  MachineAvailabilities: dbInstance.getRepository('machineAvailabilities'),
  RentalBookings: dbInstance.getRepository('rentalBookings'),
  Orders: dbInstance.getRepository('orders'),
  Payments: dbInstance.getRepository('payments'),
  Reviews: dbInstance.getRepository('reviews'),
  Notifications: dbInstance.getRepository('notifications'),
  Banners: dbInstance.getRepository('banners'),
  Posters: dbInstance.getRepository('posters'),
  Promotions: dbInstance.getRepository('promotions'),
  Coupons: dbInstance.getRepository('coupons'),
  SupportTickets: dbInstance.getRepository('supportTickets'),
  AIAssets: dbInstance.getRepository('aiAssets'),
  CreativeGenerations: dbInstance.getRepository('creativeGenerations'),
};
