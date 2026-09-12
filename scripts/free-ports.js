import { execSync } from 'node:child_process';

const ports = [5199, 8799, 5173, 8787, 4002, 5188];

function killPort(port) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen' | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: 'utf8' },
    );
    const pids = out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line));

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Liberado puerto ${port} (pid ${pid})`);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

for (const port of ports) {
  killPort(port);
}

console.log('Puertos listos.');
