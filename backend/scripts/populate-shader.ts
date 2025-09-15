import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if any users exist
    const userCount = await prisma.user.count();
    
    let userId: string;
    
    if (userCount === 0) {
      // Create a sample user if none exist
      console.log('No users found. Creating sample user...');
      
      const hashedPassword = await bcrypt.hash('samplePassword123', 10);
      
      const sampleUser = await prisma.user.create({
        data: {
          email: 'sample@example.com',
          username: 'sampleuser',
          password: hashedPassword,
        },
      });
      
      userId = sampleUser.id;
      console.log('Sample user created:', sampleUser.username);
    } else {
      // Use the first existing user
      const firstUser = await prisma.user.findFirst();
      userId = firstUser!.id;
      console.log('Using existing user');
    }
    
    // Create a rainbow spiral shader
    const shaderCode = `precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void main() {
    // Normalize coordinates to -1 to 1
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    
    // Calculate distance from center
    float dist = length(uv);
    
    // Calculate angle from center
    float angle = atan(uv.y, uv.x);
    
    // Create spiral effect
    float spiral = angle + dist * 10.0 - iTime * 2.0;
    
    // Create rainbow colors
    vec3 color = vec3(
        0.5 + 0.5 * cos(spiral),
        0.5 + 0.5 * cos(spiral + 2.094),
        0.5 + 0.5 * cos(spiral + 4.189)
    );
    
    // Add radial gradient
    color *= 1.0 - dist * 0.5;
    
    // Add pulsing effect
    color *= 0.8 + 0.2 * sin(iTime * 3.0 + dist * 5.0);
    
    gl_FragColor = vec4(color, 1.0);
}`;

    // Create the shader entry
    const shader = await prisma.shader.create({
      data: {
        title: 'Rainbow Spiral',
        code: shaderCode,
        description: 'A colorful animated spiral shader with rainbow colors and pulsing effects',
        isPublic: true,
        userId: userId,
        thumbnail: null, // Could be generated later
      },
    });
    
    console.log('Shader created successfully!');
    console.log('ID:', shader.id);
    console.log('Title:', shader.title);
    console.log('Created at:', shader.createdAt);
    
  } catch (error) {
    console.error('Error populating shader:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });