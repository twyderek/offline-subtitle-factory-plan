import fs from 'node:fs';
import path from 'node:path';

export class JobLogger {
  constructor(jobRoot, maxLines = 500) {
    this.logPath = path.join(jobRoot, 'logs', 'job.log.jsonl');
    this.maxLines = maxLines;
    fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
  }

  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: String(message || ''),
      ...meta,
    };
    fs.appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`, 'utf8');
    this.rotate();
    return entry;
  }

  info(message, meta) {
    return this.log('info', message, meta);
  }
  warn(message, meta) {
    return this.log('warn', message, meta);
  }
  error(message, meta) {
    return this.log('error', message, meta);
  }
  debug(message, meta) {
    return this.log('debug', message, meta);
  }

  rotate() {
    try {
      const lines = fs.readFileSync(this.logPath, 'utf8').trim().split('\n').filter(Boolean);
      if (lines.length > this.maxLines)
        fs.writeFileSync(this.logPath, `${lines.slice(-this.maxLines).join('\n')}\n`, 'utf8');
    } catch {
      // Logging must never make a subtitle job fail.
    }
  }

  getRecent(count = 100) {
    try {
      const lines = fs.readFileSync(this.logPath, 'utf8').trim().split('\n').filter(Boolean);
      return lines.slice(-count).flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
    } catch {
      return [];
    }
  }
}
