import analytics from '@segment/analytics-react-native'
import { deviceStorage } from './deviceStorage';

export async function analyticsSetup() {
  const WRITEKEY = process.env.NODE_ENV !== 'production' ? process.env.REACT_NATIVE_SEGMENT_API_DEV : process.env.REACT_NATIVE_SEGMENT_API

  if (!WRITEKEY) {
    // This console log is neccesary to show devs if they are missing an env. variable
    // eslint-disable-next-line no-console
    console.warn('No WRITEKEY Key provided')
  }
  await analytics.setup(WRITEKEY, {
    recordScreenViews: true,
    trackAppLifecycleEvents: true
  });
}

export async function getLyticsUuid() {
  const xUser: any = await getLyticsData()

  return xUser.uuid
}

export async function getLyticsData() {
  const xUser: any = JSON.parse(await deviceStorage.getItem('xUser') || '{}')

  return xUser
}

export default analytics;