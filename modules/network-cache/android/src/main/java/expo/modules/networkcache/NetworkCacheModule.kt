package expo.modules.networkcache

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NetworkCacheModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NetworkCache")

    // No-op on Android — HSTS issues primarily affect iOS URLSession
    AsyncFunction("clearNetworkCache") {
      true
    }
  }
}
