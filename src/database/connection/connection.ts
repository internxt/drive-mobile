import { Connection, createConnection } from 'typeorm/browser';
import { LocalPhotos } from '../models/localPhotos';
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
        Previews,
        LocalPhotos
      ],
      migrationsRun: true
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Error ConnectionDB:', error)
  }
}

export default ConnectionDB;