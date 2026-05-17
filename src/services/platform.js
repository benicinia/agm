// Platform detection service
export const Platform = {
  isAndroid: false,
  isIOS: false,
  isCapacitor: false,
  isWeb: true,
  isMobile: false,
  isDesktop: true
}

export function detectPlatform() {
  // Check if running in Capacitor
  const isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNative
  
  // Check user agent for Android
  const ua = navigator.userAgent.toLowerCase()
  const isAndroidUA = ua.includes('android')
  const isIOSUA = ua.includes('iphone') || ua.includes('ipad')
  
  Platform.isCapacitor = isCapacitor
  Platform.isAndroid = isCapacitor && isAndroidUA
  Platform.isIOS = isCapacitor && isIOSUA
  Platform.isMobile = Platform.isAndroid || Platform.isIOS || /mobile/i.test(ua)
  Platform.isDesktop = !Platform.isMobile && !Platform.isCapacitor
  Platform.isWeb = !Platform.isCapacitor
  
  console.log('Platform detection:', {
    isAndroid: Platform.isAndroid,
    isCapacitor: Platform.isCapacitor,
    isWeb: Platform.isWeb,
    isDesktop: Platform.isDesktop
  })
  
  return Platform
}

// Export for easy access
export const platform = Platform