import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RestoreSwapService } from './restore-swap.service';

class FailingActivationSwapService extends RestoreSwapService {
  private renameCount = 0;

  protected override renameFile(source: string, destination: string) {
    this.renameCount += 1;
    if (this.renameCount === 2) {
      return Promise.reject(new Error('Simulated activation failure'));
    }
    return super.renameFile(source, destination);
  }
}

class FailingRollbackSwapService extends RestoreSwapService {
  private renameCount = 0;

  protected override renameFile(source: string, destination: string) {
    this.renameCount += 1;
    if (this.renameCount >= 2) {
      return Promise.reject(new Error('Simulated rename and rollback failure'));
    }
    return super.renameFile(source, destination);
  }
}

describe('RestoreSwapService', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'khayati-swap-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('restores the previous database when activation rename fails', async () => {
    const active = join(root, 'khayati.sqlite');
    const staged = join(root, 'khayati.restore-test.sqlite');
    await writeFile(active, 'previous-database');
    await writeFile(staged, 'restored-database');
    const service = new FailingActivationSwapService();

    await expect(
      service.activateDatabase(active, staged, 'test'),
    ).rejects.toMatchObject({ code: 'RESTORE_SWAP_FAILED' });
    expect(await readFile(active, 'utf8')).toBe('previous-database');
  });

  it('raises a critical error when both activation and rollback fail', async () => {
    const active = join(root, 'khayati.sqlite');
    const staged = join(root, 'khayati.restore-test.sqlite');
    await writeFile(active, 'previous-database');
    await writeFile(staged, 'restored-database');
    const service = new FailingRollbackSwapService();

    await expect(
      service.activateDatabase(active, staged, 'test'),
    ).rejects.toMatchObject({ code: 'RESTORE_ROLLBACK_FAILED' });
  });
});
