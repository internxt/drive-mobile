#import <Foundation/Foundation.h>

#if defined(__has_include) && __has_include(<Analytics/SEGAnalytics.h>)
#import <Analytics/SEGIntegrationFactory.h>
#else
#import <Segment/Segment.h>
#endif


@interface SEGFirebaseIntegrationFactory : NSObject <SEGIntegrationFactory>

+ (instancetype)instance;

@end
