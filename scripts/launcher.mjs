import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/POSTGRES_PASSWORD=([^\s&]+)/g, 'POSTGRES_PASSWORD=[REDACTED]')
    .replace(/postgresql:\/\/([^:]+):([^@]+)@/g, 'postgresql://$1:[REDACTED]@')
    .replace(/redis:\/\/([^:]+):([^@]+)@/g, 'redis://$1:[REDACTED]@');
}

export function isPortAvailable(port, host = 'localhost') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

export function checkDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function checkTcpConnection(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(host, port, name, maxRetries = 30, intervalMs = 1000) {
  console.log(`⏳ Waiting for ${name} health check on ${host}:${port}...`);
  for (let i = 1; i <= maxRetries; i++) {
    const ok = await checkTcpConnection(host, port);
    if (ok) {
      console.log(`✅ ${name} is healthy and accepting connections on port ${port}.`);
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.error(`❌ ${name} failed to become healthy within ${maxRetries}s.`);
  return false;
}

export async function handleStatus() {
  console.log('\n🔍 --- BotolaHub Platform Status ---');

  const dockerOk = checkDockerRunning();
  console.log(`Docker Service:  ${dockerOk ? '✅ RUNNING' : '❌ NOT RUNNING'}`);

  const pgOk = await checkTcpConnection('localhost', 5432);
  console.log(`PostgreSQL (5432): ${pgOk ? '✅ HEALTHY' : '❌ UNREACHABLE'}`);

  const redisOk = await checkTcpConnection('localhost', 6379);
  console.log(`Redis (6379):      ${redisOk ? '✅ HEALTHY' : '❌ UNREACHABLE'}`);

  const apiOk = await checkTcpConnection('localhost', 3000);
  console.log(`API (3000):        ${apiOk ? '✅ RUNNING' : '⚪ STOPPED'}`);

  const webOk = await checkTcpConnection('localhost', 3001);
  console.log(`User Web (3001):   ${webOk ? '✅ RUNNING' : '⚪ STOPPED'}`);

  const adminOk = await checkTcpConnection('localhost', 3002);
  console.log(`Admin Web (3002):  ${adminOk ? '✅ RUNNING' : '⚪ STOPPED'}`);

  const metroOk = await checkTcpConnection('localhost', 8081);
  console.log(`Expo/Metro (8081): ${metroOk ? '✅ RUNNING' : '⚪ STOPPED'}`);

  console.log('-----------------------------------\n');
}

export async function handleStop() {
  console.log('🛑 Stopping BotolaHub containers (preserving volumes)...');
  try {
    execSync('docker compose -f infrastructure/docker-compose.yml stop', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('✅ Containers stopped successfully.');
  } catch (err) {
    console.error('⚠️ Failed to stop Docker containers:', err.message);
  }
}

export async function handleStart() {
  console.log('🚀 --- Starting BotolaHub Local Development Platform ---');

  // 1. Environment Validation
  const envFile = path.join(rootDir, '.env');
  if (!fs.existsSync(envFile)) {
    console.log('⚠️ .env file missing. Copying .env.example to .env...');
    fs.copyFileSync(path.join(rootDir, '.env.example'), envFile);
  }

  // 2. Docker Check
  if (!checkDockerRunning()) {
    console.error('❌ CRITICAL: Docker is not running. Please start Docker Desktop/daemon and try again.');
    process.exit(1);
  }

  // 3. Port Availability Checks
  const requiredPorts = [
    { port: 5432, name: 'PostgreSQL' },
    { port: 6379, name: 'Redis' },
  ];

  for (const { port, name } of requiredPorts) {
    const open = await isPortAvailable(port);
    if (!open) {
      console.log(`ℹ️ Port ${port} (${name}) is already in use (assuming active local container/service).`);
    }
  }

  // 4. Start Infrastructure Containers
  console.log('📦 Launching PostgreSQL & Redis via Docker Compose...');
  try {
    execSync('docker compose -f infrastructure/docker-compose.yml up -d', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('❌ Failed to start Docker containers:', redactSecrets(err.message));
    process.exit(1);
  }

  // 5. Wait for Real Infrastructure Health
  const pgHealthy = await waitForHealth('localhost', 5432, 'PostgreSQL');
  const redisHealthy = await waitForHealth('localhost', 6379, 'Redis');

  if (!pgHealthy || !redisHealthy) {
    console.error('❌ Infrastructure failed health checks. Aborting startup.');
    process.exit(1);
  }

  // 6. Prisma Generation & Migrations
  console.log('⚙️ Generating Prisma Client & Deploying Migrations...');
  try {
    execSync('pnpm --filter @botolahub/database db:generate', { cwd: rootDir, stdio: 'inherit' });
    execSync('pnpm --filter @botolahub/database db:deploy', { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Database migration failed:', redactSecrets(err.message));
    process.exit(1);
  }

  // 7. Orchestrate Child Applications
  const children = [];

  const startChild = (name, command, args, cwd) => {
    const child = spawn(command, args, {
      cwd: path.join(rootDir, cwd),
      shell: true,
      env: { ...process.env, FORCE_COLOR: 'true' },
    });

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) console.log(`[${name}] ${redactSecrets(line)}`);
      }
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) console.error(`[${name}] ${redactSecrets(line)}`);
      }
    });

    children.push({ name, process: child });
  };

  console.log('⚡ Launching API, Workers, Web, Admin, and Mobile Apps...');
  startChild('API', 'pnpm', ['dev'], 'apps/api');
  startChild('WORKERS', 'pnpm', ['dev'], 'apps/workers');
  startChild('WEB', 'pnpm', ['dev'], 'apps/web');
  startChild('ADMIN', 'pnpm', ['dev'], 'apps/admin');
  startChild('MOBILE', 'pnpm', ['dev'], 'apps/mobile');

  // 8. Output Local Service URLs
  console.log('\n✨ --- BotolaHub Application Endpoints ---');
  console.log('🌐 User Web Application:  http://localhost:3001');
  console.log('🛠️ Admin Web Application: http://localhost:3002');
  console.log('🔌 API Service Health:    http://localhost:3000/api/v1/health');
  console.log('📖 OpenAPI / Swagger:     http://localhost:3000/api/docs');
  console.log('📱 Mobile Metro Server:   http://localhost:8081');
  console.log('-----------------------------------------\n');
  console.log('Press Ctrl+C to terminate application processes (containers will remain preserved).\n');

  // 9. Graceful SIGINT Cleanup
  const cleanup = () => {
    console.log('\n🛑 Shutting down child application processes...');
    for (const { name, process: p } of children) {
      console.log(`Stopping [${name}]...`);
      p.kill('SIGINT');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Command CLI Router
const action = process.argv[2] || 'start';

if (action === 'status') {
  handleStatus();
} else if (action === 'stop') {
  handleStop();
} else {
  handleStart().catch((err) => {
    console.error('Fatal launcher error:', redactSecrets(err.message));
    process.exit(1);
  });
}
