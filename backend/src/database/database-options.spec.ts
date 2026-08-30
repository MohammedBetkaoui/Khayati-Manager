import {
  createDataSourceOptions,
  createNestTypeOrmOptions,
  shouldSynchronizeSchema,
} from './database-options';

describe('database options', () => {
  it('keeps synchronize opt-in during development', () => {
    expect(shouldSynchronizeSchema({ NODE_ENV: 'development' })).toBe(false);
    expect(
      shouldSynchronizeSchema({
        NODE_ENV: 'development',
        TYPEORM_SYNCHRONIZE: 'true',
      }),
    ).toBe(true);
  });

  it('forces synchronize off in production and packaged Electron', () => {
    const production = {
      NODE_ENV: 'production',
      TYPEORM_SYNCHRONIZE: 'true',
    };
    const packaged = {
      NODE_ENV: 'development',
      KHAYATI_PACKAGED: 'true',
      TYPEORM_SYNCHRONIZE: 'true',
    };

    expect(createNestTypeOrmOptions(production).synchronize).toBe(false);
    expect(createNestTypeOrmOptions(packaged).synchronize).toBe(false);
  });

  it('never synchronizes the migration DataSource', () => {
    expect(
      createDataSourceOptions({
        NODE_ENV: 'development',
        TYPEORM_SYNCHRONIZE: 'true',
      }).synchronize,
    ).toBe(false);
  });
});
