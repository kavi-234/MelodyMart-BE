import mongoose from 'mongoose';
import User from '../models/user.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateUsers() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');
    
    // Update all existing customers
    const customerUpdate = await User.updateMany(
      { 
        role: 'customer', 
        profileCompleted: { $exists: false } 
      },
      { 
        $set: { 
          profileCompleted: true,
          verificationStatus: 'APPROVED',
          isVerified: true
        }
      }
    );
    console.log(`Updated ${customerUpdate.modifiedCount} customer profiles`);
    
    // Update all existing tutors/repair specialists to mark profile as completed
    const professionalUpdate = await User.updateMany(
      { 
        role: { $in: ['tutor', 'repair_specialist'] },
        profileCompleted: { $exists: false }
      },
      { 
        $set: { 
          profileCompleted: true
        }
      }
    );
    console.log(`Updated ${professionalUpdate.modifiedCount} professional profiles`);
    
    // Update old verification status values to new format
    const pendingUpdate = await User.updateMany(
      { verificationStatus: 'pending' },
      { $set: { verificationStatus: 'PENDING_APPROVAL' } }
    );
    console.log(`Updated ${pendingUpdate.modifiedCount} pending verifications`);
    
    const approvedUpdate = await User.updateMany(
      { verificationStatus: 'approved' },
      { $set: { verificationStatus: 'APPROVED' } }
    );
    console.log(`Updated ${approvedUpdate.modifiedCount} approved verifications`);
    
    const rejectedUpdate = await User.updateMany(
      { verificationStatus: 'rejected' },
      { $set: { verificationStatus: 'REJECTED' } }
    );
    console.log(`Updated ${rejectedUpdate.modifiedCount} rejected verifications`);
    
    // Add verificationDocuments array if it doesn't exist
    const documentsUpdate = await User.updateMany(
      { verificationDocuments: { $exists: false } },
      { $set: { verificationDocuments: [] } }
    );
    console.log(`Added verificationDocuments array to ${documentsUpdate.modifiedCount} users`);
    
    // Migrate old documentUrl to new verificationDocuments array
    const migrateDocuments = await User.updateMany(
      { 
        documentUrl: { $exists: true, $ne: null },
        verificationDocuments: { $size: 0 }
      },
      [{
        $set: {
          verificationDocuments: [{
            fileUrl: '$documentUrl',
            fileName: 'Migrated Document',
            uploadedAt: new Date()
          }]
        }
      }],
      { updatePipeline: true }
    );
    console.log(`Migrated ${migrateDocuments.modifiedCount} document URLs to new format`);
    
    console.log('\n✅ Migration completed successfully!');
    
    // Show summary
    const summary = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          verified: { 
            $sum: { 
              $cond: [{ $eq: ['$isVerified', true] }, 1, 0] 
            } 
          }
        }
      }
    ]);
    
    console.log('\nUser Summary:');
    summary.forEach(role => {
      console.log(`  ${role._id}: ${role.count} total, ${role.verified} verified`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateUsers();
