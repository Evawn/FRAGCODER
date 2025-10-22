/**
 * Manual port cleanup utility script.
 * Kills any processes running on ports 3001 (backend) and 5173 (frontend).
 * Useful for cleaning up before running Docker or after dev servers crash.
 */

const { execSync } = require('child_process');
const os = require('os');

const PORTS = [3001, 5173];
const platform = os.platform();

/**
 * Kill any process using the specified port
 */
function killPort(port) {
  console.log(`Checking port ${port}...`);

  try {
    if (platform === 'win32') {
      // Windows: Use netstat + taskkill
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`  ✓ Killed process ${pid} on port ${port}`);
          } catch (err) {
            // Process might have already exited
          }
        }
      });
    } else {
      // Mac/Linux: Use lsof + kill
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`  ✓ Killed processes on port ${port}`);
    }
  } catch (error) {
    // Port not in use - this is fine
    console.log(`  Port ${port} is free`);
  }
}

// Main execution
console.log('\n🧹 Cleaning up ports...\n');
PORTS.forEach(killPort);
console.log('\n✅ Done! Ports 3001 and 5173 are now available.\n');
