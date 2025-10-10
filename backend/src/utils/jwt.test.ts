import { generateToken, verifyToken } from './jwt';

console.log('🧪 Testing JWT Utilities...\n');

// Test 1: Generate a token
console.log('Test 1: Generate Token');
const testUserId = 'test-user-123';
const testEmail = 'test@example.com';
const token = generateToken(testUserId, testEmail);
console.log('✅ Token generated:', token.substring(0, 50) + '...\n');

// Test 2: Verify a valid token
console.log('Test 2: Verify Valid Token');
const payload = verifyToken(token);
if (payload && payload.userId === testUserId && payload.email === testEmail) {
  console.log('✅ Token verified successfully!');
  console.log('   User ID:', payload.userId);
  console.log('   Email:', payload.email);
} else {
  console.log('❌ Token verification failed!');
}
console.log();

// Test 3: Verify an invalid token
console.log('Test 3: Verify Invalid Token');
const invalidToken = 'invalid.token.here';
const invalidPayload = verifyToken(invalidToken);
if (invalidPayload === null) {
  console.log('✅ Invalid token correctly rejected');
} else {
  console.log('❌ Invalid token was accepted (BAD!)');
}
console.log();

// Test 4: Verify a tampered token
console.log('Test 4: Verify Tampered Token');
const tamperedToken = token.substring(0, token.length - 5) + 'XXXXX';
const tamperedPayload = verifyToken(tamperedToken);
if (tamperedPayload === null) {
  console.log('✅ Tampered token correctly rejected');
} else {
  console.log('❌ Tampered token was accepted (BAD!)');
}
console.log();

console.log('🎉 All JWT tests completed!');
