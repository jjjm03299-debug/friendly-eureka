const { spawn, execSync, spawnSync } = require('child_process');
const http = require('http');

// Configuration
const MODEL_NAME = process.env.OLLAMA_MODEL || 'llama3';
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if Ollama server is up and running
function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/tags`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function waitForServer(maxRetries = 30, interval = 1000) {
  console.log('Waiting for Ollama server to start...');
  for (let i = 0; i < maxRetries; i++) {
    if (await checkServer()) {
      console.log('Ollama server is ready!');
      return true;
    }
    await sleep(interval);
  }
  throw new Error('Ollama server failed to start in time.');
}

async function main() {
  try {
    // 1. Start Ollama server in the background
    console.log('Starting Ollama server...');
    const ollamaServer = spawn('ollama', ['serve'], {
      stdio: 'ignore', // Detach server stdio so it doesn't mix with interactive CLI output
      detached: true
    });

    // Handle background process clean exit on terminate signals
    process.on('SIGINT', () => {
      ollamaServer.kill('SIGTERM');
      process.exit(0);
    });

    // 2. Wait for server readiness
    await waitForServer();

    // 3. Optional: Ollama Sign-in
    if (process.env.OLLAMA_TOKEN) {
      console.log('Signing in to Ollama...');
      try {
        execSync(`ollama signin`, { stdio: 'inherit' });
      } catch (err) {
        console.warn('Sign-in skipped or failed, proceeding anyway...', err.message);
      }
    }

    // 4. Pull the model
    console.log(`Pulling model: ${MODEL_NAME}...`);
    execSync(`ollama pull ${MODEL_NAME}`, { stdio: 'inherit' });
    console.log(`Model ${MODEL_NAME} successfully pulled!`);

    // If running during Docker build phase, stop the background server and exit cleanly
    if (process.env.PREP_ONLY === 'true') {
      console.log('Preparation complete. Stopping temporary server...');
      ollamaServer.kill('SIGTERM');
      process.exit(0);
    }

    // 5. Run interactive session with 'ollama run'
    console.log(`\n--- Starting interactive session for ${MODEL_NAME} ---\n`);
    spawnSync('ollama', ['run', MODEL_NAME], {
      stdio: 'inherit', // Connect terminal stdio so you can chat interactively
      shell: true
    });

    // Clean up background server process when the user exits the chat session
    ollamaServer.kill('SIGTERM');

  } catch (error) {
    console.error('Error during Ollama setup:', error);
    process.exit(1);
  }
}

main();
