import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

export async function sha256File(filePath: string) {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

export async function fileMetadata(filePath: string) {
  const metadata = await stat(filePath);
  return {
    size: metadata.size,
    sha256: await sha256File(filePath),
  };
}
