import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Bag, Entity, Job, Principal } from './types.js';
import { assert, id, now } from './util.js';
export class Store {
    readonly db: DatabaseSync;
    constructor(path: string) {
        if (path !== ':memory:')
            mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
        this.db = new DatabaseSync(path);
        const version = this.db.prepare('PRAGMA user_version').get() as Bag;
        if (Number(version.user_version) > 2) {
            this.db.close();
            throw new Error('Database di una release più recente: downgrade automatico rifiutato');
        }
        this.db.exec(`
 PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS memberships(user_id TEXT NOT NULL,workspace_id TEXT NOT NULL,role TEXT NOT NULL,PRIMARY KEY(user_id,workspace_id),FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(workspace_id) REFERENCES workspaces(id));
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS tokens(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,workspace_id TEXT NOT NULL,brand_id TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,brand_id TEXT NOT NULL,kind TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,data TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS entity_scope ON entities(workspace_id,brand_id,kind);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,brand_id TEXT NOT NULL,kind TEXT NOT NULL,entity_id TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,due_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,lease_until INTEGER,lease_token TEXT,error TEXT,unique_key TEXT UNIQUE);
 CREATE INDEX IF NOT EXISTS due_jobs ON jobs(state,due_at);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,brand_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,entity_id TEXT NOT NULL,at TEXT NOT NULL,detail TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS audit_scope ON audit(workspace_id,brand_id,at);
 CREATE TABLE IF NOT EXISTS webhook_events(account_id TEXT NOT NULL,event_id TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(account_id,event_id));
 CREATE TABLE IF NOT EXISTS oauth_states(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,brand_id TEXT NOT NULL,user_id TEXT NOT NULL,provider TEXT NOT NULL,data TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS site_admins(user_id TEXT PRIMARY KEY REFERENCES users(id));
 CREATE TABLE IF NOT EXISTS installation(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS workspace_settings(workspace_id TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(workspace_id,key));
 CREATE TABLE IF NOT EXISTS identities(provider TEXT NOT NULL,subject TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),email TEXT NOT NULL,PRIMARY KEY(provider,subject),UNIQUE(provider,user_id));
 CREATE TABLE IF NOT EXISTS user_flags(user_id TEXT PRIMARY KEY REFERENCES users(id),verified INTEGER NOT NULL DEFAULT 1,disabled INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS auth_actions(token_hash TEXT PRIMARY KEY,kind TEXT NOT NULL,email TEXT NOT NULL,user_id TEXT,workspace_id TEXT,role TEXT,data TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS session_recent(token_hash TEXT PRIMARY KEY,at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS connection_grants(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,brand_id TEXT NOT NULL,user_id TEXT NOT NULL,provider TEXT NOT NULL,data TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS connection_health(account_id TEXT PRIMARY KEY,state TEXT NOT NULL,checked_at TEXT NOT NULL,detail TEXT NOT NULL);
 PRAGMA user_version=2;`);
    }
    transaction<T>(fn: () => T): T {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const value = fn();
            this.db.exec('COMMIT');
            return value;
        }
        catch (e) {
            this.db.exec('ROLLBACK');
            throw e;
        }
    }
    private decode<T>(r: Bag): Entity<T> { return { id: r.id, workspaceId: r.workspace_id, brandId: r.brand_id, kind: r.kind, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at, data: JSON.parse(r.data) }; }
    get<T = Bag>(p: Pick<Principal, 'workspaceId' | 'brandId'>, entityId: string, kind?: string): Entity<T> { const r = this.db.prepare('SELECT * FROM entities WHERE id=? AND workspace_id=?').get(entityId, p.workspaceId) as Bag | undefined; assert(r && (!kind || r.kind === kind) && (!p.brandId || r.brand_id === p.brandId), 'NOT_FOUND', 'Risorsa non trovata', 404); return this.decode<T>(r); }
    maybe<T = Bag>(p: Pick<Principal, 'workspaceId' | 'brandId'>, entityId: string, kind?: string): Entity<T> | undefined {
        try {
            return this.get<T>(p, entityId, kind);
        }
        catch {
            return undefined;
        }
    }
    list<T = Bag>(p: Pick<Principal, 'workspaceId' | 'brandId'>, kind: string, brandId?: string, limit = 1000): Entity<T>[] { const scope = p.brandId || brandId; assert(!p.brandId || !brandId || p.brandId === brandId, 'FORBIDDEN', 'Brand non autorizzato', 403); const rows = scope ? this.db.prepare('SELECT * FROM entities WHERE workspace_id=? AND brand_id=? AND kind=? ORDER BY created_at DESC LIMIT ?').all(p.workspaceId, scope, kind, limit) : this.db.prepare('SELECT * FROM entities WHERE workspace_id=? AND kind=? ORDER BY created_at DESC LIMIT ?').all(p.workspaceId, kind, limit); return (rows as Bag[]).map(r => this.decode<T>(r)); }
    create<T>(p: Pick<Principal, 'workspaceId' | 'brandId'>, brandId: string, kind: string, data: T, entityId = id()): Entity<T> { assert(!p.brandId || p.brandId === brandId, 'FORBIDDEN', 'Brand non autorizzato', 403); const at = now(); this.db.prepare('INSERT INTO entities VALUES (?,?,?,?,1,?,?,?)').run(entityId, p.workspaceId, brandId, kind, at, at, JSON.stringify(data)); return this.get<T>(p, entityId, kind); }
    update<T>(p: Pick<Principal, 'workspaceId' | 'brandId'>, entityId: string, revision: number, data: T): Entity<T> { this.get(p, entityId); const r = this.db.prepare('UPDATE entities SET data=?,revision=revision+1,updated_at=? WHERE id=? AND workspace_id=? AND revision=?').run(JSON.stringify(data), now(), entityId, p.workspaceId, revision); assert(r.changes === 1, 'CONFLICT', 'La risorsa è stata modificata. Ricaricare prima di salvare.', 409); return this.get<T>(p, entityId); }
    remove(p: Principal, entityId: string): void { this.get(p, entityId); this.db.prepare('DELETE FROM entities WHERE id=? AND workspace_id=?').run(entityId, p.workspaceId); }
    audit(p: Principal, brandId: string, action: string, entityId: string, detail: Bag = {}): void { this.db.prepare('INSERT INTO audit VALUES (?,?,?,?,?,?,?,?)').run(id(), p.workspaceId, brandId, p.userId, action, entityId, now(), JSON.stringify(detail)); }
    audits(p: Principal, brandId: string): Bag[] { assert(!p.brandId || p.brandId === brandId, 'FORBIDDEN', 'Brand non autorizzato', 403); return this.db.prepare('SELECT * FROM audit WHERE workspace_id=? AND brand_id=? ORDER BY at DESC LIMIT 300').all(p.workspaceId, brandId) as Bag[]; }
    enqueue(p: Pick<Principal, 'workspaceId'>, brandId: string, kind: string, entityId: string, payload: Bag = {}, dueAt = Date.now(), uniqueKey = id()): string { const jobId = id(); this.db.prepare("INSERT OR IGNORE INTO jobs(id,workspace_id,brand_id,kind,entity_id,payload,state,due_at,unique_key) VALUES (?,?,?,?,?,?,'QUEUED',?,?)").run(jobId, p.workspaceId, brandId, kind, entityId, JSON.stringify(payload), dueAt, uniqueKey); const r = this.db.prepare('SELECT id FROM jobs WHERE unique_key=?').get(uniqueKey) as Bag; return r.id; }
    decodeJob(r: Bag): Job { return { id: r.id, workspaceId: r.workspace_id, brandId: r.brand_id, kind: r.kind, entityId: r.entity_id, payload: JSON.parse(r.payload), state: r.state, dueAt: r.due_at, attempts: r.attempts, leaseUntil: r.lease_until, leaseToken: r.lease_token, error: r.error }; }
    claim(at = Date.now()): Job | undefined {
        return this.transaction(() => {
            const r = this.db.prepare("SELECT * FROM jobs WHERE state='QUEUED' AND due_at<=? ORDER BY due_at,id LIMIT 1").get(at) as Bag | undefined;
            if (!r)
                return;
            const token = id();
            this.db.prepare("UPDATE jobs SET state='LEASED',attempts=attempts+1,lease_until=?,lease_token=? WHERE id=? AND state='QUEUED'").run(at + 180000, token, r.id);
            return this.decodeJob({ ...r, state: 'LEASED', attempts: r.attempts + 1, lease_until: at + 180000, lease_token: token });
        });
    }
    finish(j: Job, state: string, error: string | null = null, next?: number): void { const r = this.db.prepare('UPDATE jobs SET state=?,error=?,due_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?').run(state, error, next ?? Date.now(), j.id, j.leaseToken); assert(r.changes === 1, 'LEASE_LOST', 'Lease del job persa', 409); }
    heartbeat(j: Job): void { this.db.prepare("UPDATE jobs SET lease_until=? WHERE id=? AND lease_token=? AND state='LEASED'").run(Date.now() + 180000, j.id, j.leaseToken); }
    jobs(p: Principal, brandId: string): Job[] { assert(!p.brandId || p.brandId === brandId, 'FORBIDDEN', 'Brand non autorizzato', 403); return (this.db.prepare('SELECT * FROM jobs WHERE workspace_id=? AND brand_id=? ORDER BY due_at DESC LIMIT 300').all(p.workspaceId, brandId) as Bag[]).map(r => this.decodeJob(r)); }
    recover(at = Date.now()): void {
        this.transaction(() => {
            const rows = this.db.prepare("SELECT * FROM jobs WHERE state='LEASED' AND lease_until<?").all(at) as Bag[];
            for (const r of rows) {
                const j = this.decodeJob(r);
                const p = { workspaceId: j.workspaceId, brandId: j.brandId };
                const e = this.maybe(p, j.entityId, 'content');
                const checkpointed = j.kind === 'publish' && e && ['PROCESSING', 'PUBLISHED', 'FAILED'].includes(e.data.status) && e.data.publication;
                const uncertain = j.kind === 'publish' && !checkpointed;
                this.db.prepare('UPDATE jobs SET state=?,lease_token=NULL,lease_until=NULL,error=? WHERE id=?').run(checkpointed ? 'DONE' : uncertain ? 'UNCERTAIN' : 'QUEUED', 'Worker interrotto durante esecuzione', j.id);
                if (e && uncertain)
                    this.update(p, e.id, e.revision, { ...e.data, status: 'UNCERTAIN' });
            }
        });
    }
    close(): void { this.db.close(); }
}
