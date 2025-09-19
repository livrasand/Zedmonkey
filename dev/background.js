// Static imports for service worker compatibility
import { parseUserscriptMetadata, createTestScript, validateMetadataBlock, normalizeMatchPattern, requiresPrivileges, validateVersion } from './lib/parser.js';
import { securityDetector } from './lib/security-detector.js';
import { AdvancedInjectionMethods } from './lib/advanced-injectors.js';

// Constants for better maintainability
const EXCLUDED_URL_PATTERNS = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    /^about:/,
    /^edge:/,
    /^opera:/,
    /^extension:/,
    /^file:\/\/.*\/AppData\/Local\//,
    /^https:\/\/chrome\.google\.com\/webstore/,
    /^https:\/\/addons\.mozilla\.org/,
    /^https:\/\/microsoftedge\.microsoft\.com\/addons/,
    /^chrome-search:\/\//,
    /^devtools:\/\//,
    /^view-source:/
];

const INJECTION_TIMEOUT = 500; // ms
const BADGE_COLOR = '#3498db';

/**
 * Checks if a URL should be excluded from script injection
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL should be excluded
 */
function isExcludedUrl(url) {
    return EXCLUDED_URL_PATTERNS.some(regex => regex.test(url));
}

async function getScripts() {
    console.log("getScripts: Attempting to retrieve scripts from storage.");
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("scripts", (result) => {
            if (chrome.runtime.lastError) {
                console.error("getScripts: Chrome runtime error:", chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            
            try {
                const scripts = result.scripts || [];
                console.log("getScripts: Retrieved scripts:", scripts.length, "scripts");
                
                // Validate scripts structure
                const validScripts = scripts.filter(script => {
                    if (!script || typeof script !== 'object') {
                        console.warn("getScripts: Invalid script object detected:", script);
                        return false;
                    }
                    if (!script.id) {
                        console.warn("getScripts: Script without ID detected:", script);
                        return false;
                    }
                    if (!script.metadata) {
                        console.warn("getScripts: Script without metadata detected:", script);
                        script.metadata = { name: "Unnamed Script", version: "1.0" };
                    }
                    return true;
                });
                
                if (validScripts.length !== scripts.length) {
                    console.warn(`getScripts: Filtered out ${scripts.length - validScripts.length} invalid scripts`);
                }
                
                resolve(validScripts);
            } catch (error) {
                console.error("getScripts: Error processing scripts:", error);
                reject(error);
            }
        });
    });
}

/**
 * Saves a script to chrome storage with proper validation and error handling
 * @param {Object} scriptObject - The script object to save
 * @param {string} scriptObject.id - Unique identifier for the script
 * @param {Object} scriptObject.metadata - Script metadata 
 * @param {string} scriptObject.content - Script content
 * @param {boolean} scriptObject.enabled - Whether script is enabled
 * @returns {Promise<Object>} Promise that resolves to the saved script object
 */
async function saveScript(scriptObject) {
    if (!scriptObject || typeof scriptObject !== 'object') {
        throw new Error('Invalid script object provided');
    }
    
    const scriptName = scriptObject.metadata?.name || scriptObject.id || 'Unknown Script';
    console.log(`saveScript: Attempting to save script: ${scriptName}`);
    
    try {
        const existingScripts = await getScripts();
        
        // Generate ID if not provided
        if (!scriptObject.id) {
            scriptObject.id = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Default enabled state to true if not specified
        if (scriptObject.enabled === undefined) {
            scriptObject.enabled = true;
        }
        
        // Find existing script or add new one
        const existingIndex = existingScripts.findIndex(script => script.id === scriptObject.id);
        if (existingIndex >= 0) {
            existingScripts[existingIndex] = scriptObject;
        } else {
            existingScripts.push(scriptObject);
        }
        
        // Save to storage
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ scripts: existingScripts }, () => {
                if (chrome.runtime.lastError) {
                    console.error('saveScript: Storage error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log(`saveScript: Script saved successfully: ${scriptName}`);
                    resolve();
                }
            });
        });
        
        return scriptObject;
        
    } catch (error) {
        console.error('saveScript: Error saving script:', error);
        throw error;
    }
}
/**
 * Removes a script from storage by ID
 * @param {string} scriptId - The ID of the script to remove
 * @returns {Promise<void>} Promise that resolves when script is removed
 */
async function removeScript(scriptId) {
    if (!scriptId || typeof scriptId !== 'string') {
        throw new Error('Valid script ID is required');
    }
    
    console.log(`removeScript: Attempting to remove script with ID: ${scriptId}`);
    
    try {
        const existingScripts = await getScripts();
        const filteredScripts = existingScripts.filter(script => script.id !== scriptId);
        
        if (filteredScripts.length === existingScripts.length) {
            throw new Error(`Script with ID ${scriptId} not found`);
        }
        
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ scripts: filteredScripts }, () => {
                if (chrome.runtime.lastError) {
                    console.error('removeScript: Storage error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log(`removeScript: Script removed successfully with ID: ${scriptId}`);
                    resolve();
                }
            });
        });
        
    } catch (error) {
        console.error('removeScript: Error removing script:', error);
        throw error;
    }
}

/**
 * Parses Zedmonkey's custom Zedata block format from script content
 * @param {string} scriptContent - The script content to parse
 * @returns {Object|null} Parsed metadata object or null if parsing fails
 */
function parseZedataBlock(scriptContent) {
    if (!scriptContent || typeof scriptContent !== 'string') {
        console.warn('parseZedataBlock: Invalid input provided');
        return null;
    }
    
    try {
        // Look for Zedata block in comments
        const zedataMatch = scriptContent.match(/\/\*\s*zedata\s*(\{[\s\S]*?\})\s*\*\//i);
        
        if (!zedataMatch || !zedataMatch[1]) {
            return null; // No Zedata block found
        }
        
        const zedataJson = zedataMatch[1];
        
        // Security check: prevent excessively large JSON
        if (zedataJson.length > 10000) {
            console.warn('parseZedataBlock: Zedata block too large, skipping');
            return null;
        }
        
        const parsedData = JSON.parse(zedataJson);
        
        // Validate parsed data
        if (!parsedData || typeof parsedData !== 'object') {
            console.warn('parseZedataBlock: Invalid Zedata structure');
            return null;
        }
        
        // Build metadata object with safe defaults
        return {
            name: parsedData.name || 'Untitled Script',
            version: parsedData.version || '1.0',
            match: parsedData.match || ['*://*/*'],
            description: parsedData.description || '',
            author: parsedData.author || '',
            ...parsedData // Spread other properties
        };
        
    } catch (error) {
        console.error('parseZedataBlock: Error parsing Zedata block:', error);
        return null;
    }
}

function globToRegex(glob) {
    return glob
        .replace(/\*/g, '.*') // Convierte * a .*
        .replace(/\?/g, '.')  // Convierte ? a .
        .replace(/\/\*\*\//g, '/.*/') // Convierte /**/ a /.*/
        .replace(/:\/\//g, '://') // Asegura que ::// no se modifique
        .replace(/\./g, '\\.'); // Escapa los puntos
}

async function isScriptMatchingUrl(script, url) {
    const scriptName = script.metadata?.name || script.id || 'Unknown Script';
    console.log(`[Zedmonkey] Checking script "${scriptName}" against URL: ${url}`);

    // Ensure script.metadata and script.enabled are valid
    if (!script.metadata) {
        console.log(`[Zedmonkey] Script "${scriptName}" skipped due to missing metadata.`);
        return false;
    }
    
    if (script.enabled === false) {
        console.log(`[Zedmonkey] Script "${scriptName}" skipped - disabled.`);
        return false;
    }

    const {
        matches = [],
        includes = [],
        excludes = [],
        excludeMatches = [] // @exclude-match support
    } = script.metadata;
    
    console.log(`[Zedmonkey] Script "${scriptName}" patterns:`, { matches, includes, excludes, excludeMatches });

    // 1. Verificar exclusiones (@exclude y @exclude-match)
    // Si la URL coincide con alguna regla de exclusión, el script no se inyecta.
    const allExcludes = [...excludes, ...excludeMatches];
    for (const excludePattern of allExcludes) {
        try {
            const isMatch = await matchesPattern(url, excludePattern);
            if (isMatch) {
                console.log(`[Zedmonkey] URL ${url} EXCLUIDA para el script "${script.metadata.name}" por la regla: ${excludePattern}`);
                return false;
            }
        } catch (error) {
            console.warn(`[Zedmonkey] Error processing exclude pattern "${excludePattern}":`, error);
        }
    }

    // 2. Verificar inclusiones (@match y @include)
    // El script se inyecta si coincide con alguna regla @match O @include.
    const combinedIncludes = [...matches, ...includes];
    if (combinedIncludes.length > 0) {
        for (const includePattern of combinedIncludes) {
            try {
                const isMatch = await matchesPattern(url, includePattern);
                if (isMatch) {
                    console.log(`[Zedmonkey] URL ${url} INCLUIDA para el script "${script.metadata.name}" por la regla: ${includePattern}`);
                    return true;
                }
            } catch (error) {
                console.warn(`[Zedmonkey] Error processing include pattern "${includePattern}":`, error);
            }
        }
    } else {
        // Si no hay reglas de @match o @include, se considera que coincide con todo (comportamiento por defecto)
        console.log(`[Zedmonkey] No @match or @include rules for script "${script.metadata.name}", assuming all URLs.`);
        return true;
    }

    // Si hay reglas de inclusión pero ninguna coincidió, no se inyecta.
    console.log(`[Zedmonkey] No matching include rule found for script "${script.metadata.name}".`);
    return false;
}

// Función para hacer matching de patrones según la especificación de Violentmonkey
async function matchesPattern(url, pattern) {
    // Normalizar el patrón usando import estático
    const normalizedPattern = normalizeMatchPattern(pattern);
    
    // Si es un patrón @match válido, usar matching estricto
    if (isValidMatchPattern(normalizedPattern)) {
        return matchesMatchPattern(url, normalizedPattern);
    }
    
    // Si es un patrón @include (glob), usar matching de glob
    return matchesGlobPattern(url, normalizedPattern);
}

// Verifica si un patrón es un @match válido según la especificación
function isValidMatchPattern(pattern) {
    // @match debe tener el formato: <scheme>://<host><path>
    const matchPatternRegex = /^(\*|https?|file|ftp):\/\/(\*|\*\.[^*\/]+|[^*\/]+)(\/.*)$/;
    return matchPatternRegex.test(pattern);
}

// Matching para patrones @match (más estricto)
function matchesMatchPattern(url, pattern) {
    try {
        const urlObj = new URL(url);
        const [, scheme, host, path] = pattern.match(/^([^:]+):\/\/([^\/]+)(.*)$/);
        
        // Verificar scheme
        if (scheme !== '*' && scheme !== urlObj.protocol.slice(0, -1)) {
            return false;
        }
        
        // Verificar host
        if (host !== '*') {
            if (host.startsWith('*.')) {
                const domain = host.slice(2);
                if (!urlObj.hostname.endsWith(domain) || 
                    (urlObj.hostname !== domain && !urlObj.hostname.endsWith('.' + domain))) {
                    return false;
                }
            } else if (host !== urlObj.hostname) {
                return false;
            }
        }
        
        // Verificar path
        const pathPattern = path.replace(/\*/g, '.*');
        const pathRegex = new RegExp('^' + pathPattern + '$');
        return pathRegex.test(urlObj.pathname + urlObj.search + urlObj.hash);
    } catch (error) {
        console.warn('Error parsing URL or pattern:', error);
        return false;
    }
}

// Matching para patrones @include (glob patterns)
function matchesGlobPattern(url, pattern) {
    const regex = new RegExp('^' + globToRegex(pattern) + '$');
    return regex.test(url);
}

// Advanced Smart Recovery System
class SmartRecoveryInjector {
    constructor() {
        this.successfulMethods = new Map(); // Track successful methods per site
        this.failurePatterns = new Map(); // Track failure patterns
        this.injectionAttempts = new Map(); // Track injection attempts
        this.siteSpecificBypass = new Map(); // Site-specific bypass strategies
        
        // Clean old data periodically
        setInterval(() => this.clearOldData(), 60000 * 60); // Every hour
    }

    async injectWithIntelligentRecovery(script, tabId, frameId, url) {
        const scriptName = script.metadata?.name || script.id || 'Unknown Script';
        console.log(`[SmartRecovery] Attempting injection for script "${scriptName}" into frame ${frameId}`);

        let securityAnalysis;
        try {
            // Get security analysis
            securityAnalysis = await securityDetector.analyzePageSecurity(tabId, frameId);
            console.log(`[SmartRecovery] Security analysis for ${url}:`, {
                riskLevel: securityAnalysis.riskLevel,
                csp: securityAnalysis.csp.level,
                primary: securityAnalysis.recommendedStrategy.primary
            });
        } catch (error) {
            console.warn(`[SmartRecovery] Security analysis failed, using defaults:`, error);
            securityAnalysis = securityDetector.getDefaultSecurityProfile();
        }
        
        // Determine injection strategy based on analysis
        const strategies = this.planInjectionStrategy(url, securityAnalysis, script);
        console.log(`[SmartRecovery] Planned strategies:`, strategies.map(s => s.name));
        
        const attemptId = `${tabId}-${frameId}-${Date.now()}`;
        this.injectionAttempts.set(attemptId, {
            script: scriptName,
            url,
            strategies: strategies.map(s => s.name),
            attempts: [],
            startTime: Date.now()
        });
        
        let lastError = null;
        
        for (let i = 0; i < strategies.length; i++) {
            const strategy = strategies[i];
            const attemptStart = performance.now();
            
            try {
                console.log(`[SmartRecovery] Attempting strategy ${i + 1}/${strategies.length}: ${strategy.name}`);
                
                // Execute injection with timeout and options
                const options = this.getStrategyOptions(url, securityAnalysis, strategy.name);
                await Promise.race([
                    strategy.inject(script, tabId, frameId, options),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Injection timeout')), 15000)
                    )
                ]);
                
                const attemptTime = performance.now() - attemptStart;
                
                // Record successful method
                this.recordSuccess(url, strategy.name, attemptTime);
                
                // Update attempt tracking
                const attempt = this.injectionAttempts.get(attemptId);
                if (attempt) {
                    attempt.attempts.push({
                        strategy: strategy.name,
                        success: true,
                        time: attemptTime,
                        error: null
                    });
                    attempt.successfulStrategy = strategy.name;
                    attempt.endTime = Date.now();
                }
                
                console.log(`[SmartRecovery] ✅ Successfully injected "${scriptName}" using ${strategy.name} (${attemptTime.toFixed(2)}ms)`);
                return strategy.name; // Return successful method
                
            } catch (error) {
                const attemptTime = performance.now() - attemptStart;
                lastError = error;
                
                console.warn(`[SmartRecovery] ❌ Strategy ${strategy.name} failed for frame ${frameId}:`, error.message);
                
                // Record failure
                this.recordFailure(url, strategy.name, error);
                
                // Update attempt tracking
                const attempt = this.injectionAttempts.get(attemptId);
                if (attempt) {
                    attempt.attempts.push({
                        strategy: strategy.name,
                        success: false,
                        time: attemptTime,
                        error: error.message
                    });
                }
                
                // If this was a critical error, skip similar strategies
                if (this.isCriticalError(error)) {
                    console.log(`[SmartRecovery] Critical error detected, adjusting remaining strategies`);
                    continue;
                }
                
                // Brief delay between attempts to avoid overwhelming the page
                if (i < strategies.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100 + (i * 50)));
                }
            }
        }
        
        // All strategies failed
        const attempt = this.injectionAttempts.get(attemptId);
        if (attempt) {
            attempt.endTime = Date.now();
            attempt.failed = true;
        }
        
        console.error(`[SmartRecovery] ❌ All injection strategies failed for "${scriptName}" in frame ${frameId}`);
        throw new Error(`All injection methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }
    
    planInjectionStrategy(url, securityAnalysis, script) {
        const strategies = [];
        const domain = this.extractDomain(url);
        
        // Check if we have a successful method for this domain
        const historicalSuccess = this.successfulMethods.get(domain);
        if (historicalSuccess && historicalSuccess.successCount > 1) {
            const successfulMethod = this.getMethodByName(historicalSuccess.method);
            if (successfulMethod) {
                strategies.push(successfulMethod);
                console.log(`[SmartRecovery] 🎯 Using historically successful method: ${historicalSuccess.method}`);
            }
        }
        
        // Add site-specific strategies first (highest priority)
        const siteSpecificMethods = this.getSiteSpecificMethods(url, securityAnalysis);
        for (const method of siteSpecificMethods) {
            if (!strategies.includes(method)) {
                strategies.unshift(method); // Add at beginning for priority
            }
        }
        
        // Add strategies based on security analysis
        const recommendedStrategies = securityAnalysis.recommendedStrategy.all;
        for (const strategyName of recommendedStrategies) {
            const method = this.getMethodByName(strategyName);
            if (method && !strategies.includes(method)) {
                strategies.push(method);
            }
        }
        
        // Add fallback strategies if not enough strategies
        if (strategies.length < 5) {
            const fallbackMethods = this.getFallbackMethods();
            for (const method of fallbackMethods) {
                if (!strategies.includes(method)) {
                    strategies.push(method);
                }
            }
        }
        
        return strategies;
    }
    
    getMethodByName(name) {
        // Combined standard and advanced methods
        const allMethods = {
            'PAGE': injectionMethods.PAGE,
            'CONTENT': injectionMethods.CONTENT,
            'XHR_BLOB': injectionMethods.XHR_BLOB,
            'DOM_MUTATION': AdvancedInjectionMethods.DOM_MUTATION,
            'IFRAME_BRIDGE': AdvancedInjectionMethods.IFRAME_BRIDGE,
            'POSTMESSAGE_TUNNEL': AdvancedInjectionMethods.POSTMESSAGE_TUNNEL,
            'NONCE_INJECTION': AdvancedInjectionMethods.NONCE_INJECTION,
            'EVENT_DRIVEN_INJECTION': AdvancedInjectionMethods.EVENT_DRIVEN_INJECTION
        };
        
        return allMethods[name];
    }
    
    getFallbackMethods() {
        return [
            injectionMethods.PAGE,
            AdvancedInjectionMethods.DOM_MUTATION,
            AdvancedInjectionMethods.IFRAME_BRIDGE,
            injectionMethods.XHR_BLOB,
            AdvancedInjectionMethods.POSTMESSAGE_TUNNEL,
            injectionMethods.CONTENT,
            AdvancedInjectionMethods.EVENT_DRIVEN_INJECTION
        ];
    }
    
    getSiteSpecificMethods(url, securityAnalysis) {
        const domain = this.extractDomain(url);
        const siteSpecific = [];
        
        // Banking and financial sites - extra secure methods
        if (this.isBankingSite(domain)) {
            console.log(`[SmartRecovery] 🏦 Banking site detected: ${domain}`);
            siteSpecific.push(
                AdvancedInjectionMethods.IFRAME_BRIDGE,
                AdvancedInjectionMethods.POSTMESSAGE_TUNNEL,
                AdvancedInjectionMethods.EVENT_DRIVEN_INJECTION
            );
        }
        
        // Social media sites - DOM manipulation resistant methods
        else if (this.isSocialMediaSite(domain)) {
            console.log(`[SmartRecovery] 📱 Social media site detected: ${domain}`);
            siteSpecific.push(
                AdvancedInjectionMethods.DOM_MUTATION,
                AdvancedInjectionMethods.EVENT_DRIVEN_INJECTION,
                AdvancedInjectionMethods.POSTMESSAGE_TUNNEL
            );
        }
        
        // Google sites - special handling
        else if (domain.includes('google.')) {
            console.log(`[SmartRecovery] 🔍 Google site detected: ${domain}`);
            if (securityAnalysis.csp?.nonce) {
                siteSpecific.push(AdvancedInjectionMethods.NONCE_INJECTION);
            }
            siteSpecific.push(
                AdvancedInjectionMethods.IFRAME_BRIDGE,
                AdvancedInjectionMethods.DOM_MUTATION
            );
        }
        
        // YouTube - video site optimizations
        else if (domain.includes('youtube.com')) {
            console.log(`[SmartRecovery] 🎥 YouTube detected: ${domain}`);
            siteSpecific.push(
                AdvancedInjectionMethods.EVENT_DRIVEN_INJECTION,
                AdvancedInjectionMethods.DOM_MUTATION,
                AdvancedInjectionMethods.POSTMESSAGE_TUNNEL
            );
        }
        
        // GitHub - developer site optimizations
        else if (domain.includes('github.com')) {
            console.log(`[SmartRecovery] 💻 GitHub detected: ${domain}`);
            siteSpecific.push(
                AdvancedInjectionMethods.DOM_MUTATION,
                injectionMethods.PAGE
            );
        }
        
        return siteSpecific;
    }
    
    getStrategyOptions(url, securityAnalysis, strategyName) {
        const options = {};
        
        if (strategyName === 'NONCE_INJECTION' && securityAnalysis.csp?.nonce) {
            options.nonce = securityAnalysis.csp.nonce;
        }
        
        return options;
    }
    
    recordSuccess(url, methodName, executionTime) {
        const domain = this.extractDomain(url);
        const currentSuccess = this.successfulMethods.get(domain);
        
        if (!currentSuccess || executionTime < currentSuccess.averageTime) {
            this.successfulMethods.set(domain, {
                method: methodName,
                averageTime: executionTime,
                successCount: (currentSuccess?.successCount || 0) + 1,
                lastSuccess: Date.now()
            });
        }
        
        console.log(`[SmartRecovery] 📊 Success recorded: ${domain} -> ${methodName} (${executionTime.toFixed(2)}ms)`);
    }
    
    recordFailure(url, methodName, error) {
        const domain = this.extractDomain(url);
        const key = `${domain}-${methodName}`;
        const currentFailures = this.failurePatterns.get(key) || {
            count: 0,
            errors: [],
            lastFailure: 0
        };
        
        currentFailures.count++;
        currentFailures.errors.push({
            message: error.message,
            timestamp: Date.now()
        });
        currentFailures.lastFailure = Date.now();
        
        // Keep only recent errors
        if (currentFailures.errors.length > 5) {
            currentFailures.errors = currentFailures.errors.slice(-5);
        }
        
        this.failurePatterns.set(key, currentFailures);
    }
    
    isCriticalError(error) {
        const criticalPatterns = [
            'No tab with id',
            'Frame not found',
            'Extension context invalidated',
            'Cannot access chrome',
            'Permission denied',
            'Invalid tab ID'
        ];
        
        return criticalPatterns.some(pattern => 
            error.message.toLowerCase().includes(pattern.toLowerCase())
        );
    }
    
    extractDomain(url) {
        try {
            return new URL(url).hostname.toLowerCase();
        } catch {
            return 'unknown';
        }
    }
    
    isBankingSite(domain) {
        const bankingKeywords = [
            'bank', 'credit', 'financial', 'paypal', 'stripe', 'visa', 'mastercard',
            'wells', 'chase', 'bofa', 'citi', 'hsbc', 'santander', 'bbva',
            'banking', 'wallet', 'payment'
        ];
        return bankingKeywords.some(keyword => domain.includes(keyword));
    }
    
    isSocialMediaSite(domain) {
        const socialSites = [
            'facebook.com', 'fb.com', 'twitter.com', 'x.com', 'instagram.com', 
            'linkedin.com', 'tiktok.com', 'snapchat.com', 'reddit.com', 
            'pinterest.com', 'whatsapp.com', 'telegram.org'
        ];
        return socialSites.some(site => domain.includes(site));
    }
    
    getInjectionStats() {
        return {
            successfulMethods: Object.fromEntries(this.successfulMethods),
            failurePatterns: Object.fromEntries(this.failurePatterns),
            recentAttempts: Array.from(this.injectionAttempts.entries()).slice(-20)
        };
    }
    
    clearOldData() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Clear old successful methods
        for (const [domain, data] of this.successfulMethods.entries()) {
            if (data.lastSuccess < oneWeekAgo) {
                this.successfulMethods.delete(domain);
            }
        }
        
        // Clear old failure patterns
        for (const [key, data] of this.failurePatterns.entries()) {
            if (data.lastFailure < oneWeekAgo) {
                this.failurePatterns.delete(key);
            }
        }
        
        // Clear old attempts
        for (const [key, data] of this.injectionAttempts.entries()) {
            if (data.startTime < oneWeekAgo) {
                this.injectionAttempts.delete(key);
            }
        }
        
        console.log(`[SmartRecovery] 🧹 Cleaned old data`);
    }
}

// Create singleton instance
const smartRecovery = new SmartRecoveryInjector();

// Legacy function wrapper for compatibility
async function injectWithRecovery(script, methods, tabId, frameId) {
    try {
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        const url = tab?.url || 'unknown';
        return await smartRecovery.injectWithIntelligentRecovery(script, tabId, frameId, url);
    } catch (error) {
        // Fallback to simple recovery for compatibility
        console.warn(`[SmartRecovery] Falling back to simple recovery:`, error.message);
        for (const method of methods) {
            try {
                console.log(`[SimpleRecovery] Trying ${method.name}`);
                await method.inject(script, tabId, frameId);
                console.log(`[SimpleRecovery] Success with ${method.name}`);
                return method.name;
            } catch (methodError) {
                console.warn(`[SimpleRecovery] ${method.name} failed:`, methodError.message);
            }
        }
        throw new Error(`All injection methods failed: ${error.message}`);
    }
}

// Función para determinar el método de inyección basado en el contexto
// Placeholder: En un escenario real, siteContext.hasStrictCSP debería ser determinado
// por el content script y comunicado al background script.
function determineInjectionMethod(siteContext) {
    // Por ahora, siempre preferimos 'PAGE' (MAIN world) para mejor rendimiento y compatibilidad
    // Si siteContext.hasStrictCSP fuera verdadero, podríamos considerar 'CONTENT' (ISOLATED world)
    // o XHR Blob Injection como respaldo.
    if (siteContext && siteContext.hasStrictCSP) {
        console.log("determineInjectionMethod: Site has strict CSP, preferring PAGE world.");
        return 'PAGE'; // Mejor rendimiento
    }
    console.log("determineInjectionMethod: Preferring PAGE world.");
    return 'PAGE'; // Mejor seguridad
}

// Métodos de inyección
const injectionMethods = {
    PAGE: {
        name: 'Page (MAIN world) Injection',
        inject: async (script, tabId, frameId) => {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (!tab) {
                    console.warn(`[Zedmonkey] Tab ${tabId} not found, skipping injection.`);
                    return;
                }

                console.log(`injectionMethods.PAGE: Executing script in MAIN world for tab ${tabId}, frame ${frameId}.`);
                
                // First, inject the GM API
                await chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    files: ['lib/api.js'],
                    world: 'MAIN'
                });
                
                // Then inject the user script with enhanced metadata
                await chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (content, scriptMeta, scriptId) => {
                        // Set enhanced script metadata for GM API
                        if (scriptMeta) {
                            window.__ZEDMONKEY_SCRIPT_META__ = {
                                ...scriptMeta,
                                header: content.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/)?.[0] || ''
                            };
                            window.__ZEDMONKEY_SCRIPT_UUID__ = scriptId;
                            window.ZEDMONKEY_SCRIPT_ID = scriptId;
                        }
                        
                        // Enhanced script injection with error handling
                        try {
                            // Log injection for debugging
                            console.log(`[Zedmonkey] Injecting script: ${scriptMeta?.name || 'Unknown'} (${scriptId})`);
                            
                            const scriptElement = document.createElement('script');
                            scriptElement.textContent = content;
                            scriptElement.setAttribute('data-zedmonkey-script', scriptId);
                            scriptElement.setAttribute('data-script-name', scriptMeta?.name || 'Unknown Script');
                            
                            // Inject into page
                            const target = document.head || document.documentElement;
                            target.appendChild(scriptElement);
                            
                            // Clean up the script element but keep its effects
                            setTimeout(() => {
                                if (scriptElement.parentNode) {
                                    scriptElement.remove();
                                }
                            }, 100);
                            
                            console.log(`[Zedmonkey] ✅ Successfully injected script: ${scriptMeta?.name || 'Unknown'}`);
                            
                        } catch (error) {
                            console.error('[Zedmonkey] ❌ Script injection failed:', error);
                            throw error;
                        }
                    },
                    args: [script.content, script.metadata, script.id || `script_${Date.now()}`],
                    world: 'MAIN'
                });
            } catch (error) {
                if (error.message.includes("No tab with id")) {
                    console.warn(`[Zedmonkey] Tab ${tabId} was closed before injection could complete.`);
                } else {
                    console.error(`[Zedmonkey] Error in PAGE injection for tab ${tabId}:`, error);
                }
                throw error; // Re-throw to allow recovery mechanism to work
            }
        }
    },
    CONTENT: {
        name: 'Content (ISOLATED world) Injection',
        inject: async (script, tabId, frameId) => {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (!tab) {
                    console.warn(`[Zedmonkey] Tab ${tabId} not found, skipping injection.`);
                    return;
                }
                console.log(`injectionMethods.CONTENT: Executing script in ISOLATED world for tab ${tabId}, frame ${frameId}.`);
                await chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (content) => {
                        eval(content); // Ejecutar el script en el isolated world
                    },
                    args: [script.content],
                    world: 'ISOLATED'
                });
            } catch (error) {
                if (error.message.includes("No tab with id")) {
                    console.warn(`[Zedmonkey] Tab ${tabId} was closed before injection could complete.`);
                } else {
                    console.error(`[Zedmonkey] Error in CONTENT injection for tab ${tabId}:`, error);
                }
                throw error; // Re-throw to allow recovery mechanism to work
            }
        }
    },
    XHR_BLOB: {
        name: 'XHR Blob Injection',
        inject: async (script, tabId, frameId) => {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (!tab) {
                    console.warn(`[Zedmonkey] Tab ${tabId} not found, skipping injection.`);
                    return;
                }
                console.log(`injectionMethods.XHR_BLOB: Executing script via XHR Blob for tab ${tabId}, frame ${frameId}.`);
                // This method is more complex and requires a content script to handle the creation of the blob URL
                // and the injection of the script. For simplicity, here is an approximation.
                // In a real scenario, the background script would send the script content to the content script,
                // and the content script would create the blob and inject it.
                await chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: async (scriptContent) => {
                        const blob = new Blob([scriptContent], { type: 'application/javascript' });
                        const url = URL.createObjectURL(blob);
                        const s = document.createElement('script');
                        s.src = url;
                        s.onload = () => URL.revokeObjectURL(url);
                        (document.head || document.documentElement).appendChild(s);
                    },
                    args: [script.content],
                    world: 'MAIN'
                });
            } catch (error) {
                if (error.message.includes("No tab with id")) {
                    console.warn(`[Zedmonkey] Tab ${tabId} was closed before injection could complete.`);
                } else {
                    console.error(`[Zedmonkey] Error in XHR_BLOB injection for tab ${tabId}:`, error);
                }
                throw error; // Re-throw to allow recovery mechanism to work
            }
        }
    }
};

async function updateBadgeAndInjectScripts(tabId) {
    console.log(`[Zedmonkey] updateBadgeAndInjectScripts called for tabId: ${tabId}`);
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
        console.log(`[Zedmonkey] No tab or URL found for tabId: ${tabId}.`);
        return;
    }

    const isExcluded = isExcludedUrl(tab.url);

    if (isExcluded) {
        console.log(`[Zedmonkey] Tab URL ${tab.url} is excluded. Clearing badge.`);
        return chrome.action.setBadgeText({ tabId, text: '' });
    }

    const scripts = await getScripts();
    const matchedScripts = [];
    for (const script of scripts) {
        if (script.enabled && await isScriptMatchingUrl(script, tab.url)) {
            matchedScripts.push(script);
        }
    }
    const injectionEnabled = (await chrome.storage.sync.get("injectionEnabled")).injectionEnabled !== false; // Default to true

    if (injectionEnabled) {
        console.log(`[Zedmonkey] Injection is enabled. Attempting to inject ${matchedScripts.length} scripts.`);
        for (const script of matchedScripts) {
            const frames = await chrome.webNavigation.getAllFrames({ tabId });
            for (const frame of frames) {
                if (frame.errorOccurred || frame.url.startsWith('about:blank')) {
                    console.warn(`[Zedmonkey] Skipping injection for frame: ${frame.url} (error occurred or about:blank).`);
                    continue;
                }
                const siteContext = { hasStrictCSP: false }; // Placeholder
                const preferredMethod = determineInjectionMethod(siteContext);
                let methodsToTry = [];
                if (preferredMethod === 'PAGE') {
                    methodsToTry.push(injectionMethods.PAGE);
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'CONTENT') {
                    methodsToTry.push(injectionMethods.CONTENT);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'XHR_BLOB') {
                    methodsToTry.push(injectionMethods.XHR_BLOB);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                }
                try {
                    await injectWithRecovery(script, methodsToTry, tabId, frame.frameId);
                } catch (error) {
                    console.error(`[Zedmonkey] Failed to inject script ${script.id} into frame ${frame.frameId}:`, error);
                }
            }
        }
    } else {
        console.log(`[Zedmonkey] Injection is disabled.`);
    }

    const count = matchedScripts.length;
    chrome.action.setBadgeText({
        tabId: tabId,
        text: count > 0 ? String(count) : ''
    });
    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: BADGE_COLOR
    });
}

chrome.tabs.onActivated.addListener(e => {
    console.log("onActivated: Tab activated, updating badge and injecting scripts for tab ID:", e.tabId);
    updateBadgeAndInjectScripts(e.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log(`onUpdated: Tab ${tabId} updated. Status: ${changeInfo.status}, URL: ${tab.url}`);
    const injectionEnabled = (await chrome.storage.sync.get("injectionEnabled")).injectionEnabled !== false; // Default to true

    if (!injectionEnabled) {
        console.log(`[Zedmonkey] Injection is disabled. Skipping script injection for tab ${tabId}.`);
        chrome.action.setBadgeText({ tabId, text: "" });
        return;
    }

    const isExcluded = isExcludedUrl(tab.url);

    if (isExcluded) {
        console.log(`[Zedmonkey] Tab URL ${tab.url} is excluded. Clearing badge.`);
        return chrome.action.setBadgeText({ tabId, text: '' });
    }

    const scripts = await getScripts();
    const matchedScripts = [];
    for (const script of scripts) {
        if (await isScriptMatchingUrl(script, tab.url)) {
            matchedScripts.push(script);
        }
    }

    if (matchedScripts.length === 0) {
        console.log(`[Zedmonkey] No matched scripts for tab ${tabId}. Clearing badge.`);
        chrome.action.setBadgeText({ tabId, text: "" });
        return;
    }

    console.log(`[Zedmonkey] Found ${matchedScripts.length} matched scripts for tab ${tabId}.`);

    for (const script of matchedScripts) {
        const runAt = script.metadata.run_at || "document_idle"; // Default to document_idle
        let shouldInject = false;

        if (runAt === "document_start" && changeInfo.status === "loading") {
            shouldInject = true;
        } else if (runAt === "document_end" && changeInfo.status === "complete") {
            shouldInject = true;
        } else if (runAt === "document_idle" && changeInfo.status === "complete") {
            // For document_idle, we can inject after a short delay to ensure page is fully ready
            // This is a simplification; a more robust solution might use requestIdleCallback
            setTimeout(() => {
                updateBadgeAndInjectScripts(tabId); // Re-trigger injection for idle scripts
            }, INJECTION_TIMEOUT);
            continue; // Skip immediate injection for document_idle
        }

        if (shouldInject) {
            const frames = await chrome.webNavigation.getAllFrames({ tabId });
            for (const frame of frames) {
                if (frame.errorOccurred || frame.url.startsWith('about:blank')) {
                    console.warn(`[Zedmonkey] Skipping injection for frame: ${frame.url} (error occurred or about:blank).`);
                    continue;
                }
                const siteContext = { hasStrictCSP: false }; // Placeholder
                const preferredMethod = determineInjectionMethod(siteContext);
                let methodsToTry = [];
                if (preferredMethod === 'PAGE') {
                    methodsToTry.push(injectionMethods.PAGE);
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'CONTENT') {
                    methodsToTry.push(injectionMethods.CONTENT);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'XHR_BLOB') {
                    methodsToTry.push(injectionMethods.XHR_BLOB);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                }
                try {
                    await injectWithRecovery(script, methodsToTry, tabId, frame.frameId);
                } catch (error) {
                    console.error(`[Zedmonkey] Failed to inject script ${script.id} into frame ${frame.frameId}:`, error);
                }
            }
        }
    }

    // Update badge after all injections for this status change are attempted
    const finalCount = matchedScripts.filter(s => s.enabled).length;
    chrome.action.setBadgeText({
        tabId: tabId,
        text: finalCount > 0 ? String(finalCount) : ''
    });
    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: BADGE_COLOR
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("onMessage: Received message:", request.action, request);
    
    try {
        switch (request.action) {
            case "getScripts":
                getScripts().then(scripts => {
                    const response = { scripts };
                    console.log("onMessage: Sending response for getScripts:", response);
                    sendResponse(response);
                }).catch(error => {
                    const response = { error: error.message };
                    console.error("onMessage: Sending error response for getScripts:", response);
                    sendResponse(response);
                });
                return true; // Keep message channel open for async response
            case "getMatchedScripts":
                getScripts().then(async scripts => {
                    const matchedScripts = [];
                    for (const script of scripts) {
                        if (await isScriptMatchingUrl(script, request.url)) {
                            matchedScripts.push(script);
                        }
                    }
                    sendResponse({ scripts: matchedScripts });
                }).catch(error => sendResponse({ error: error.message }));
                return true;
            case "getScriptContent":
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    sendResponse(script ? { content: script.content } : { error: "Script not found" });
                }).catch(error => sendResponse({ error: error.message }));
                return true;
            case "addScript":
                {
                    const metadata = parseUserscriptMetadata(request.scriptContent);
                    saveScript({
                        content: request.scriptContent,
                        metadata: metadata
                    }).then(script => sendResponse({
                        success: true,
                        scriptId: script.id,
                        name: script.metadata.name
                    })).catch(error => sendResponse({
                        success: false,
                        error: error.message
                    }));
                    return true;
                }
            case "updateScriptContent":
                getScripts().then(async scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    if (script) {
                        script.content = request.scriptContent;
                        try {
                            const parsedMetadata = parseZedataBlock(request.scriptContent) || parseUserscriptMetadata(request.scriptContent);
                            if (parsedMetadata) {
                                script.metadata = parsedMetadata;
                            }
                        } catch (e) {
                            console.warn("updateScriptContent: Could not update metadata:", e);
                        }
                        return saveScript(script);
                    }
                    throw new Error("Script not found");
                }).then(script => sendResponse({
                    success: true,
                    scriptId: script.id,
                    name: script.metadata.name
                })).catch(error => sendResponse({
                    success: false,
                    error: error.message
                }));
                return true;
            case "removeScript":
                removeScript(request.scriptId).then(() => sendResponse({ success: true })).catch(error => sendResponse({ success: false, error: error.message }));
                return true;
            case "toggleScript":
            case "toggleScriptEnabled":
                console.log(`onMessage: Handling ${request.action} for scriptId: ${request.scriptId}`);
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    if (!script) {
                        throw new Error(`Script with ID ${request.scriptId} not found`);
                    }
                    
                    console.log(`onMessage: Toggling script "${script.metadata?.name || 'Unknown'}" to ${request.enabled}`);
                    script.enabled = request.enabled;
                    return saveScript(script);
                }).then(() => {
                    console.log(`onMessage: Script toggle successful`);
                    sendResponse({ success: true });
                    
                    // Update badge for all tabs with current page
                    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                        if (tabs && tabs[0]) {
                            updateBadgeAndInjectScripts(tabs[0].id);
                        }
                    });
                }).catch(error => {
                    console.error(`onMessage: Error toggling script:`, error);
                    sendResponse({ success: false, error: error.message });
                });
                return true;
            case "setInjectionState":
                chrome.storage.sync.set({ injectionEnabled: request.enabled }, () => {
                    sendResponse({ success: true });
                    chrome.tabs.query({}, tabs => {
                        tabs.forEach(tab => {
                            updateBadgeAndInjectScripts(tab.id);
                        });
                    });
                });
                return true;
            case "openScriptInEditor":
                try {
                    chrome.storage.local.set({ tempScriptContent: request.scriptContent }, () => {
                        chrome.tabs.create({
                            url: chrome.runtime.getURL("editor/editor.html?loadTemp=true")
                        });
                        sendResponse({ success: true });
                    });
                } catch (e) {
                    console.error("openScriptInEditor: Error opening editor:", e);
                    sendResponse({ success: false, error: e.message });
                }
                return true;
            case "getScriptsForCurrentPage":
                getScripts().then(async scripts => {
                    const matchedScripts = [];
                    for (const script of scripts) {
                        if (script.enabled && await isScriptMatchingUrl(script, request.url)) {
                            matchedScripts.push(script);
                        }
                    }

                    // Send scripts to content script for safe injection
                    matchedScripts.forEach(script => {
                        chrome.tabs.sendMessage(sender.tab.id, {
                            action: "injectScript",
                            scriptContent: script.content
                        });
                    });

                    sendResponse({ count: matchedScripts.length });
                }).catch(error => sendResponse({ error: error.message }));
                return true;
            case 'proxyRequest':
                console.log("onMessage: Received proxyRequest for URL:", request.url);
                fetch(request.url, {
                    method: request.method || 'GET',
                    headers: request.headers || {},
                    body: request.body || null
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                }).then(text => {
                    sendResponse({ success: true, content: text });
                }).catch(error => {
                    console.error("onMessage: Error proxying request:", error);
                    sendResponse({ success: false, error: error.message });
                });
                return true;
            
            // GM API handlers
            case 'GM_getValue':
                chrome.storage.local.get(`gm_${request.scriptId}_${request.name}`, (result) => {
                    const value = result[`gm_${request.scriptId}_${request.name}`];
                    sendResponse({ value: value !== undefined ? value : request.defaultValue });
                });
                return true;
                
            case 'GM_setValue':
                chrome.storage.local.set({ [`gm_${request.scriptId}_${request.name}`]: request.value }, () => {
                    sendResponse({ success: true });
                });
                return true;
                
            case 'GM_deleteValue':
                chrome.storage.local.remove(`gm_${request.scriptId}_${request.name}`, () => {
                    sendResponse({ success: true });
                });
                return true;
                
            case 'GM_listValues':
                chrome.storage.local.get(null, (result) => {
                    const prefix = `gm_${request.scriptId}_`;
                    const values = Object.keys(result)
                        .filter(key => key.startsWith(prefix))
                        .map(key => key.substring(prefix.length));
                    sendResponse({ values });
                });
                return true;
                
            case 'GM_openInTab':
                chrome.tabs.create({
                    url: request.url,
                    active: request.active,
                    index: request.insert ? undefined : undefined
                }, (tab) => {
                    sendResponse({ tabId: tab.id });
                });
                return true;
                
            case 'GM_registerMenuCommand':
                // Store menu command info
                chrome.storage.local.get('gmMenuCommands', (result) => {
                    const commands = result.gmMenuCommands || {};
                    if (!commands[request.scriptId]) {
                        commands[request.scriptId] = {};
                    }
                    commands[request.scriptId][request.menuId] = {
                        name: request.name,
                        options: request.options
                    };
                    chrome.storage.local.set({ gmMenuCommands: commands }, () => {
                        sendResponse({ success: true });
                    });
                });
                return true;
                
            case 'GM_unregisterMenuCommand':
                chrome.storage.local.get('gmMenuCommands', (result) => {
                    const commands = result.gmMenuCommands || {};
                    if (commands[request.scriptId]) {
                        delete commands[request.scriptId][request.menuId];
                        chrome.storage.local.set({ gmMenuCommands: commands }, () => {
                            sendResponse({ success: true });
                        });
                    }
                });
                return true;
                
            case 'GM_notification':
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: request.image || chrome.runtime.getURL('icon48.png'),
                    title: request.title || 'Zedmonkey',
                    message: request.text
                }, (notificationId) => {
                    sendResponse({ notificationId });
                });
                return true;
                
            case 'GM_xmlhttpRequest':
                const details = request.details;
                fetch(details.url, {
                    method: details.method || 'GET',
                    headers: details.headers || {},
                    body: details.data || null
                })
                .then(response => {
                    const responseObj = {
                        readyState: 4,
                        responseText: '',
                        responseURL: response.url,
                        status: response.status,
                        statusText: response.statusText,
                        responseHeaders: {}
                    };
                    
                    // Get response headers
                    response.headers.forEach((value, key) => {
                        responseObj.responseHeaders[key] = value;
                    });
                    
                    return response.text().then(text => {
                        responseObj.responseText = text;
                        return responseObj;
                    });
                })
                .then(responseObj => {
                    sendResponse(responseObj);
                })
                .catch(error => {
                    sendResponse({ error: error.message });
                });
                return true;
                
            case 'GM_download':
                chrome.downloads.download({
                    url: request.url,
                    filename: request.name,
                    headers: request.headers ? Object.entries(request.headers).map(([name, value]) => ({ name, value })) : []
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ downloadId });
                    }
                });
                return true;
                
            case 'GM_setClipboard':
                // Modern clipboard API fallback for content scripts
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (tabs[0]) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            func: (data) => {
                                const textArea = document.createElement('textarea');
                                textArea.value = data;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                            },
                            args: [request.data]
                        }, () => {
                            sendResponse({ success: !chrome.runtime.lastError });
                        });
                    } else {
                        sendResponse({ error: 'No active tab found' });
                    }
                });
                return true;
                
            case 'GM_getResourceText':
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    if (script && script.metadata && script.metadata.resources) {
                        const resource = script.metadata.resources.find(r => r.name === request.name);
                        if (resource && resource.textContent) {
                            sendResponse({ text: resource.textContent });
                        } else if (resource && resource.url) {
                            // Fetch resource if not cached
                            fetch(resource.url)
                                .then(response => response.text())
                                .then(text => {
                                    // Cache the resource
                                    resource.textContent = text;
                                    saveScript(script);
                                    sendResponse({ text });
                                })
                                .catch(error => sendResponse({ error: error.message }));
                        } else {
                            sendResponse({ error: 'Resource not found' });
                        }
                    } else {
                        sendResponse({ error: 'Script or resources not found' });
                    }
                }).catch(error => sendResponse({ error: error.message }));
                return true;
                
            case 'GM_getResourceUrl':
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    if (script && script.metadata && script.metadata.resources) {
                        const resource = script.metadata.resources.find(r => r.name === request.name);
                        if (resource) {
                            sendResponse({ url: resource.url || resource.resURL });
                        } else {
                            sendResponse({ error: 'Resource not found' });
                        }
                    } else {
                        sendResponse({ error: 'Script or resources not found' });
                    }
                }).catch(error => sendResponse({ error: error.message }));
                return true;
                
            case 'GM_addValueChangeListener':
                // Store value watchers for the script
                chrome.storage.local.get('gmValueWatchers', (result) => {
                    const watchers = result.gmValueWatchers || {};
                    const scriptWatchers = watchers[request.scriptId] || {};
                    scriptWatchers[request.watchId] = {
                        key: request.key,
                        scriptId: request.scriptId
                    };
                    watchers[request.scriptId] = scriptWatchers;
                    
                    chrome.storage.local.set({ gmValueWatchers: watchers }, () => {
                        sendResponse({ success: true });
                    });
                });
                return true;
                
            case 'GM_removeValueChangeListener':
                chrome.storage.local.get('gmValueWatchers', (result) => {
                    const watchers = result.gmValueWatchers || {};
                    if (watchers[request.scriptId]) {
                        delete watchers[request.scriptId][request.watchId];
                        chrome.storage.local.set({ gmValueWatchers: watchers }, () => {
                            sendResponse({ success: true });
                        });
                    } else {
                        sendResponse({ success: true });
                    }
                });
                return true;
                
            case 'GM_batch':
                // Execute multiple GM operations in batch
                Promise.all(request.operations.map(async (op) => {
                    try {
                        return await new Promise((resolve) => {
                            chrome.runtime.onMessage.addListener(function handler(msg, sender, sendResp) {
                                if (msg === op) {
                                    chrome.runtime.onMessage.removeListener(handler);
                                    // Process the operation (simplified)
                                    resolve({ success: true, result: null });
                                }
                            });
                            chrome.runtime.sendMessage(op);
                        });
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                })).then(results => {
                    sendResponse({ results });
                }).catch(error => {
                    sendResponse({ error: error.message });
                });
                return true;
                
            case 'GM_log':
                // Enhanced logging system
                const logEntry = {
                    ...request.logData,
                    timestamp: new Date().toISOString(),
                    context: 'background'
                };
                
                console.log(`[Zedmonkey ${logEntry.level.toUpperCase()}]`, logEntry.message, ...logEntry.data);
                
                // Store logs for debugging (optional)
                chrome.storage.local.get('gmLogs', (result) => {
                    let logs = result.gmLogs || [];
                    logs.push(logEntry);
                    
                    // Keep only recent logs (max 1000)
                    if (logs.length > 1000) {
                        logs = logs.slice(-1000);
                    }
                    
                    chrome.storage.local.set({ gmLogs: logs });
                });
                
                sendResponse({ success: true });
                return true;
                
            case 'createTestScript':
                try {
                    const testScriptContent = createTestScript();
                    const metadata = parseUserscriptMetadata(testScriptContent);

                    // Validar el metadata block del script de prueba
                    const validation = validateMetadataBlock(testScriptContent);
                    if (!validation.valid) {
                        console.warn('Test script metadata validation warnings:', validation.errors);
                    }
                    
                    saveScript({
                        content: testScriptContent,
                        metadata: metadata,
                        enabled: true
                    }).then(script => {
                        console.log('Test script created successfully:', script.metadata.name);
                        sendResponse({
                            success: true,
                            scriptId: script.id,
                            name: script.metadata.name,
                            validation: validation
                        });
                        
                        // Update badges for all tabs
                        chrome.tabs.query({}, tabs => {
                            tabs.forEach(tab => {
                                updateBadgeAndInjectScripts(tab.id);
                            });
                        });
                    }).catch(error => {
                        sendResponse({
                            success: false,
                            error: error.message
                        });
                    });
                } catch (error) {
                    sendResponse({
                        success: false,
                        error: 'Failed to create test script: ' + error.message
                    });
                }
                return true;
                
            case 'validateMetadata':
                try {
                    const validation = validateMetadataBlock(request.scriptContent);
                    const metadata = parseUserscriptMetadata(request.scriptContent);
                    const requiresPrivs = metadata ? requiresPrivileges(metadata) : false;
                    const validVersion = metadata && metadata.version ? validateVersion(metadata.version) : false;
                    
                    sendResponse({
                        success: true,
                        validation: validation,
                        metadata: metadata,
                        requiresPrivileges: requiresPrivs,
                        validVersion: validVersion
                    });
                } catch (error) {
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                }
                return true;
                
            default:
                console.warn("onMessage: Unknown action received:", request.action);
                sendResponse({ error: "Unknown action" });
                return false;
        }
    } catch (e) {
        console.error("onMessage: Error handling message:", e);
        sendResponse({ error: e.message });
        return false;
    }
});


chrome.contextMenus.onClicked.addListener((menuInfo, tab) => {
    console.log(`onClicked: Context menu item clicked: ${menuInfo.menuItemId}`);
    
    if (menuInfo.menuItemId === "reload-without-scripts") {
        chrome.storage.sync.get("injectionEnabled", (result) => {
            const originalState = result.injectionEnabled !== false; // Default to true
            
            chrome.storage.sync.set({ injectionEnabled: false }, () => {
                chrome.tabs.reload(tab.id, { bypassCache: true }, () => {
                    // Restore original injection state after reload
                    setTimeout(() => {
                        chrome.storage.sync.set({ injectionEnabled: originalState });
                    }, INJECTION_TIMEOUT);
                });
            });
        });
    } else if (menuInfo.menuItemId === "extension-options") {
        chrome.runtime.openOptionsPage();
    }
});

/**
 * Handle extension installation and updates
 * Creates context menus and shows appropriate onboarding
 */
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`onInstalled: Extension ${details.reason}`);
    
    // Create context menus
    chrome.contextMenus.create({
        id: "reload-without-scripts",
        title: "Reload page without scripts",
        contexts: ["action"]
    });
    
    chrome.contextMenus.create({
        id: "extension-options", 
        title: "Extension options",
        contexts: ["action"]
    });
    
    // Handle different installation scenarios
    if (details.reason === 'install') {
        chrome.storage.local.set({ firstInstall: true }, () => {
            console.log('First installation detected, showing onboarding');
            chrome.tabs.create({
                url: chrome.runtime.getURL('onboarding/welcome.html')
            });
        });
    } else if (details.reason === 'update') {
        console.log('Update detected, showing changelog');
        chrome.tabs.create({
            url: chrome.runtime.getURL('onboarding/update.html')
        });
    }
});

// Set uninstall URL to collect feedback when users uninstall the extension
chrome.runtime.setUninstallURL('https://zedmonkey.vercel.app/feedback.html');