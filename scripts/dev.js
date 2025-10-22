/**
 * Development server wrapper script with proper process cleanup on Windows.
 * Kills any existing processes on ports 3001 (backend) and 5173 (frontend),
 * then starts dev servers with concurrently. Handles Ctrl+C gracefully to
 * ensure all child processes are terminated.
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const os = require('os');
const kill = require('tree-kill');

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

/**
 * Clean up all ports before starting dev servers
 */
function cleanupPorts() {
  console.log('\n🧹 Cleaning up ports...\n');
  PORTS.forEach(killPort);
  console.log('');
}

/**
 * Start the development servers using concurrently
 */
function startDevServers() {
  console.log('🚀 Starting development servers...\n');

  // Spawn npm run dev:start (which runs concurrently)
  const devProcess = spawn('npm', ['run', 'dev:start'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle Ctrl+C and other termination signals
  const cleanup = () => {
    console.log('\n\n🛑 Shutting down development servers...');

    if (devProcess.pid) {
      // Use tree-kill to kill the entire process tree
      kill(devProcess.pid, 'SIGTERM', (err) => {
        if (err) {
          console.error('Error killing process tree:', err);
          // Force kill if graceful shutdown fails
          kill(devProcess.pid, 'SIGKILL');
        }

        // Clean up ports one more time to be sure
        console.log('\n🧹 Final cleanup...\n');
        PORTS.forEach(killPort);
        console.log('\n✅ Cleanup complete. Goodbye!\n');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  // Register signal handlers
  process.on('SIGINT', cleanup);  // Ctrl+C
  process.on('SIGTERM', cleanup); // Terminal close
  process.on('exit', cleanup);    // Process exit

  // Handle dev process exit
  devProcess.on('exit', (code) => {
    console.log(`\nDev process exited with code ${code}`);
    cleanup();
  });
}

// Main execution
cleanupPorts();
startDevServers();
