import { spawn } from 'node:child_process';
import process from 'node:process';

const services = [
  { name: 'Event Bus', workspace: 'event-bus' },
  { name: 'MS-Produtos', workspace: 'ms-produtos' },
  { name: 'MS-Pedidos', workspace: 'ms-pedidos' },
  { name: 'MS-Query', workspace: 'ms-query' },
  { name: 'Frontend', workspace: 'frontend' },
];

const children = [];
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('Inicie o BooksTop com npm run dev.');
  process.exit(1);
}

function startService(service) {
  const child = spawn(process.execPath, [npmCli, 'run', 'dev', '--workspace', service.workspace], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  child.on('error', (error) => {
    console.error(`[${service.name}] Erro ao iniciar:`, error.message);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${service.name}] encerrado.`);
      return;
    }

    if (code !== 0 && code !== null) {
      console.error(`[${service.name}] encerrou com código ${code}.`);
    }
  });

  children.push(child);
}

console.log('\n📚 Iniciando BooksTop...\n');

for (const service of services) {
  startService(service);
}

function shutdown() {
  console.log('\nEncerrando BooksTop...');

  for (const child of children) {
    if (!child || child.killed) continue;

    try {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          stdio: 'ignore',
        });
      } else {
        child.kill('SIGTERM');
      }
    } catch {}
  }

  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
