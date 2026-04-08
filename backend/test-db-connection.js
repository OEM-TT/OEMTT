const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.development' });

// Test both direct connection and pooler
const directUrl = process.env.DATABASE_URL;
const poolerUrl = directUrl?.replace(':5432', ':6543').replace('db.', 'aws-0-us-east-1.pooler.supabase.com');

console.log('Testing Direct Connection (5432)...');
console.log('URL:', directUrl?.substring(0, 50) + '...');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');
    
    // Try to connect
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Run a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test successful:', result);
    
    // Check if we can query a table
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('✅ Database tables found:', tableCount);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
