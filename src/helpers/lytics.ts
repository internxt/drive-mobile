import analytics from '@segment/analytics-react-native'
import Branch from '@segment/analytics-react-native-branch'

export async function analyticsSetup() {
    const WRITEKEY = process.env.REACT_NATIVE_SEGMENT_API

    if (!WRITEKEY) {
        console.warn('No WRITEKEY Key provided')
    }
    await analytics.setup(WRITEKEY, {
        using: [Branch],
        recordScreenViews: true,
        trackAppLifecycleEvents: true
    });
}

export default analytics;