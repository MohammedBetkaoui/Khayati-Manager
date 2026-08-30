import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RestoreValidationService } from './restore-validation.service';

describe('RestoreValidationService', () => {
  let root: string;
  let service: RestoreValidationService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'khayati-restore-validation-'));
    service = new RestoreValidationService();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('refuses a database with foreign-key violations', () => {
    const databasePath = join(root, 'foreign-key-invalid.sqlite');
    const database = new Database(databasePath);
    database.exec(`
      PRAGMA foreign_keys = OFF;
      PRAGMA user_version = 1;
      CREATE TABLE parent (id INTEGER PRIMARY KEY);
      CREATE TABLE child (
        id INTEGER PRIMARY KEY,
        parentId INTEGER REFERENCES parent(id)
      );
      INSERT INTO child (id, parentId) VALUES (1, 999);
    `);
    database.close();

    expect(() => service.validateDatabase(databasePath, 1, false)).toThrow(
      expect.objectContaining({ code: 'FOREIGN_KEY_VIOLATION' }),
    );
  });

  it('requires the centralized critical table list after migrations', () => {
    const databasePath = join(root, 'incomplete.sqlite');
    const database = new Database(databasePath);
    database.pragma('user_version = 1');
    database.close();

    expect(() => service.validateDatabase(databasePath, 1, true)).toThrow(
      expect.objectContaining({ code: 'CRITICAL_TABLE_MISSING' }),
    );
  });
});
