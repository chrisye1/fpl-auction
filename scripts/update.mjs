// Fetches gameweek points for every player in squads.json from the public FPL API
// and writes data/points.json. Run by .github/workflows/update.yml every hour.
import fs from 'node:fs/promises';

const BASE = process.env.FPL_BASE || 'https://fantasy.premierleague.com/api';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; fpl-auction-dashboard)' };
const POSITIONS = { 1: 'Goalkeeper', 2: 'Defender', 3: 'Midfielder', 4: 'Forward' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function get(path) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(BASE + path, { headers: HEADERS });
      if (res.ok) return await res.json();
      last = new Error(`${path} -> HTTP ${res.status}`);
    } catch (e) { last = e; }
    await sleep(1500 * (i + 1));
  }
  throw last;
}

const squadsFile = JSON.parse(await fs.readFile('squads.json', 'utf8'));
const boot = await get('/bootstrap-static/');
const teams = new Map(boot.teams.map((t) => [t.id, t.short_name]));
const byCode = new Map(boot.elements.map((e) => [e.code, e]));
const byId = new Map(boot.elements.map((e) => [e.id, e]));

const current = boot.events.find((e) => e.is_current) || [...boot.events].reverse().find((e) => e.finished);
const currentGw = current ? current.id : 0;

const problems = [];
function resolve(entry) {
  if (entry.code != null && byCode.has(Number(entry.code))) return byCode.get(Number(entry.code));
  if (entry.id != null && byId.has(Number(entry.id))) return byId.get(Number(entry.id));
  const matches = boot.elements.filter((e) => norm(e.web_name) === norm(entry.player) &&
    (!entry.team || norm(teams.get(e.team)) === norm(entry.team)));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) problems.push(`${entry.owner}: no FPL player named "${entry.player}"${entry.team ? ' at ' + entry.team : ''}`);
  else problems.push(`${entry.owner}: "${entry.player}" matches ${matches.length} players (${matches.map((m) => teams.get(m.team)).join(', ')}) - add "team": "XXX" to the entry`);
  return null;
}

const players = {};
for (const entry of squadsFile.squads) {
  const el = resolve(entry);
  if (!el) continue;
  const summary = await get(`/element-summary/${el.id}/`);
  const gws = {};
  for (const h of summary.history || []) {
    const g = (gws[h.round] ||= { p: 0, m: 0, g: 0, a: 0, b: 0 }); // double gameweeks add up
    g.p += h.total_points; g.m += h.minutes; g.g += h.goals_scored; g.a += h.assists; g.b += h.bonus;
  }
  players[`${entry.owner}|${entry.player}`] = { position: POSITIONS[el.element_type] || '', team: teams.get(el.team) || '', gws };
  await sleep(120);
}

if (problems.length) {
  console.error('Could not match these squad entries:\n - ' + problems.join('\n - '));
  process.exit(1);
}

let previous = null;
try { previous = JSON.parse(await fs.readFile('data/points.json', 'utf8')); } catch {}
const same = previous && previous.current_gw === currentGw && JSON.stringify(previous.players) === JSON.stringify(players);
const out = {
  updated: same ? previous.updated : new Date().toISOString(),
  current_gw: currentGw,
  source: 'fantasy.premierleague.com',
  players,
};
await fs.mkdir('data', { recursive: true });
await fs.writeFile('data/points.json', JSON.stringify(out));
console.log(same ? 'No changes.' : `Updated: ${Object.keys(players).length} players, gameweek ${currentGw}.`);
