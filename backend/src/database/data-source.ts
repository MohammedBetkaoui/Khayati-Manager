import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './database-options';

const dataSource = new DataSource(createDataSourceOptions());

export default dataSource;
