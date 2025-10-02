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
            detectedApp: null,
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

        // Run all detection methods
        this._detectByUserAgent(result);
        this._detectByBridgeObjects(result);
        this._detectByBrowserFeatures(result);
        this._detectByAppSpecificPatterns(result);
        this._detectByMetaTags(result);

        // Calculate overall confidence based on detection methods
        this._calculateConfidence(result);

        // Native browser detection should take precedence
        // If we have a native browser, we're NOT in a WebView
        if (result.isInNativeBrowser) {
            result.isInWebView = false;
            result.isInAndroidWebView = false;
            result.isInIOSWebView = false;
        } else {
            // Otherwise, determine WebView status
            // If platform-specific WebView flags are set, mark as WebView
            result.isInWebView = result.isInAndroidWebView || result.isInIOSWebView;

            // If not specifically identified as a WebView by platform checks,
            // use confidence score as a fallback, but only if not in a native browser
            if (!result.isInWebView) {
                result.isInWebView = result.confidence > 70;
            }
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
        const isAndroidNativeBrowser = isAndroid && !isAndroidWebView && !isAndroidOldWebView &&
                                    (/Chrome|Firefox|SamsungBrowser|Edge|Opera|NAVER|Whale|DuckDuckGo/i.test(ua));

        const isIOSNativeBrowser = isIOS && !isIOSWebView && !isIOSUIWebView && !isIOSWKWebView &&
                                (/Safari|CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo/i.test(ua));

        const isNativeBrowser = isAndroidNativeBrowser || isIOSNativeBrowser;

        // Detect specific browser
        let browserName = null;
        if (isNativeBrowser) {
            if (/Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && !/Edg/.test(ua)) {
                browserName = 'Chrome';
            } else if (/Firefox|FxiOS/.test(ua)) {
                browserName = 'Firefox';
            } else if (/Safari/.test(ua) && /Apple Computer/.test(navigator.vendor) && !/Chrome|CriOS/.test(ua)) {
                browserName = 'Safari';
            } else if (/Edg|EdgiOS/.test(ua)) {
                browserName = 'Edge';
            } else if (/SamsungBrowser/.test(ua)) {
                browserName = 'Samsung Browser';
            } else if (/OPR|OPiOS|Opera/.test(ua)) {
                browserName = 'Opera';
            } else if (/DuckDuckGo/.test(ua)) {
                browserName = 'DuckDuckGo';
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
            result.isInNativeBrowser = true;
            result.detectedApp = browserName ? browserName + ' Browser' : 'Native Browser';
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
            // Only set WebView flag if not already identified as a native browser
            if (result.details.userAgent && result.details.userAgent.isAndroid && !result.isInNativeBrowser) {
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
     * Calculate confidence score based on detection methods
     * @param {Object} result The result object to update
     * @private
     */
    _calculateConfidence: function(result) {
        let confidence = 0;

        // Weight different detection methods
        const weightMap = {
            'user_agent_android_wv_direct': 100, // Highest confidence - direct detection
            'user_agent_android_wv': 100, // Direct 'wv' detection is a guaranteed signal
            'user_agent_android': 85, // Increased from 50 as this is a strong signal
            'user_agent_ios': 85, // Increased from 50 to match Android
            'android_bridge_objects': 100,
            'ios_bridge_objects': 100,
            'react_native_bridge': 100,
            'flutter_bridge': 100,
            'limited_storage': 30,
            'missing_browser_features': 40,
            'facebook_app': 90,
            'twitter_app': 90,
            'instagram_app': 90,
            'linkedin_app': 90,
            'whatsapp_app': 90,
            'wechat_app': 90,
            'uc_browser': 70,
            'opera_mini': 70,
            'crosswalk': 80,
            'google_app': 80,
            'app_meta_tags': 60,
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
            if (result.detectedApp) {
                options.headers['X-App-Name'] = result.detectedApp;
            }

            // Determine platform
            let platform = 'Browser';
            if (result.isInAndroidWebView) {
                platform = 'Android';
            } else if (result.isInIOSWebView) {
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
                    if (result.detectedApp) {
                        xhr.setRequestHeader('X-App-Name', result.detectedApp);
                    }

                    // Determine platform
                    let platform = 'Browser';
                    if (result.isInAndroidWebView) {
                        platform = 'Android';
                    } else if (result.isInIOSWebView) {
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