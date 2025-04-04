import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('API Key:', process.env.NF_API_KEY ? 'Present' : 'Missing');

  // Spawn the server process
  const serverProcess = spawn('node', [join(__dirname, 'dist', 'index.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NF_API_KEY: process.env.NF_API_KEY }
  });

  // Send test messages to stdin
  const addToolMessage = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'add',
      arguments: { a: 5, b: 3 }
    },
    id: 1
  };

  const greetingMessage = {
    jsonrpc: '2.0',
    method: 'resources/read',
    params: {
      uri: 'greeting://Alice'
    },
    id: 2
  };

  // Listen for responses
  serverProcess.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('Server response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Raw server output:', data.toString());
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Send test messages
  console.log('Testing add tool...');
  serverProcess.stdin.write(JSON.stringify(addToolMessage) + '\n');

  setTimeout(() => {
    console.log('\nTesting greeting resource...');
    serverProcess.stdin.write(JSON.stringify(greetingMessage) + '\n');
  }, 1000);

  // Clean up after tests
  setTimeout(() => {
    console.log('\nTests complete, cleaning up...');
    serverProcess.kill();
    process.exit(0);
  }, 2000);
}

main().catch(console.error);
