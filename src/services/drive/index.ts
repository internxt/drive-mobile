import { driveShareService } from './share';
import { driveUsageService } from './usage';
import { driveEvents } from './events';
import { driveRecentsService } from './recents';
import { driveLogger } from './logger';
import { driveLocalDB } from './localDB';

export default {
  logger: driveLogger,
  recents: driveRecentsService,
  share: driveShareService,
  usage: driveUsageService,
  localDB: driveLocalDB,
  events: driveEvents,
};
