/**
 * App WebView Detection Utility
 *
 * A comprehensive library to detect if the current page is running inside a native app WebView
 * and determine which app is hosting the content.
 */

const AppDetection = {
    /**
     * Main detection function that returns a detailed report
     * @returns {Object} Detection results with detailed information
     */
    detect: function() {
        const result = {
            isInWebView: false,
            isInAndroidWebView: false,
            isInIOSWebView: false,
            isInNativeBrowser: false,
            isAndroidCustomTab: false, // Indicates if running in Chrome Custom Tabs
            isSafariViewController: false, // Indicates if running in iOS SFSafariViewController
            isInIframe: false, // Indicates if the page is loaded inside an iframe
            detectedApp: null,
            detectionResult: null, // Will contain: "webview", "native-browser", "safari-view-controller", or "chrome-custom-tab"
            detectionMethods: [],
            details: {},
            confidence: 0, // 0-100 confidence score
            userAgent: navigator.userAgent
        };

        // Quick pre-check for Android WebView with "wv" flag
        // This is a guaranteed signal that we're in an Android WebView
        if (/Android.*wv/.test(navigator.userAgent)) {
            result.isInAndroidWebView = true;
            result.isInWebView = true;
            result.isInNativeBrowser = false; // Explicitly not a native browser
            result.detectionMethods.push('user_agent_android_wv_direct');
        }

        // Run all detection methods - order matters!
        // WebView detection first (highest reliability)
        this._detectByUserAgent(result);
        this._detectByBridgeObjects(result);

        // Custom Tabs detection before browser features detection
        // This is important because Custom Tabs share browser features with Chrome
        this._detectCustomTabs(result);

        // SFSafariViewController detection
        this._detectSFSafariViewController(result);

        // Iframe detection
        this._detectIframe(result);

        // Other detection methods
        this._detectByBrowserFeatures(result);
        this._detectByAppSpecificPatterns(result);
        this._detectByMetaTags(result);

        // Calculate overall confidence based on detection methods
        this._calculateConfidence(result);

        // Check if we've detected a native browser
        const isNativeBrowser = result.detectionMethods.includes('native_browser');

        // Establish detection precedence:
        // 1. WebView detection has highest precedence (most reliable)
        // 2. Special browser containers (CustomTabs, SFSafariViewController) have precedence over native browser
        // 3. Native browser detection is lowest precedence

        // WebView takes precedence over everything else
        if (result.isInAndroidWebView || result.isInIOSWebView) {
            result.isInWebView = true;
            result.isAndroidCustomTab = false;
            result.isSafariViewController = false;
            result.isInNativeBrowser = false;
        }
        // Custom Tabs takes precedence over native browser
        else if (result.isAndroidCustomTab) {
            result.isInWebView = false;
            result.isInNativeBrowser = false;
            result.isSafariViewController = false;
        }
        // SFSafariViewController takes precedence over native browser
        else if (result.isSafariViewController) {
            result.isInWebView = true;  // SFSafariViewController is considered a special WebView
            result.isInIOSWebView = true;
            result.isInNativeBrowser = false;
            result.isAndroidCustomTab = false;
        }
        // Native browser is lowest precedence
        else if (isNativeBrowser) {
            result.isInWebView = false;
            result.isInAndroidWebView = false;
            result.isInIOSWebView = false;
            result.isAndroidCustomTab = false;
            result.isSafariViewController = false;
        }
        // Last resort - use confidence score
        else {
            // If not specifically identified as any environment,
            // use confidence score as a fallback
            result.isInWebView = result.confidence > 70;
        }

        // Set the detectedBrowser property based on detection results
        if (result.isAndroidCustomTab) {
            result.detectionResult = "chrome-custom-tab";
        } else if (result.isSafariViewController) {
            result.detectionResult = "safari-view-controller";
        } else if (result.isInWebView) {
            result.detectionResult = "webview";
        } else {
            result.detectionResult = "native-browser";
        }

        return result;
    },

    /**
     * Detect WebView by analyzing User Agent string
     * @param {Object} result The result object to update
     * @private
     */
    _detectByUserAgent: function(result) {
        const ua = navigator.userAgent;
        const details = {};

        // Android WebView detection
        const isAndroid = /Android/i.test(ua);
        // Modern Android WebView has "wv" in the user agent
        // Match both standalone "wv" and " wv" (with a space)
        const isAndroidWebView = isAndroid && (/wv/.test(ua) || / wv/.test(ua));
        // Some Android WebViews might have a different pattern
        const isAndroidOldWebView = isAndroid && !/Chrome\/\d+/.test(ua) && /Version\/\d+\.\d+/.test(ua);
        // Additional check for WebView in Chrome-based browsers
        const isAndroidChromeWebView = isAndroid && /Chrome\/\d+/.test(ua) && / wv/.test(ua);

        // iOS WebView detection
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isIOSWebView = isIOS && !(/Safari/i.test(ua)) && (/AppleWebKit/i.test(ua));
        const isIOSUIWebView = isIOS && !(/CriOS|FxiOS|OPiOS|mercury/i.test(ua)) && !(/Safari/i.test(ua));
        const isIOSWKWebView = isIOS && /AppleWebKit/i.test(ua) && typeof window.webkit !== 'undefined';

        // Native browser app detection
        // For Android: Chrome, Firefox, Samsung Internet, etc.
        // For iOS: Safari, Chrome, Firefox, etc.
        const isAndroidNativeBrowser = isAndroid && !isAndroidWebView && !isAndroidOldWebView && !isAndroidChromeWebView &&
                                    (/Chrome|Firefox|SamsungBrowser|Edge|Opera|NAVER|Whale|DuckDuckGo/i.test(ua));

        const isIOSNativeBrowser = isIOS && !isIOSWebView && !isIOSUIWebView && !isIOSWKWebView &&
                                (/Safari|CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo/i.test(ua));

        const isNativeBrowser = isAndroidNativeBrowser || isIOSNativeBrowser;

        // Detect specific browser
        let browserName = null;
        if (isNativeBrowser) {
            if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
                browserName = 'Chrome Browser';
            } else if (/Firefox|FxiOS/.test(ua)) {
                browserName = 'Firefox Browser';
            } else if (/Safari/.test(ua) && !/Chrome|CriOS/.test(ua)) {
                browserName = 'Safari Browser';
            } else if (/Edg|EdgiOS/.test(ua)) {
                browserName = 'Edge Browser';
            } else if (/SamsungBrowser/.test(ua)) {
                browserName = 'Samsung Browser';
            } else if (/OPR|OPiOS|Opera/.test(ua)) {
                browserName = 'Opera Browser';
            }
        }

        // Generic WebView indications
        const hasWebViewIndication = /(WebView|wv)|(Version\/\d+\.\d+)/i.test(ua);

        details.isAndroid = isAndroid;
        details.isIOS = isIOS;
        details.isAndroidWebView = isAndroidWebView;
        details.isAndroidOldWebView = isAndroidOldWebView;
        details.isAndroidChromeWebView = isAndroidChromeWebView;
        details.isIOSWebView = isIOSWebView;
        details.isIOSUIWebView = isIOSUIWebView;
        details.isIOSWKWebView = isIOSWKWebView;
        details.isNativeBrowser = isNativeBrowser;
        details.browserName = browserName;

        // Special case for known Android WebView pattern
        if (isAndroid && ua.includes('wv')) {
            result.isInAndroidWebView = true;
            result.detectionMethods.push('user_agent_android_wv');
        }

        if (isAndroidWebView || isAndroidOldWebView || isAndroidChromeWebView) {
            result.isInAndroidWebView = true;
            result.detectionMethods.push('user_agent_android');
        }

        if (isIOSWebView || isIOSUIWebView || isIOSWKWebView) {
            result.isInIOSWebView = true;
            result.detectionMethods.push('user_agent_ios');
        }

        if (isNativeBrowser) {
            result.detectedApp = browserName ? browserName : 'Native Browser';
            result.detectionMethods.push('native_browser');
        }

        result.details.userAgent = details;
    },

    /**
     * Detect WebView by checking for bridge objects injected by native apps
     * @param {Object} result The result object to update
     * @private
     */
    _detectByBridgeObjects: function(result) {
        const details = {};

        // Android bridge objects
        const hasAndroidBridge = typeof window.AndroidInterface !== 'undefined' ||
                               typeof window.Android !== 'undefined' ||
                               typeof window.JSInterface !== 'undefined';

        // iOS bridge objects
        const hasIOSBridge = typeof window.webkit !== 'undefined' &&
                           typeof window.webkit.messageHandlers !== 'undefined';

        // React Native bridge
        const hasReactNativeBridge = typeof window.ReactNativeWebView !== 'undefined';

        // Flutter bridge
        const hasFlutterBridge = typeof window.flutter_inappwebview !== 'undefined';

        details.hasAndroidBridge = hasAndroidBridge;
        details.hasIOSBridge = hasIOSBridge;
        details.hasReactNativeBridge = hasReactNativeBridge;
        details.hasFlutterBridge = hasFlutterBridge;

        if (hasAndroidBridge) {
            result.isInAndroidWebView = true;
            result.detectionMethods.push('android_bridge_objects');
        }

        if (hasIOSBridge) {
            result.isInIOSWebView = true;
            result.detectionMethods.push('ios_bridge_objects');
        }

        if (hasReactNativeBridge) {
            result.detectionMethods.push('react_native_bridge');
            result.detectedApp = 'React Native App';
        }

        if (hasFlutterBridge) {
            result.detectionMethods.push('flutter_bridge');
            result.detectedApp = 'Flutter App';
        }

        result.details.bridgeObjects = details;
    },

    /**
     * Detect WebView by checking for limited or different browser features
     * @param {Object} result The result object to update
     * @private
     */
    _detectByBrowserFeatures: function(result) {
        const details = {};

        // Check for local storage
        try {
            localStorage.setItem('webviewTest', 'test');
            localStorage.removeItem('webviewTest');
            details.hasLocalStorage = true;
        } catch (e) {
            details.hasLocalStorage = false;
            result.detectionMethods.push('limited_storage');
        }

        // Check for service worker support (often limited in WebViews)
        details.hasServiceWorker = 'serviceWorker' in navigator;

        // Check for cookies
        details.hasCookies = navigator.cookieEnabled;

        // Check for other browser APIs often missing in WebViews
        details.hasDeviceMemory = 'deviceMemory' in navigator;
        details.hasBatteryAPI = 'getBattery' in navigator;
        details.hasShareAPI = 'share' in navigator;
        details.hasNotificationAPI = 'Notification' in window;
        details.hasGeolocation = 'geolocation' in navigator;

        // Check if opener exists (often null in WebViews)
        details.hasOpener = window.opener !== null;

        // Push notifications permission state
        if ('Notification' in window) {
            details.notificationPermission = Notification.permission;
        }

        // If several features are missing that are common in browsers
        const missingFeatureCount = [
            !details.hasServiceWorker,
            !details.hasDeviceMemory,
            !details.hasBatteryAPI,
            !details.hasShareAPI,
            !details.hasNotificationAPI,
            !details.hasOpener
        ].filter(Boolean).length;

        if (missingFeatureCount >= 3) {
            result.detectionMethods.push('missing_browser_features');

            // Android WebView often has missing browser features
            // Only set WebView flag if not identified as a native browser
            const isNativeBrowser = result.detectionMethods.includes('native_browser');
            if (result.details.userAgent && result.details.userAgent.isAndroid && !isNativeBrowser) {
                result.isInAndroidWebView = true;
            }
        }

        result.details.browserFeatures = details;
    },

    /**
     * Detect specific apps by their unique patterns
     * @param {Object} result The result object to update
     * @private
     */
    _detectByAppSpecificPatterns: function(result) {
        const ua = navigator.userAgent;
        const details = {};

        // Social media apps
        const isFacebook = /FBAV|FBAN|FBIOS|FB_IAB/i.test(ua);
        const isTwitter = /Twitter/i.test(ua);
        const isInstagram = /Instagram/i.test(ua);
        const isLinkedIn = /LinkedIn/i.test(ua);
        const isPinterest = /Pinterest/i.test(ua);
        const isSnapchat = /Snapchat/i.test(ua);

        // Messaging apps
        const isWhatsApp = /WhatsApp/i.test(ua);
        const isWeChat = /MicroMessenger/i.test(ua);
        const isLine = /Line\//i.test(ua);
        const isTelegram = /TelegramBot|Telegram/i.test(ua);

        // Browser apps with WebView
        const isUCBrowser = /UCBrowser/i.test(ua);
        const isOperaMini = /Opera Mini/i.test(ua);
        const isFirefoxFocus = /Focus/i.test(ua) && /Firefox/i.test(ua);

        // Other common apps
        const isCrossWalk = /Crosswalk/i.test(ua);
        const isGoogleApp = /GSA\//i.test(ua);
        const isAmazonApp = /AmazonWebAppPlatform/i.test(ua);

        details.isFacebook = isFacebook;
        details.isTwitter = isTwitter;
        details.isInstagram = isInstagram;
        details.isLinkedIn = isLinkedIn;
        details.isPinterest = isPinterest;
        details.isSnapchat = isSnapchat;
        details.isWhatsApp = isWhatsApp;
        details.isWeChat = isWeChat;
        details.isLine = isLine;
        details.isTelegram = isTelegram;
        details.isUCBrowser = isUCBrowser;
        details.isOperaMini = isOperaMini;
        details.isFirefoxFocus = isFirefoxFocus;
        details.isCrossWalk = isCrossWalk;
        details.isGoogleApp = isGoogleApp;
        details.isAmazonApp = isAmazonApp;

        // Determine the detected app
        if (isFacebook) {
            result.detectedApp = 'Facebook';
            result.detectionMethods.push('facebook_app');
        } else if (isTwitter) {
            result.detectedApp = 'Twitter';
            result.detectionMethods.push('twitter_app');
        } else if (isInstagram) {
            result.detectedApp = 'Instagram';
            result.detectionMethods.push('instagram_app');
        } else if (isLinkedIn) {
            result.detectedApp = 'LinkedIn';
            result.detectionMethods.push('linkedin_app');
        } else if (isWhatsApp) {
            result.detectedApp = 'WhatsApp';
            result.detectionMethods.push('whatsapp_app');
        } else if (isWeChat) {
            result.detectedApp = 'WeChat';
            result.detectionMethods.push('wechat_app');
        } else if (isUCBrowser) {
            result.detectedApp = 'UC Browser';
            result.detectionMethods.push('uc_browser');
        } else if (isOperaMini) {
            result.detectedApp = 'Opera Mini';
            result.detectionMethods.push('opera_mini');
        } else if (isCrossWalk) {
            result.detectedApp = 'Crosswalk WebView';
            result.detectionMethods.push('crosswalk');
        } else if (isGoogleApp) {
            result.detectedApp = 'Google App';
            result.detectionMethods.push('google_app');
        }

        result.details.appSpecificPatterns = details;
    },

    /**
     * Look for meta tags that might indicate WebView context
     * @param {Object} result The result object to update
     * @private
     */
    _detectByMetaTags: function(result) {
        const details = {};

        // Check for app-specific meta tags
        const appMetaTags = document.querySelectorAll('meta[name^="app-"]');
        details.hasAppMetaTags = appMetaTags.length > 0;

        if (details.hasAppMetaTags) {
            result.detectionMethods.push('app_meta_tags');
        }

        // Check for viewport settings that might indicate WebView
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            const content = viewportMeta.getAttribute('content');
            details.viewportContent = content;

            // WebViews often have specific viewport settings
            if (content && content.includes('user-scalable=no') && content.includes('width=device-width')) {
                result.detectionMethods.push('viewport_settings');
            }
        }

        result.details.metaTags = details;
    },

    /**
     * Detect if the page is running inside Chrome Custom Tabs
     * @param {Object} result The result object to update
     * @private
     */
    _detectCustomTabs: function(result) {
        const details = {};
        const referrer = document.referrer || '';
        // Log the referrer for debugging
        console.log('Chrome Custom Tabs Detection - Referrer:', JSON.stringify({
            referrer: referrer,
            length: referrer.length,
            isEmpty: referrer === '',
            historyLength: window.history.length
        }));
        const ua = navigator.userAgent;

        // Only applicable to Android Chrome
        const isAndroidChrome = /Android/.test(ua) && /Chrome/.test(ua) && !/wv/.test(ua);

        if (!isAndroidChrome) {
            result.details.customTabs = { isCustomTab: false, reason: 'Not Android Chrome' };
            return;
        }

        // Primary indicators:
        // 1. android-app:// referrer (the most reliable indicator)
        const hasAndroidAppReferrer = /^android-app:\/\//.test(referrer);
        // 2. History length of exactly 1 (strong indicator from real-world testing)
        const hasExactlyOneHistoryEntry = window.history && window.history.length === 1;

        // If either primary indicator is present, immediately identify as Custom Tab
        if (hasAndroidAppReferrer || hasExactlyOneHistoryEntry) {
            // Set an initial high score for these reliable indicators
            details.hasAndroidAppReferrer = hasAndroidAppReferrer;
            details.hasExactlyOneHistoryEntry = hasExactlyOneHistoryEntry;

            // For android-app referrer, extract package name
            if (hasAndroidAppReferrer) {
                const packageMatch = referrer.match(/^android-app:\/\/([^\/]+)/);
                if (packageMatch) {
                    details.launchingApp = packageMatch[1];
                }
            }
        }

        // Secondary indicators that can be present in regular Chrome as well
        const hasNoOpener = window.opener === null;
        const hasMinimalHistory = window.history.length <= 2;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        // Check navigation timing - Custom Tabs often have faster navigation than regular browser
        const navTiming = window.performance && window.performance.timing;
        const hasLowNavTime = navTiming ?
            (navTiming.domContentLoadedEventEnd - navTiming.navigationStart) < 1000 : false;

        // Check if this page was loaded without user navigation
        const isFirstPage = window.history.length === 1;
        const hasEmptyReferrer = !referrer || referrer === '';
        const isLikelyDirectOpen = isFirstPage && hasEmptyReferrer;

        // Check if page is loaded directly on a non-standard port
        const isNonStandardPort = window.location.port && window.location.port !== '443' && window.location.port !== '80';

        // Detection scoring with specific criteria for Chrome Custom Tabs
        let customTabScore = 0;

        // Strong indicator - direct android-app referrer
        if (hasAndroidAppReferrer) {
            customTabScore += 100; // Guaranteed signal
        }

        // Strong indicator - history length of exactly 1
        if (hasExactlyOneHistoryEntry) {
            customTabScore += 50; // Highly reliable based on real-world testing
        }

        // Special case: The specific pattern observed in Custom Tabs testing
        // This combination appears consistently in Chrome Custom Tabs on Android
        if (isAndroidChrome && hasNoOpener && hasMinimalHistory && isLikelyDirectOpen &&
            isNonStandardPort && hasLowNavTime) {
            // If we see this exact pattern with all indicators present,
            // it's very likely to be a Custom Tab
            customTabScore += 50; // Give this specific combination a high score
            details.hasCustomTabSignaturePattern = true;
        } else {
            // Apply individual scores if not matching the signature pattern
            if (hasNoOpener) {
                customTabScore += 5;
                details.hasNoOpener = true;
            }

            if (hasMinimalHistory) {
                customTabScore += 5;
                details.hasMinimalHistory = true;
            }

            if (isLikelyDirectOpen) {
                customTabScore += 10;
                details.isLikelyDirectOpen = true;
            }

            if (isNonStandardPort) {
                customTabScore += 5;
                details.isNonStandardPort = true;
            }

            if (hasLowNavTime) {
                customTabScore += 5;
                details.hasLowNavTime = true;
            }
        }

        if (isStandalone) {
            customTabScore += 5; // PWAs can be standalone too
            details.isStandalone = true;
        }

        // Check for hash fragment - often used with Custom Tabs for communication
        const hasSpecialHash = window.location.hash && /^#(oauth|token|auth|app|custom)/.test(window.location.hash);
        if (hasSpecialHash) {
            customTabScore += 20;
            details.hasSpecialHash = true;
        }

        // Additional check for mobile context
        const isMobileContext = /Mobile/.test(ua) && !/Tablet|iPad/.test(ua);
        if (!isMobileContext) {
            customTabScore -= 30; // Penalize desktop contexts
            details.penalizedDesktopContext = true;
        }

        // Lower the threshold to 45 to match the signature pattern we've observed in testing
        const isCustomTab = customTabScore >= 45;

        details.isCustomTab = isCustomTab;
        details.customTabScore = customTabScore;
        details.referrer = referrer;

        result.details.customTabs = details;

        if (isCustomTab) {
            result.isAndroidCustomTab = true;
            result.detectionMethods.push('chrome_custom_tabs');

            // Custom Tabs are NOT WebViews
            if (result.isInWebView) {
                // If already detected as WebView, this takes precedence
                // as WebView detection is more reliable
                result.isAndroidCustomTab = false;
            } else {
                // Override browser detection since Custom Tabs are easily
                // misidentified as native browser
                result.isInNativeBrowser = false;

                // Custom Tabs are a browser feature, not a WebView
                result.isInWebView = false;
                result.isInAndroidWebView = false;

                if (details.launchingApp) {
                    result.detectedApp = `Custom Tab (from ${details.launchingApp})`;
                } else {
                    result.detectedApp = 'Chrome Custom Tab';
                }
            }
        }
    },

    /**
     * Detect if running in SFSafariViewController
     * This is challenging as SFSafariViewController is designed to be identical to Safari
     * @param {Object} result The result object to update
     * @private
     */
    _detectSFSafariViewController: function(result) {
        const ua = navigator.userAgent;
        const details = {};

        // Enhanced debug info for SFSafariViewController detection
        console.log('SFSafariViewController Detection - Debug info:', JSON.stringify({
            historyLength: window.history.length,
            hasOpener: window.opener !== null,
            referrer: document.referrer || '',
            innerHeight: window.innerHeight,
            screenHeight: window.screen.height,
            heightRatio: window.innerHeight / window.screen.height,
            navigationType: window.performance && window.performance.navigation ?
                window.performance.navigation.type : 'unknown',
            hasSafariObject: typeof window.safari !== 'undefined',
            urlParams: window.location.search,
            hostname: window.location.hostname
        }));

        // Store history length in details for reporting
        details.historyLength = window.history.length;

        // Only run on iOS
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        if (!isIOS) {
            result.isSafariViewController = false;
            return;
        }

        // Must have Safari in UA (unlike WKWebView)
        const hasSafari = /Safari/i.test(ua);
        const hasAppleWebKit = /AppleWebKit/i.test(ua);

        if (!hasSafari || !hasAppleWebKit) {
            result.isSafariViewController = false;
            return;
        }

        // Check iOS version - newer iOS versions have different behavior
        const iosVersionMatch = ua.match(/OS (\d+)_(\d+)/);
        const iosVersion = iosVersionMatch ?
            parseFloat(iosVersionMatch[1] + '.' + iosVersionMatch[2]) : 0;
        details.iosVersion = iosVersion;

        // Flag for modern iOS (14+) which has different behavior
        const isModernIOS = iosVersion >= 14;
        details.isModernIOS = isModernIOS;

        // Detection score
        let sfvcScore = 0;

        // 1. Check for missing webkit message handlers (SFSafariViewController doesn't have them)
        const hasWebKitBridge = typeof window.webkit !== 'undefined' &&
                               typeof window.webkit.messageHandlers !== 'undefined';
        if (!hasWebKitBridge && hasSafari) {
            sfvcScore += 10; // Reduced from 20 - could be either Safari or SFSafariViewController
            details.noWebKitBridge = true;
        }

        // 2. Check window.opener (usually null in SFSafariViewController)
        if (window.opener === null) {
            sfvcScore += 5; // Reduced from 15 - most mobile browsers have null opener
            details.noOpener = true;
        }

        // 3. Check navigation type (SFSafariViewController usually has type 0 - direct navigation)
        const navigationType = window.performance &&
                              window.performance.navigation &&
                              window.performance.navigation.type;
        const isInitialLoad = navigationType === 0;
        details.navigationType = navigationType;
        details.isInitialLoad = isInitialLoad;

        // 4. Check minimal history (often just 1 in SFSafariViewController)
        // This is a strong indicator that distinguishes SFSafariViewController
        // but needs to be combined with navigation type for accuracy
        if (window.history.length === 1) {
            if (isInitialLoad) {
                // History=1 with direct navigation is very common in SFSafariViewController
                sfvcScore += 25;
                details.hasMinimalHistoryWithDirectNav = true;
            } else {
                // History=1 but not direct navigation is less conclusive
                sfvcScore += 15;
                details.minimalHistory = true;
            }
        } else if (window.history.length > 3) {
            // Longer history is very uncommon in SFSafariViewController
            sfvcScore -= 20;
            details.hasLongHistory = true;
        }

        // 5. Check for empty/missing referrer when launched from app
        if (!document.referrer || document.referrer === '') {
            sfvcScore += 5; // Reduced from 15 - many browsers have empty referrer
            details.noReferrer = true;
        }

        // 6. Check for standalone/fullscreen mode (should be false)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
        if (!isStandalone && !isFullscreen) {
            sfvcScore += 5; // Reduced from 10 - this is common for mobile browsers
            details.notStandaloneOrFullscreen = true;
        }

        // 7. Check window height (SFSafariViewController has custom toolbar)
        const heightRatio = window.innerHeight / window.screen.height;
        details.heightRatio = heightRatio;

        // More specific height ratio analysis - adjust for modern iOS
        if (isModernIOS) {
            // Modern iOS has more varied height ratios
            if (heightRatio <= 0.8) {
                // Wider range for modern iOS SFSafariViewController
                sfvcScore += 35;
                details.hasModernSFVCHeightRatio = true;
            } else {
                // Higher ratios still suggest Safari, but with less penalty
                sfvcScore -= 5; // Reduced penalty for modern iOS
                details.hasFullSafariHeightRatio = true;
            }
        } else {
            // Original logic for older iOS versions
            if (heightRatio > 0.8 && heightRatio < 0.85) {
                // This range is very common for SFSafariViewController
                sfvcScore += 15;
                details.hasSFVCHeightRatio = true;
            } else if (heightRatio > 0.9) {
                // Higher ratios are more common in regular Safari
                sfvcScore -= 10;
                details.hasFullSafariHeightRatio = true;
            } else if (heightRatio < 0.85) {
                // General reduced height check
                sfvcScore += 5;
                details.hasReducedHeight = true;
            }
        }

        // 8. Check for advanced Safari features
        // SFSafariViewController will typically NOT have these features
        if (typeof window.safari !== 'undefined' &&
            (typeof window.safari.extension !== 'undefined' ||
             typeof window.safari.pushNotification !== 'undefined')) {
            // These are strong indicators of regular Safari, but not conclusive
            // Reduced penalty as iOS 14+ may expose some of these in SFSafariViewController
            sfvcScore -= 15; // Reduced from 25
            details.hasSafariSpecificAPIs = true;
        }

        // 9. Check for Apple Pay support
        // NOTE: Modern iOS (14+) sometimes exposes ApplePay in SFSafariViewController too
        if ('ApplePaySession' in window) {
            // Apply a much smaller penalty as this is no longer a reliable differentiator
            sfvcScore -= 5; // Reduced from 15
            details.hasApplePay = true;
        }

        // 10. Check if Safari's internal debug features are available
        try {
            // This property exists in Safari but not in SFSafariViewController
            if (window.scrollY !== undefined && 'webkitConvertPointFromNodeToPage' in window) {
                // Apply a smaller penalty as newer iOS may expose this
                sfvcScore -= 5; // Reduced from 10
                details.hasSafariDebugFeatures = true;
            }
        } catch(e) {}

        // Special case: The specific pattern observed in SFSafariViewController testing
        // The strongest combination of signals
        // Updated to catch a wider range of height ratios based on real-world testing
        if (window.history.length === 1 && isInitialLoad &&
            (!document.referrer || document.referrer === '')) {

            if (heightRatio > 0.7 && heightRatio < 0.85) {
                // This height ratio range covers most SFSafariViewController instances
                sfvcScore += 35; // Increased boost for this signature
                details.hasSafariViewControllerSignature = true;
            } else {
                // Still likely SFSafariViewController even with different height ratio
                // Height ratio can vary depending on device orientation and iOS version
                sfvcScore += 25;
                details.hasPartialSafariViewControllerSignature = true;
            }
        }

        // Find a threshold that works based on iOS version
        // Modern iOS (14+) has more overlapping features between Safari and SFSafariViewController
        // so we need to adjust our threshold
        let threshold = 50; // Default threshold

        if (isModernIOS) {
            // Use a lower threshold for modern iOS to account for feature overlap
            threshold = 40;

            // Additional boost for the core signature pattern on modern iOS
            // History=1 + direct navigation + empty referrer is very reliable
            if (window.history.length === 1 && isInitialLoad &&
                (!document.referrer || document.referrer === '')) {
                // This is very likely SFSafariViewController on modern iOS
                // Provide a significant boost to overcome the penalties from shared features
                sfvcScore += 10;
                details.modernIOSSignatureBoost = true;
            }
        }

        details.detectionThreshold = threshold;
        const isSFSafariVC = sfvcScore >= threshold;

        details.sfvcScore = sfvcScore;
        result.details.safariViewController = details;

        if (isSFSafariVC) {
            result.isSafariViewController = true;
            result.detectionMethods.push('sfsafariviewcontroller');

            // Check if already detected as Safari browser
            if (result.isInNativeBrowser && result.detectedApp === 'Safari Browser') {
                // Note: We still set these flags, but the conflict resolution logic
                // in the detect() method may override this if it determines it's actually Safari
                result.isInNativeBrowser = false;
                result.detectedApp = 'SFSafariViewController';
                result.isInIOSWebView = true;
                result.isInWebView = true;
            }
        }
    },

    /**
     * Detects if the current page is loaded in an iframe
     * @param {Object} result The result object to update
     * @private
     */
    _detectIframe: function(result) {
        const details = {};

        // Method 1: Check window.self vs window.top
        // This is the most reliable method but will fail with cross-origin iframes due to security restrictions
        try {
            details.windowSelfNotTop = window.self !== window.top;
            if (details.windowSelfNotTop) {
                result.isInIframe = true;
                result.detectionMethods.push('iframe_self_top_check');
            }
        } catch (e) {
            // If we get a security error, we're definitely in a cross-origin iframe
            result.isInIframe = true;
            details.securityError = true;
            details.isCrossDomain = true;
            result.detectionMethods.push('iframe_security_error');
        }

        // Method 2: Check parent and location properties
        if (!result.isInIframe) {
            details.windowParentNotSelf = window.parent !== window;
            if (details.windowParentNotSelf) {
                result.isInIframe = true;
                result.detectionMethods.push('iframe_parent_check');
            }
        }

        // Method 3: Check document.referrer (can provide parent URL in some cases)
        if (document.referrer) {
            try {
                const referrerUrl = new URL(document.referrer);
                const currentUrl = new URL(window.location.href);

                details.parentUrl = document.referrer;
                details.parentOrigin = referrerUrl.origin;
                details.isCrossDomain = referrerUrl.origin !== currentUrl.origin;

                // If the referrer's host is different from the current host, it's likely in an iframe
                if (referrerUrl.host !== currentUrl.host && !result.isInIframe) {
                    result.isInIframe = true;
                    result.detectionMethods.push('iframe_referrer_analysis');
                }
            } catch (e) {
                // Invalid URL, can't analyze
                details.invalidReferrerUrl = true;
            }
        }

        // Method 4: Analyze window dimensions
        // Iframes typically have constrained dimensions compared to the full browser window
        if (!result.isInIframe) {
            // This is a heuristic approach - if window inner dimensions are significantly smaller than screen dimensions
            const screenWidthRatio = window.innerWidth / screen.width;
            const screenHeightRatio = window.innerHeight / screen.height;

            details.dimensionInfo = {
                widthRatio: screenWidthRatio,
                heightRatio: screenHeightRatio
            };

            // If window dimensions are less than 80% of screen dimensions, it might be in an iframe
            if (screenWidthRatio < 0.8 && screenHeightRatio < 0.8) {
                // This is a weak signal, so we'll only use it if we have no other evidence
                result.isInIframe = true;
                result.detectionMethods.push('iframe_dimension_analysis');
            }
        }

        result.details.iframe = details;
    },

    _calculateConfidence: function(result) {
        let confidence = 0;

        // Weight different detection methods
        const weightMap = {
            // Guaranteed signals (100% confidence)
            'user_agent_android_wv_direct': 100, // Highest confidence - direct detection
            'user_agent_android_wv': 100, // Direct 'wv' detection is a guaranteed signal
            'android_bridge_objects': 100,
            'ios_bridge_objects': 100,
            'react_native_bridge': 100,
            'flutter_bridge': 100,

            // Very strong signals (85-90% confidence)
            'user_agent_android': 85, // Increased from 50 as this is a strong signal
            'user_agent_ios': 85, // Increased from 50 to match Android
            'facebook_app': 90,
            'twitter_app': 90,
            'instagram_app': 90,
            'linkedin_app': 90,
            'whatsapp_app': 90,
            'wechat_app': 90,

            // Strong signals (60-75% confidence) - Reduced Chrome Custom Tabs confidence
            'chrome_custom_tabs': 60, // Reduced from 80 to prevent false positives
            'sfsafariviewcontroller': 60, // Lower confidence due to detection difficulty
            'crosswalk': 80,
            'google_app': 80,
            'uc_browser': 70,
            'opera_mini': 70,

            // Medium signals (40-60% confidence)
            'app_meta_tags': 60,
            'missing_browser_features': 35, // Reduced slightly
            'limited_storage': 30,

            // Iframe detection methods (70-100% confidence)
            'iframe_self_top_check': 100, // Very reliable
            'iframe_security_error': 100, // Definitely in a cross-origin iframe
            'iframe_parent_check': 90, // Highly reliable
            'iframe_referrer_analysis': 80, // Fairly reliable
            'iframe_dimension_analysis': 40, // Less reliable, can have false positives

            // Weak signals (20-30% confidence)
            'viewport_settings': 20
        };

        // Calculate confidence based on detected methods
        if (result.detectionMethods.length > 0) {
            let totalWeight = 0;
            let weightedSum = 0;

            result.detectionMethods.forEach(method => {
                const weight = weightMap[method] || 50; // Default weight is 50
                totalWeight += weight;
                weightedSum += weight;
            });

            confidence = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

            // Cap at 100
            confidence = Math.min(confidence, 100);
        }

        result.confidence = Math.round(confidence);
    },

    /**
     * Sends the detection result to a server endpoint
     * @param {string} endpoint URL to send the data to
     * @returns {Promise} Promise resolving to the server response
     */
    reportToServer: function(endpoint) {
        const result = this.detect();

        return fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                detection: result,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                referrer: document.referrer || null,
                screenSize: {
                    width: window.screen.width,
                    height: window.screen.height
                },
                devicePixelRatio: window.devicePixelRatio || 1
            })
        })
        .then(response => response.json())
        .catch(error => {
            console.error('Error reporting WebView detection:', error);
            return { error: error.message };
        });
    },

    /**
     * Fetches from the local delay endpoint with the specified milliseconds
     * @param {number} milliseconds - The number of milliseconds to delay the response
     * @param {Object} options - Optional fetch options
     * @returns {Promise} - Promise that resolves after the specified delay
     */
    fetchDelay: function(milliseconds, options = {}) {
        // Validate the milliseconds parameter
        const delay = parseInt(milliseconds, 10);
        if (isNaN(delay) || delay < 0) {
            return Promise.reject(new Error('Invalid delay value. Must be a positive number.'));
        }

        // Build the URL using the local server endpoint
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/delay/${delay}`;

        // Perform the fetch with the provided options
        return fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Delay API responded with status: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error('Error in delay fetch:', error);
                throw error;
            });
    },

    /**
     * Performs a synchronous delay request using XMLHttpRequest
     * @param {number} milliseconds - The number of milliseconds to delay the response
     * @returns {Object} - The parsed JSON response
     * @throws {Error} - If the request fails
     */
    fetchDelaySync: function(milliseconds) {
        // Validate the milliseconds parameter
        const delay = parseInt(milliseconds, 10);
        if (isNaN(delay) || delay < 0) {
            throw new Error('Invalid delay value. Must be a positive number.');
        }

        // Build the URL using the local server endpoint
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/delay/${delay}`;

        // Create and configure the XHR
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false); // false makes it synchronous

        try {
            xhr.send();

            if (xhr.status >= 200 && xhr.status < 300) {
                return JSON.parse(xhr.responseText);
            } else {
                throw new Error(`Delay API responded with status: ${xhr.status}`);
            }
        } catch (error) {
            console.error('Error in synchronous delay fetch:', error);
            throw error;
        }
    },

    /**
     * Adds a custom "app-switch" HTTP header for server-side detection
     * This must be called before any AJAX requests are made
     */
    setupServerDetection: function() {
        const originalFetch = window.fetch;
        const originalXHR = window.XMLHttpRequest.prototype.open;
        const result = this.detect();

        // Override fetch to add headers
        window.fetch = function(url, options = {}) {
            if (!options.headers) {
                options.headers = {};
            }

            // Add custom headers for server detection
            options.headers['X-App-WebView'] = result.isInWebView;
            options.headers['X-Android-CustomTab'] = result.isAndroidCustomTab;
            options.headers['X-Safari-ViewController'] = result.isSafariViewController;
            options.headers['X-In-Iframe'] = result.isInIframe;
            if (result.detectedApp) {
                options.headers['X-App-Name'] = result.detectedApp;
            }
            if (result.detectedBrowser) {
                options.headers['X-Detected-Browser'] = result.detectedBrowser;
            }

            // Determine platform
            let platform = 'Browser';
            if (result.isInAndroidWebView || result.isAndroidCustomTab) {
                platform = 'Android';
            } else if (result.isInIOSWebView || result.isSafariViewController) {
                platform = 'iOS';
            } else if (result.details.userAgent && result.details.userAgent.isAndroid) {
                platform = 'Android';
            } else if (result.details.userAgent && result.details.userAgent.isIOS) {
                platform = 'iOS';
            }

            options.headers['X-App-Platform'] = platform;

            return originalFetch.call(this, url, options);
        };

        // Override XMLHttpRequest to add headers
        window.XMLHttpRequest.prototype.open = function() {
            const xhr = this;
            const args = arguments;
            const method = args[0];
            const url = args[1];

            originalXHR.apply(xhr, args);

            xhr.addEventListener('readystatechange', function() {
                if (xhr.readyState === 1) { // OPENED
                    xhr.setRequestHeader('X-App-WebView', result.isInWebView);
                    xhr.setRequestHeader('X-Android-CustomTab', result.isAndroidCustomTab);
                    xhr.setRequestHeader('X-Safari-ViewController', result.isSafariViewController);
                    xhr.setRequestHeader('X-In-Iframe', result.isInIframe);
                    if (result.detectedApp) {
                        xhr.setRequestHeader('X-App-Name', result.detectedApp);
                    }
                    if (result.detectedBrowser) {
                        xhr.setRequestHeader('X-Detected-Browser', result.detectedBrowser);
                    }

                    // Determine platform
                    let platform = 'Browser';
                    if (result.isInAndroidWebView || result.isAndroidCustomTab) {
                        platform = 'Android';
                    } else if (result.isInIOSWebView || result.isSafariViewController) {
                        platform = 'iOS';
                    } else if (result.details.userAgent && result.details.userAgent.isAndroid) {
                        platform = 'Android';
                    } else if (result.details.userAgent && result.details.userAgent.isIOS) {
                        platform = 'iOS';
                    }

                    xhr.setRequestHeader('X-App-Platform', platform);
                }
            });
        };
    }
};

// Export for CommonJS/ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppDetection;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return AppDetection; });
} else {
    window.AppDetection = AppDetection;
}