import { createReadStream } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const MAX_BYTES = 30 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const IMAGE_EXT = new Set(Object.values(EXT_BY_MIME));

const PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0f1419" />
<title>Скриншот в проект</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f1419;
    color: #e6edf3;
  }
  main { max-width: 560px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: -0.01em; }
  p.lead { margin: 0 0 24px; color: #8b98a5; }
  .pick {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    min-height: 64px;
    border: 1px dashed #2f3b47;
    border-radius: 16px;
    background: #161d25;
    color: #e6edf3;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
  }
  .pick:active { background: #1d2731; }
  .pick input { display: none; }
  .hint { margin: 12px 0 0; color: #6e7c8a; font-size: 13px; }
  ul { list-style: none; margin: 24px 0 0; padding: 0; display: grid; gap: 8px; }
  li {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    background: #161d25;
    border: 1px solid #232d38;
    font-size: 14px;
  }
  li.ok { border-color: #2e6b4a; }
  li.error { border-color: #7a2f2f; color: #ffb4b4; }
  li img { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; background: #0b1015; }
  .meta { min-width: 0; flex: 1; }
  .meta b { display: block; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta code { color: #8b98a5; font-size: 12px; word-break: break-all; }
  .recent { margin-top: 32px; }
  .recent h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #6e7c8a; margin: 0; }
</style>
</head>
<body>
<main>
  <h1>Скриншот в проект</h1>
  <p class="lead">Выбери снимок экрана — он попадёт в папку Task/screens на компьютере.</p>

  <label class="pick">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.2"/></svg>
    <span>Выбрать скриншот</span>
    <input id="file" type="file" accept="image/*" multiple />
  </label>
  <p class="hint">Можно выбрать несколько файлов. Максимум 30 МБ каждый.</p>

  <ul id="list"></ul>

  <section class="recent">
    <h2>Последние загрузки</h2>
    <ul id="recent"></ul>
  </section>
</main>
<script>
  var input = document.getElementById('file');
  var list = document.getElementById('list');
  var recent = document.getElementById('recent');

  function renderItem(name, path, size, state) {
    var li = document.createElement('li');
    if (state) li.className = state;
    var meta = document.createElement('div');
    meta.className = 'meta';
    var title = document.createElement('b');
    title.textContent = name;
    var code = document.createElement('code');
    code.textContent = path;
    meta.appendChild(title);
    meta.appendChild(code);
    li.appendChild(meta);
    if (size) {
      var kb = Math.max(1, Math.round(size / 1024));
      var sizeEl = document.createElement('span');
      sizeEl.textContent = kb + ' КБ';
      li.appendChild(sizeEl);
    }
    list.prepend(li);
    return li;
  }

  function upload(files) {
    for (var i = 0; i < files.length; i++) {
      (function (file) {
        var item = renderItem(file.name, 'загрузка…', 0, '');
        fetch('/__upload?name=' + encodeURIComponent(file.name), {
          method: 'POST',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file,
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data.ok) throw new Error(data.error || 'Не удалось загрузить');
            item.className = 'ok';
            item.querySelector('code').textContent = data.file;
            var img = document.createElement('img');
            img.alt = '';
            img.src = '/__upload/file?name=' + encodeURIComponent(data.name);
            item.insertBefore(img, item.firstChild);
            loadRecent();
          })
          .catch(function (error) {
            item.className = 'error';
            item.querySelector('code').textContent = String(error.message || error);
          });
      })(files[i]);
    }
  }

  function loadRecent() {
    fetch('/__upload/list')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        recent.innerHTML = '';
        (data.files || []).slice(0, 5).forEach(function (entry) {
          var li = renderItem(entry.name, entry.file, entry.size, '');
          li.setAttribute('data-path', entry.file);
          recent.appendChild(li);
        });
      })
      .catch(function () {});
  }

  input.addEventListener('change', function () {
    upload(Array.prototype.slice.call(input.files || []));
    input.value = '';
  });

  window.addEventListener('paste', function (event) {
    var files = Array.prototype.slice.call((event.clipboardData && event.clipboardData.files) || []);
    if (files.length) upload(files);
  });

  window.addEventListener('dragover', function (event) { event.preventDefault(); });
  window.addEventListener('drop', function (event) {
    event.preventDefault();
    upload(Array.prototype.slice.call((event.dataTransfer && event.dataTransfer.files) || []));
  });

  loadRecent();
</script>
</body>
</html>`;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function timeStamp(date = new Date()): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${day}-${time}`;
}

function safeStem(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  return (
    base
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 48) || 'screenshot'
  );
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        rejectBody(new Error('Файл больше 30 МБ'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', rejectBody);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendText(res: ServerResponse, status: number, body: string, type: string): void {
  res.statusCode = status;
  res.setHeader('content-type', type);
  res.end(body);
}

/** Dev-сервер: страница /upload и приём скриншотов с телефона в Task/screens. */
export function phoneUploadPlugin(): Plugin {
  let root = process.cwd();
  const dir = () => resolve(root, 'Task', 'screens');

  async function listFiles() {
    const entries = await readdir(dir()).catch(() => [] as string[]);
    const files = await Promise.all(
      entries
        .filter((name) => IMAGE_EXT.has(extname(name).toLowerCase()))
        .map(async (name) => {
          const info = await stat(join(dir(), name));
          return {
            name,
            file: `Task/screens/${name}`,
            size: info.size,
            modified: info.mtime.toISOString(),
          };
        }),
    );
    return files.sort((a, b) => b.modified.localeCompare(a.modified));
  }

  async function handleUpload(req: IncomingMessage, res: ServerResponse, name: string) {
    const mime = (req.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    const ext = EXT_BY_MIME[mime];
    if (!ext) {
      sendJson(res, 415, {
        ok: false,
        error: 'Можно загружать только изображения (PNG, JPEG, WebP, GIF, HEIC, AVIF)',
      });
      return;
    }

    const body = await readBody(req, MAX_BYTES);
    if (body.length === 0) {
      sendJson(res, 400, { ok: false, error: 'Пустой файл' });
      return;
    }

    const fileName = `${timeStamp()}-${safeStem(name)}${ext}`;
    await mkdir(dir(), { recursive: true });
    await writeFile(join(dir(), fileName), body);

    sendJson(res, 200, {
      ok: true,
      name: fileName,
      file: `Task/screens/${fileName}`,
      size: body.length,
    });
  }

  return {
    name: 'phone-upload',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const pathname = decodeURIComponent(url.pathname);

        if (req.method === 'GET' && pathname === '/upload') {
          sendText(res, 200, PAGE, 'text/html; charset=utf-8');
          return;
        }

        if (req.method === 'GET' && pathname === '/__upload/list') {
          void listFiles()
            .then((files) => sendJson(res, 200, { ok: true, files }))
            .catch(() => sendJson(res, 500, { ok: false, error: 'Не удалось прочитать папку' }));
          return;
        }

        if (req.method === 'GET' && pathname === '/__upload/file') {
          const name = (url.searchParams.get('name') ?? '').split(/[\\/]/).pop() ?? '';
          if (!name || !IMAGE_EXT.has(extname(name).toLowerCase())) {
            sendJson(res, 400, { ok: false, error: 'Некорректное имя файла' });
            return;
          }
          void stat(join(dir(), name))
            .then((info) => {
              res.setHeader('content-type', mimeFor(name));
              res.setHeader('content-length', String(info.size));
              res.setHeader('cache-control', 'no-store');
              return createReadStream(join(dir(), name)).pipe(res);
            })
            .catch(() => sendJson(res, 404, { ok: false, error: 'Файл не найден' }));
          return;
        }

        if (req.method === 'POST' && pathname === '/__upload') {
          void handleUpload(req, res, url.searchParams.get('name') ?? 'screenshot').catch(
            (error: unknown) => {
              const message = error instanceof Error ? error.message : 'Ошибка загрузки';
              if (!res.headersSent) sendJson(res, 400, { ok: false, error: message });
            },
          );
          return;
        }

        next();
      });
    },
  };
}

function mimeFor(name: string): string {
  const ext = extname(name).toLowerCase();
  for (const [mime, suffix] of Object.entries(EXT_BY_MIME)) {
    if (suffix === ext) return mime;
  }
  return 'application/octet-stream';
}
