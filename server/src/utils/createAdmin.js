/**
 * Utility script to safely create or promote a campus administrator
 * Usage: node src/utils/createAdmin.js <email> [password] [name]
 * Example: node src/utils/createAdmin.js admin@sst.scaler.com password123 "Campus Administrator"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function createOrPromoteAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] ? args[0].toLowerCase().trim() : 'admin@sst.scaler.com';
  const password = args[1] || 'AdminPass123!';
  const name = args[2] || 'Campus Administrator';

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Admin Setup] Connected to database:', mongoose.connection.name);

    let user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      user.status = 'active';
      if (args[1]) {
        user.password = password; // Triggers pre-save hash
      }
      await user.save();
      console.log(`[Admin Setup] Successfully promoted existing user '${user.email}' to administrator.`);
    } else {
      user = await User.create({
        name,
        email,
        password,
        role: 'admin',
        status: 'active',
        contactPreference: 'email',
      });
      console.log(`[Admin Setup] Created new administrator: ${user.email}`);
    }

    console.log('--------------------------------------------------');
    console.log(`Email:    ${user.email}`);
    console.log(`Role:     ${user.role}`);
    console.log('--------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('[Admin Setup Error]', err.message);
    process.exit(1);
  }
}

createOrPromoteAdmin();
