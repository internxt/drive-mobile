import { driveShareService } from './share';
import { driveUsageService } from './usage';
import { driveEvents } from './events';
import { driveRecentsService } from './recents';
import { driveLogger } from './logger';
import { driveLocalDB } from './database';

export default {
  logger: driveLogger,
  recents: driveRecentsService,
  share: driveShareService,
  usage: driveUsageService,
  database: driveLocalDB,
  events: driveEvents,
};
