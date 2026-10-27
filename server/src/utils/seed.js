require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Seed Error] Destructive seeding is blocked in production environment.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to database:', mongoose.connection.name);

    // Safeguard: Ensure db name indicates development/test or contains lost_found
    const dbName = mongoose.connection.name || '';
    if (!dbName.includes('dev') && !dbName.includes('test') && !dbName.includes('lost_found')) {
      console.error(`[Seed Error] Refusing to wipe unrecognized database '${dbName}'.`);
      process.exit(1);
    }

    // Clear existing development data
    await User.deleteMany({});
    await Item.deleteMany({});
    await Claim.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('[Seed] Cleared existing development records.');

    // 1. Create Users (First user automatically admin)
    const admin = await User.create({
      name: 'Campus Administrator',
      email: 'admin@sst.scaler.com',
      password: 'password123',
      role: 'admin',
      phone: '+91 9876543210',
      contactPreference: 'in_app',
    });

    const studentArjun = await User.create({
      name: 'Arjun Mehta',
      email: 'arjun.23bcs10042@sst.scaler.com',
      password: 'password123',
      role: 'user',
      phone: '+91 9811223344',
      contactPreference: 'in_app',
    });

    const studentPriya = await User.create({
      name: 'Priya Sharma',
      email: 'priya.23bcs10108@sst.scaler.com',
      password: 'password123',
      role: 'user',
      phone: '+91 9822334455',
      contactPreference: 'in_app',
    });

    const studentRohit = await User.create({
      name: 'Rohit Verma',
      email: 'rohit.24bcs10019@sst.scaler.com',
      password: 'password123',
      role: 'user',
      phone: '+91 9833445566',
      contactPreference: 'in_app',
    });

    console.log('[Seed] Created 4 users (1 Admin, 3 Students).');

    // 2. Create Items
    const items = [
      {
        title: 'Dell Inspiron 15 (Silver Laptop)',
        description:
          'Lost my silver Dell laptop during evening study hours in the Central Library. It has a slight scratch on the left corner and VS Code was left open.',
        reportType: 'lost',
        category: 'Electronics',
        location: {
          building: 'Central Library',
          room: '2nd Floor Quiet Zone',
          campusZone: 'Library Zone',
        },
        dateLostFound: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        timeLostFound: '18:30',
        reporter: studentArjun._id,
        privateIdentifyingInfo: 'Sticker of GitHub Octocat on bottom panel, serial ending in 891B.',
        status: 'lost',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=60',
            publicId: 'seed_laptop',
          },
        ],
      },
      {
        title: 'Black Leather Fossil Wallet',
        description:
          'Found a black leather wallet left behind on a dining table near the counter. Containing cash and transit pass, safely deposited with cafeteria manager.',
        reportType: 'found',
        category: 'Keys & Wallets',
        location: {
          building: 'Campus Dining Hall / Cafeteria',
          room: 'Table 14 near Juice Counter',
          campusZone: 'Central Hub',
        },
        dateLostFound: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        timeLostFound: '13:15',
        reporter: studentPriya._id,
        privateIdentifyingInfo: 'Metro smartcard inside has cardholder initials R.V. and Rs. 500 note inside flap.',
        status: 'found',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=60',
            publicId: 'seed_wallet',
          },
        ],
      },
      {
        title: 'Apple AirPods Pro (2nd Gen with White Case)',
        description:
          'Lost my AirPods in charging case during the Cloud Computing practical session. Name engraved or synced as "Arjun\'s Pods".',
        reportType: 'lost',
        category: 'Electronics',
        location: {
          building: 'Academic Block B',
          room: 'Lab 302',
          campusZone: 'North Campus',
        },
        dateLostFound: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        timeLostFound: '11:45',
        reporter: studentArjun._id,
        privateIdentifyingInfo: 'Small purple silicone case sleeve with keychain ring.',
        status: 'lost',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=60',
            publicId: 'seed_airpods',
          },
        ],
      },
      {
        title: 'Student ID Card (ECE Department)',
        description:
          'Found an official SST College ID card on the stairs of the main building. Safe with Reception.',
        reportType: 'found',
        category: 'ID Cards',
        location: {
          building: 'Main Administrative Block',
          room: 'Central Staircase, Ground Floor',
          campusZone: 'Central Hub',
        },
        dateLostFound: new Date(Date.now() - 4 * 60 * 60 * 1000),
        timeLostFound: '15:20',
        reporter: studentRohit._id,
        privateIdentifyingInfo: 'Roll number ends with 108, name belongs to Priya S.',
        status: 'found',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60',
            publicId: 'seed_idcard',
          },
        ],
      },
      {
        title: 'Milton Thermosteel Water Bottle (Silver, 1000ml)',
        description:
          'Found a 1-litre stainless steel water bottle resting on the sports pavilion bleachers after football practice.',
        reportType: 'found',
        category: 'Bottles & Bags',
        location: {
          building: 'Sports Complex',
          room: 'Football Pavilion West Stands',
          campusZone: 'Sports Complex',
        },
        dateLostFound: new Date(Date.now() - 12 * 60 * 60 * 1000),
        timeLostFound: '17:40',
        reporter: studentArjun._id,
        privateIdentifyingInfo: 'Small dent on bottom rim, red rubber grip on cap ring.',
        status: 'found',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60',
            publicId: 'seed_bottle',
          },
        ],
      },
      {
        title: 'Navy Blue Wildcraft Backpack',
        description:
          'Left my backpack near row G in the main auditorium after the cultural committee orientation.',
        reportType: 'lost',
        category: 'Bottles & Bags',
        location: {
          building: 'Auditorium',
          room: 'Main Hall Row G',
          campusZone: 'Central Hub',
        },
        dateLostFound: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        timeLostFound: '16:00',
        reporter: studentRohit._id,
        privateIdentifyingInfo: 'Contains a spiral notebook with ME-2024 written on first page.',
        status: 'resolved',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=60',
            publicId: 'seed_backpack',
          },
        ],
      },
    ];

    const createdItems = await Item.insertMany(items);
    console.log(`[Seed] Created ${createdItems.length} realistic campus items.`);

    // 3. Create a Claim on the Found Wallet
    const foundWallet = createdItems.find((i) => i.title.includes('Wallet'));
    if (foundWallet) {
      const claim = await Claim.create({
        item: foundWallet._id,
        claimant: studentRohit._id,
        privateMessage:
          'Hi Priya! I believe this is my Fossil wallet. I had lunch at Table 14 yesterday and forgot it while rushing to my 1:30 PM lab.',
        proofDetails:
          'Inside the card slot is my Delhi Metro smartcard with initials R.V. and there was a Rs. 500 note tucked in the back flap.',
        claimStatus: 'pending',
      });

      // Update item status to pending_claim
      foundWallet.status = 'pending_claim';
      await foundWallet.save();

      // Create notification for Priya
      await Notification.create({
        recipient: studentPriya._id,
        actor: studentRohit._id,
        type: 'claim_received',
        title: 'New Ownership Claim Received',
        message: `${studentRohit.name} submitted a claim request for "${foundWallet.title}". Review their proof details.`,
        relatedItem: foundWallet._id,
        relatedClaim: claim._id,
      });

      console.log('[Seed] Created sample claim and notification.');
    }

    // 4. Create an audit log
    await AuditLog.create({
      actor: admin._id,
      action: 'SYSTEM_DATABASE_SEEDED',
      targetModel: 'User',
      targetId: admin._id,
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/1.0',
      metadata: { itemsCreated: createdItems.length, usersCreated: 4 },
    });

    console.log('[Seed] Database seeding completed successfully!');
    console.log('---------------------------------------------------------');
    console.log('Login credentials for testing:');
    console.log('Admin:   admin@sst.scaler.com                  | password: password123');
    console.log('Student: arjun.23bcs10042@sst.scaler.com       | password: password123');
    console.log('Student: priya.23bcs10108@sst.scaler.com       | password: password123');
    console.log('Student: rohit.24bcs10019@sst.scaler.com       | password: password123');
    console.log('---------------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  }
};

seedData();
