declare module 'tar-stream' {
  import { Readable, Writable } from 'node:stream';

  export type Headers = {
    name: string;
    size?: number;
    mode?: number;
    mtime?: Date;
    type?: string;
  };

  export interface Pack extends Readable {
    entry(
      headers: Headers,
      callback?: (error?: Error | null) => void,
    ): Writable;
    entry(
      headers: Headers,
      buffer: Buffer,
      callback?: (error?: Error | null) => void,
    ): Writable;
    finalize(): void;
  }

  export interface Extract extends Writable {
    on(
      event: 'entry',
      listener: (
        headers: Headers,
        stream: Readable,
        next: (error?: Error | null) => void,
      ) => void,
    ): this;
  }

  export function pack(): Pack;
  export function extract(): Extract;
}
