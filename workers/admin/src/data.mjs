import { AdminError } from './auth.mjs';

export const REPO = 'MoonWhale-ko/-Arknights-Tool';
export const BRANCH = 'main';
export const FILES = Object.freeze({
  future: 'data/future-names.json',
  aliases: 'data/operator-aliases.json',
  images: 'data/item-images.json',
  operators: 'data/operators.json',
  catalog: 'data/admin-catalog.json',
});
export const EDITABLE = new Set(['future', 'aliases', 'images']);
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const text = (v, max = 200) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u001f]/.test(v);
const id = v => /^char_[a-zA-Z0-9_]+$/.test(v);
const safeKey = v => !['__proto__', 'prototype', 'constructor'].includes(v);
export function imageURL(value) {
  if (typeof value !== 'string' || value.length > 4096) return false;
  if (/^assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.split('/').includes('..')) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; }
  catch { return false; }
}
function stringMap(v, keyCheck = safeKey) {
  return object(v) && Object.keys(v).length <= 5000 && Object.entries(v).every(([k, val]) => keyCheck(k) && safeKey(k) && text(val));
}
export function validate(key, doc) {
  if (!EDITABLE.has(key)) throw new AdminError('read-only', 403);
  let valid = object(doc);
  if (key === 'future') {
    valid &&= text(doc.nameSource, 2048) && stringMap(doc.operators, id) &&
      stringMap(doc.professions) && stringMap(doc.items) && Array.isArray(doc.releasedOperators) &&
      doc.releasedOperators.length <= 5000 && doc.releasedOperators.every(x => typeof x === 'string' && id(x)) &&
      new Set(doc.releasedOperators).size === doc.releasedOperators.length;
  } else if (key === 'aliases') {
    valid &&= object(doc.aliases) && Object.keys(doc.aliases).length <= 5000 &&
      Object.entries(doc.aliases).every(([k, list]) => safeKey(k) && text(k) && Array.isArray(list) &&
        list.length <= 40 && list.every(x => text(x, 100)) && new Set(list).size === list.length);
  } else if (key === 'images') {
    valid &&= object(doc.items) && Object.keys(doc.items).length <= 10000 &&
      Object.entries(doc.items).every(([k, item]) => /^[a-zA-Z0-9_-]+$/.test(k) && safeKey(k) && object(item) && text(item.name) && imageURL(item.url));
  }
  if (!valid) throw new AdminError('invalid-data', 422);
  return doc;
}

export function githubClient(env, fetcher = fetch) {
  async function api(path, options = {}) {
    if (!env.GITHUB_TOKEN) throw new AdminError('github-not-configured', 503);
    const response = await fetcher('https://api.github.com/repos/' + REPO + path, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json', 'User-Agent': 'arknights-private-admin',
        Authorization: 'Bearer ' + env.GITHUB_TOKEN, 'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!response.ok) {
      if ([409, 422].includes(response.status)) throw new AdminError('conflict', 409);
      if ([401, 403].includes(response.status)) throw new AdminError('github-permission', 502);
      if (response.status === 404) throw new AdminError('github-not-found', 404);
      throw new AdminError('github-unavailable', 502);
    }
    return response.status === 204 ? null : response.json();
  }
  async function read(key, ref = BRANCH) {
    const path = FILES[key];
    if (!path) throw new AdminError('not-found', 404);
    // Raw media works for generated operators.json, which exceeds the Contents API inline limit.
    const meta = await api('/contents/' + path + '?ref=' + ref);
    let doc;
    if (meta.encoding === 'base64' && meta.content) {
      const bytes = Uint8Array.from(atob(meta.content.replace(/\s/g, '')), c => c.charCodeAt(0));
      doc = JSON.parse(new TextDecoder().decode(bytes));
    } else {
      const response = await fetcher('https://raw.githubusercontent.com/' + REPO + '/' + ref + '/' + path);
      if (!response.ok) throw new AdminError('github-unavailable', 502);
      doc = await response.json();
      // Large generated files are read-only. Editable files must be returned atomically with their SHA.
      if (EDITABLE.has(key)) throw new AdminError('file-too-large', 413);
    }
    return { sha: meta.sha, doc };
  }
  return {
    read,
    async save(changes) {
      if (!Array.isArray(changes) || !changes.length || changes.length > 3 ||
          new Set(changes.map(c => c?.key)).size !== changes.length) throw new AdminError('invalid-data', 422);
      for (const change of changes) {
        validate(change.key, change.doc);
        if (!/^[a-f0-9]{40}$/.test(change.sha || '')) throw new AdminError('invalid-revision');
      }
      const head = await api('/git/ref/heads/' + BRANCH);
      const parent = head.object.sha;
      const commit = await api('/git/commits/' + parent);
      const tree = [], revisions = {};
      for (const change of changes) {
        const current = await read(change.key, parent);
        if (current.sha !== change.sha) throw new AdminError('conflict', 409);
        revisions[change.key] = current.sha;
        if (JSON.stringify(current.doc) === JSON.stringify(change.doc)) continue;
        const blob = await api('/git/blobs', { method: 'POST', body: JSON.stringify({
          content: JSON.stringify(change.doc, null, 2) + '\n', encoding: 'utf-8',
        }) });
        tree.push({ path: FILES[change.key], mode: '100644', type: 'blob', sha: blob.sha });
        revisions[change.key] = blob.sha;
      }
      if (!tree.length) return { changed: false, revisions };
      const nextTree = await api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
      const nextCommit = await api('/git/commits', { method: 'POST', body: JSON.stringify({
        message: 'Update site data from private admin', tree: nextTree.sha, parents: [parent],
      }) });
      // Concurrent changes to main fail without overwriting or partially saving files.
      await api('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: nextCommit.sha, force: false }) });
      return { changed: true, revisions, commit: nextCommit.sha, url: nextCommit.html_url };
    },
    async refresh() {
      await api('/actions/workflows/admin-data.yml/dispatches', {
        method: 'POST', body: JSON.stringify({ ref: BRANCH }),
      });
      return { url: 'https://github.com/' + REPO + '/actions/workflows/admin-data.yml' };
    },
    async runs() {
      const result = await api('/actions/runs?per_page=20');
      return result.workflow_runs.filter(r => ['.github/workflows/admin-data.yml', '.github/workflows/pages.yml'].includes(r.path))
        .map(r => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, url: r.html_url, createdAt: r.created_at, sha: r.head_sha }));
    },
  };
}
