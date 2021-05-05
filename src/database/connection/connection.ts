import { Connection, createConnection } from 'typeorm/browser';
import { Photos } from '../models/photos';
import { Previews } from '../models/previews';

export function ConnectionDB(): Promise<Connection> {
  try {
    return createConnection({
      type: 'react-native',
      database: 'xPhotos',
      location: 'default',
      logging: ['error', 'query', 'schema'],
      synchronize: true,
      entities: [
        Photos,
        Previews
      ],
      migrationsRun: true,
      migrationsTransactionMode: 'all'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Error ConnectionDB:', error)
  }
}

export default ConnectionDB;