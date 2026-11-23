import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readEnvironment } from '../config/environment';
import { databaseOptions } from './options';

export default new DataSource(databaseOptions(readEnvironment()));
