import readline from 'readline';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { generateTotpSecret } from '../services/totp';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function bootstrapAdmin() {
  console.log('\n======================================================');
  console.log('   KRISHI Platform — One-Time Super Admin Bootstrap   ');
  console.log('======================================================\n');

  try {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        adminSubRole: 'SUPER_ADMIN',
      },
    });

    if (existingSuperAdmin) {
      console.log(`⚠️ A Super Admin already exists in this database: ${existingSuperAdmin.phone}`);
      const proceed = await askQuestion('Do you want to provision an additional Super Admin? (yes/no): ');
      if (proceed.toLowerCase() !== 'yes') {
        console.log('Bootstrap cancelled.');
        process.exit(0);
      }
    }

    const phone = await askQuestion('Enter Super Admin 10-digit Mobile Number: ');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      console.error('❌ Error: Mobile number must be a valid 10-digit Indian phone number.');
      process.exit(1);
    }

    const name = await askQuestion('Enter Super Admin Full Name: ');
    if (!name || name.length < 2) {
      console.error('❌ Error: Name must be at least 2 characters.');
      process.exit(1);
    }

    const email = await askQuestion('Enter Super Admin Email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Error: Valid email address is required.');
      process.exit(1);
    }

    const password = await askQuestion('Enter Super Admin Password (min 8 chars): ');
    if (!password || password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters.');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const totpSecret = generateTotpSecret();

    // Upsert admin user
    const adminUser = await prisma.user.upsert({
      where: { phone },
      update: {
        name,
        email,
        passwordHash,
        totpSecret,
        totpEnabled: true,
        role: 'ADMIN',
        adminSubRole: 'SUPER_ADMIN',
        isBlocked: false,
      },
      create: {
        phone,
        name,
        email,
        passwordHash,
        totpSecret,
        totpEnabled: true,
        role: 'ADMIN',
        adminSubRole: 'SUPER_ADMIN',
        village: 'Headquarters',
        district: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        action: 'BOOTSTRAP_SUPER_ADMIN',
        entity: 'User',
        entityId: adminUser.id,
        afterJson: { phone: adminUser.phone, email: adminUser.email, role: adminUser.role },
      },
    });

    console.log('\n✅ Super Admin successfully provisioned!');
    console.log(`   User ID:     ${adminUser.id}`);
    console.log(`   Email:       ${adminUser.email}`);
    console.log(`   Phone:       ${adminUser.phone}`);
    console.log(`   Role:        ${adminUser.role} (${adminUser.adminSubRole})`);
    console.log(`   TOTP Secret: ${totpSecret}`);
    console.log('\n   Enter this secret in Google Authenticator to generate 2FA login codes.\n');
  } catch (err: any) {
    logger.error({ err }, 'Failed to bootstrap Super Admin');
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();
