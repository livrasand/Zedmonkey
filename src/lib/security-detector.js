/**
 * Advanced Security Detector for Zedmonkey
 * Detects CSP, security headers, and other injection obstacles
 */

class SecurityDetector {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 300000; // 5 minutes
    }

    /**
     * Comprehensive security analysis of a page
     * @param {number} tabId - Chrome tab ID
     * @param {number} frameId - Frame ID (0 for main frame)
     * @returns {Promise<Object>} Security analysis results
     */
    async analyzePageSecurity(tabId, frameId = 0) {
        const cacheKey = `${tabId}-${frameId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const analysis = await this.performSecurityAnalysis(tabId, frameId);
            this.cache.set(cacheKey, {
                data: analysis,
                timestamp: Date.now()
            });
            
            return analysis;
        } catch (error) {
            console.error('[SecurityDetector] Analysis failed:', error);
            return this.getDefaultSecurityProfile();
        }
    }

    /**
     * Performs detailed security analysis
     */
    async performSecurityAnalysis(tabId, frameId) {
        const results = await Promise.allSettled([
            this.detectCSP(tabId, frameId),
            this.detectSecurityHeaders(tabId, frameId),
            this.detectFramework(tabId, frameId),
            this.detectAntiScriptTechniques(tabId, frameId)
        ]);

        const [csp, headers, framework, antiScript] = results.map(r => 
            r.status === 'fulfilled' ? r.value : null
        );

        return {
            csp: csp || { level: 'none' },
            securityHeaders: headers || {},
            framework: framework || { name: 'unknown' },
            antiScript: antiScript || { detected: false },
            riskLevel: this.calculateRiskLevel(csp, headers, antiScript),
            recommendedStrategy: this.getRecommendedStrategy(csp, headers, antiScript),
            timestamp: Date.now()
        };
    }

    /**
     * Detects Content Security Policy configuration
     */
    async detectCSP(tabId, frameId) {
        return new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: () => {
                    const cspData = {
                        level: 'none',
                        directives: {},
                        violations: [],
                        nonce: null,
                        hash: null,
                        unsafeInline: false,
                        unsafeEval: false,
                        strictDynamic: false
                    };

                    // Check meta CSP
                    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
                    let cspHeader = metaCSP?.getAttribute('content') || '';

                    // Try to get CSP from response headers (if available)
                    try {
                        // This is a workaround since we can't directly access response headers
                        // We'll detect CSP violations instead
                        const testScript = document.createElement('script');
                        testScript.innerHTML = '/* CSP test */';
                        
                        const violations = [];
                        const originalCSPViolation = window.document.addEventListener;
                        document.addEventListener('securitypolicyviolation', (e) => {
                            violations.push({
                                directive: e.violatedDirective,
                                blocked: e.blockedURI,
                                original: e.originalPolicy
                            });
                            cspHeader = e.originalPolicy;
                        });

                        // Attempt to inject test script to trigger CSP
                        try {
                            document.head.appendChild(testScript);
                            document.head.removeChild(testScript);
                        } catch (e) {
                            // CSP likely blocked this
                        }

                        cspData.violations = violations;
                    } catch (e) {
                        console.warn('[CSP Detection] Error:', e);
                    }

                    if (cspHeader) {
                        cspData.level = 'detected';
                        
                        // Parse CSP directives
                        const directives = cspHeader.split(';').map(d => d.trim());
                        directives.forEach(directive => {
                            const [key, ...values] = directive.split(' ').map(v => v.trim());
                            if (key) {
                                cspData.directives[key] = values;
                            }
                        });

                        // Check for script-src directive
                        const scriptSrc = cspData.directives['script-src'] || cspData.directives['default-src'];
                        if (scriptSrc) {
                            cspData.unsafeInline = scriptSrc.includes("'unsafe-inline'");
                            cspData.unsafeEval = scriptSrc.includes("'unsafe-eval'");
                            cspData.strictDynamic = scriptSrc.includes("'strict-dynamic'");
                            
                            // Check for nonces
                            const nonceMatch = scriptSrc.find(s => s.startsWith("'nonce-"));
                            if (nonceMatch) {
                                cspData.nonce = nonceMatch.slice(7, -1);
                            }

                            // Determine strictness level
                            if (cspData.strictDynamic && !cspData.unsafeInline) {
                                cspData.level = 'strict';
                            } else if (!cspData.unsafeInline && !cspData.unsafeEval) {
                                cspData.level = 'moderate';
                            } else if (cspData.unsafeInline || cspData.unsafeEval) {
                                cspData.level = 'loose';
                            }
                        }
                    }

                    return cspData;
                },
                world: 'MAIN'
            }, (results) => {
                if (chrome.runtime.lastError) {
                    resolve({ level: 'none' });
                } else {
                    resolve(results?.[0]?.result || { level: 'none' });
                }
            });
        });
    }

    /**
     * Detects security-related HTTP headers
     */
    async detectSecurityHeaders(tabId, frameId) {
        return new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: () => {
                    const headers = {
                        xFrameOptions: false,
                        xContentTypeOptions: false,
                        referrerPolicy: false,
                        strictTransportSecurity: false,
                        featurePolicy: false,
                        permissionsPolicy: false
                    };

                    // We can't directly access response headers, but we can check for their effects
                    try {
                        // Check if iframe embedding is blocked (X-Frame-Options indicator)
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = 'data:text/html,<script>parent.postMessage("iframe-test", "*")</script>';
                        
                        let iframeBlocked = false;
                        setTimeout(() => {
                            iframeBlocked = !iframe.contentDocument;
                            headers.xFrameOptions = iframeBlocked;
                        }, 100);

                        document.body.appendChild(iframe);
                        setTimeout(() => document.body.removeChild(iframe), 200);
                    } catch (e) {
                        headers.xFrameOptions = true; // Likely blocked
                    }

                    // Check for HTTPS (HSTS indicator)
                    headers.strictTransportSecurity = location.protocol === 'https:';

                    return headers;
                },
                world: 'MAIN'
            }, (results) => {
                resolve(results?.[0]?.result || {});
            });
        });
    }

    /**
     * Detects the web framework or CMS being used
     */
    async detectFramework(tabId, frameId) {
        return new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: () => {
                    const framework = {
                        name: 'unknown',
                        version: null,
                        characteristics: []
                    };

                    // Check common frameworks
                    if (typeof React !== 'undefined') {
                        framework.name = 'react';
                        framework.characteristics.push('virtual-dom');
                    } else if (typeof Vue !== 'undefined') {
                        framework.name = 'vue';
                        framework.characteristics.push('virtual-dom');
                    } else if (typeof Angular !== 'undefined' || typeof ng !== 'undefined') {
                        framework.name = 'angular';
                        framework.characteristics.push('virtual-dom');
                    } else if (typeof jQuery !== 'undefined') {
                        framework.name = 'jquery';
                        framework.version = jQuery.fn?.jquery;
                    }

                    // Check for common CMS indicators
                    const metaGenerator = document.querySelector('meta[name="generator"]');
                    if (metaGenerator) {
                        const content = metaGenerator.content.toLowerCase();
                        if (content.includes('wordpress')) framework.name = 'wordpress';
                        else if (content.includes('drupal')) framework.name = 'drupal';
                        else if (content.includes('joomla')) framework.name = 'joomla';
                    }

                    // Check for SPA characteristics
                    const scripts = Array.from(document.scripts);
                    const hasLargeJSBundles = scripts.some(script => 
                        script.src && (script.src.includes('bundle') || script.src.includes('chunk'))
                    );
                    
                    if (hasLargeJSBundles) {
                        framework.characteristics.push('spa');
                    }

                    // Check for heavy DOM manipulation
                    const observer = new MutationObserver(() => {
                        framework.characteristics.push('dynamic-dom');
                    });
                    
                    observer.observe(document.body, { 
                        childList: true, 
                        subtree: true 
                    });
                    
                    setTimeout(() => observer.disconnect(), 1000);

                    return framework;
                },
                world: 'MAIN'
            }, (results) => {
                resolve(results?.[0]?.result || { name: 'unknown' });
            });
        });
    }

    /**
     * Detects anti-script techniques and protections
     */
    async detectAntiScriptTechniques(tabId, frameId) {
        return new Promise((resolve) => {
            chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: () => {
                    const antiScript = {
                        detected: false,
                        techniques: [],
                        scriptBlocking: false,
                        domProtection: false,
                        debuggerDetection: false
                    };

                    try {
                        // Test for script execution blocking
                        let scriptBlocked = false;
                        const testScript = document.createElement('script');
                        testScript.textContent = 'window.__zedmonkey_test__ = true;';
                        
                        document.head.appendChild(testScript);
                        document.head.removeChild(testScript);
                        
                        if (!window.__zedmonkey_test__) {
                            scriptBlocked = true;
                            antiScript.techniques.push('script-blocking');
                        }
                        delete window.__zedmonkey_test__;

                        // Test for DOM protection
                        try {
                            const observer = new MutationObserver(() => {});
                            observer.observe(document.head, { childList: true });
                            observer.disconnect();
                        } catch (e) {
                            antiScript.domProtection = true;
                            antiScript.techniques.push('mutation-observer-blocking');
                        }

                        // Test for debugger detection
                        try {
                            const start = performance.now();
                            debugger; // This should be fast if devtools aren't open
                            const end = performance.now();
                            
                            if (end - start > 100) { // Arbitrary threshold
                                antiScript.debuggerDetection = true;
                                antiScript.techniques.push('debugger-detection');
                            }
                        } catch (e) {
                            // Debugger blocked
                            antiScript.techniques.push('debugger-blocking');
                        }

                        // Check for common anti-debugging techniques
                        const originalConsole = window.console;
                        if (!originalConsole.log.toString().includes('[native code]')) {
                            antiScript.techniques.push('console-override');
                        }

                        // Check for eval restrictions
                        try {
                            eval('1+1');
                        } catch (e) {
                            antiScript.techniques.push('eval-blocking');
                        }

                        antiScript.detected = antiScript.techniques.length > 0;
                        antiScript.scriptBlocking = scriptBlocked;

                    } catch (e) {
                        console.warn('[AntiScript Detection] Error:', e);
                        antiScript.detected = true;
                        antiScript.techniques.push('general-protection');
                    }

                    return antiScript;
                },
                world: 'MAIN'
            }, (results) => {
                resolve(results?.[0]?.result || { detected: false });
            });
        });
    }

    /**
     * Calculates overall risk level for injection
     */
    calculateRiskLevel(csp, headers, antiScript) {
        let riskScore = 0;

        // CSP risk scoring
        if (csp?.level === 'strict') riskScore += 3;
        else if (csp?.level === 'moderate') riskScore += 2;
        else if (csp?.level === 'loose') riskScore += 1;

        // Security headers risk
        if (headers?.xFrameOptions) riskScore += 1;
        if (headers?.strictTransportSecurity) riskScore += 0.5;

        // Anti-script techniques risk
        if (antiScript?.detected) riskScore += antiScript.techniques.length;

        // Risk level categorization
        if (riskScore >= 5) return 'extreme';
        if (riskScore >= 3) return 'high';
        if (riskScore >= 2) return 'moderate';
        if (riskScore >= 1) return 'low';
        return 'minimal';
    }

    /**
     * Recommends the best injection strategy based on security analysis
     */
    getRecommendedStrategy(csp, headers, antiScript) {
        const strategies = [];

        // Strategy selection based on CSP
        if (csp?.level === 'strict') {
            strategies.push('IFRAME_BRIDGE', 'POSTMESSAGE_TUNNEL', 'DOM_MUTATION');
        } else if (csp?.level === 'moderate') {
            if (csp.nonce) {
                strategies.push('NONCE_INJECTION', 'XHR_BLOB', 'PAGE');
            } else {
                strategies.push('XHR_BLOB', 'IFRAME_BRIDGE', 'PAGE');
            }
        } else if (csp?.unsafeInline) {
            strategies.push('PAGE', 'CONTENT', 'XHR_BLOB');
        } else {
            strategies.push('PAGE', 'XHR_BLOB', 'CONTENT');
        }

        // Adjust for anti-script techniques
        if (antiScript?.scriptBlocking) {
            strategies.unshift('DOM_MUTATION', 'IFRAME_BRIDGE');
        }

        // Fallback strategies
        if (strategies.length === 0) {
            strategies.push('IFRAME_BRIDGE', 'POSTMESSAGE_TUNNEL', 'DOM_MUTATION');
        }

        return {
            primary: strategies[0],
            fallbacks: strategies.slice(1),
            all: strategies
        };
    }

    /**
     * Returns default security profile for when detection fails
     */
    getDefaultSecurityProfile() {
        return {
            csp: { level: 'unknown' },
            securityHeaders: {},
            framework: { name: 'unknown' },
            antiScript: { detected: false },
            riskLevel: 'moderate',
            recommendedStrategy: {
                primary: 'PAGE',
                fallbacks: ['CONTENT', 'XHR_BLOB', 'IFRAME_BRIDGE'],
                all: ['PAGE', 'CONTENT', 'XHR_BLOB', 'IFRAME_BRIDGE']
            }
        };
    }

    /**
     * Clears the analysis cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Singleton instance
const securityDetector = new SecurityDetector();

export { SecurityDetector, securityDetector };
