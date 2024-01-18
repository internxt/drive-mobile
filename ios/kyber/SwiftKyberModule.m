#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SwiftKyberModule, NSObject)
RCT_EXTERN_METHOD(performOperation:(NSString *)data resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
