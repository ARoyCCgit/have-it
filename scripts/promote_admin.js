/**
 * Have-it Super-App — Administrative Privilege Promotion Script
 * Sets target user email to role: "super_admin" with official verification badge.
 */

const mongoose = require('../backend/user/node_modules/mongoose');
const dotenv = require('../backend/user/node_modules/dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', 'backend', 'user', '.env') });

const TARGET_EMAIL = 'arnabroy466@gmail.com';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI not found in backend/user/.env');
  process.exit(1);
}

async function promoteToAdmin() {
  try {
    console.log('🍃 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI, { dbName: 'Chatapp' });
    console.log('✅ Connected to MongoDB (Chatapp database)');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    let user = await usersCollection.findOne({ email: TARGET_EMAIL.toLowerCase() });

    if (user) {
      console.log(`🔍 Found existing user record for: ${TARGET_EMAIL}`);
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            role: 'super_admin',
            isVerified: true,
            isBanned: false,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`👑 User [${user.name} (${TARGET_EMAIL})] has been promoted to SUPER ADMIN!`);
    } else {
      console.log(`ℹ️ User with email ${TARGET_EMAIL} does not exist yet. Creating initial Super Admin profile...`);
      const newAdmin = {
        name: 'Arnab Roy',
        email: TARGET_EMAIL.toLowerCase(),
        about: 'Have-it Platform Founder & Super Administrator.',
        role: 'super_admin',
        theme: 'system',
        isVerified: true,
        isBanned: false,
        avatar: { url: '', publicId: '' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await usersCollection.insertOne(newAdmin);
      console.log(`👑 Created new Super Admin account with ID: ${result.insertedId}`);
    }

    const updatedUser = await usersCollection.findOne({ email: TARGET_EMAIL.toLowerCase() });
    console.log('\n📊 Updated Administrator Profile:');
    console.log('--------------------------------------------------');
    console.log(`User ID    : ${updatedUser._id}`);
    console.log(`Name       : ${updatedUser.name}`);
    console.log(`Email      : ${updatedUser.email}`);
    console.log(`Role       : ${updatedUser.role}`);
    console.log(`Verified   : ${updatedUser.isVerified ? '✅ Yes (Cyan Checkmark)' : '❌ No'}`);
    console.log(`Theme      : ${updatedUser.theme || 'system'}`);
    console.log(`Banned     : ${updatedUser.isBanned ? '❌ Suspended' : '✅ Active'}`);
    console.log('--------------------------------------------------\n');

    console.log('🎉 You can now log into the Admin Command Center at http://localhost:3001 using arnabroy466@gmail.com!');
  } catch (err) {
    console.error('❌ Failed to promote admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

promoteToAdmin();
