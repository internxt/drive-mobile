#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(InternxtAuthCredentialsModule, NSObject)
RCT_EXTERN_METHOD(setCredentials:(NSDictionary *)creds
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
RCT_EXTERN_METHOD(clearCredentials:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
@end
