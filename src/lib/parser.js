// Zedmonkey Parser Library
// Handles parsing of Zedata Block and traditional userscript metadata

/**
 * Parse Zedata Block (TOML-based metadata)
 * @param {string} scriptContent - The full script content
 * @returns {object|null} - Parsed metadata or null if not found
 */
export function parseZedataBlock(scriptContent) {
    // Look for [script] section in TOML format
    const zedataRegex = /\[script\]([\s\S]*?)(?=\[|\n\n|$)/;
    const match = scriptContent.match(zedataRegex);
    
    if (!match) return null;
    
    const zedataContent = match[1].trim();
    const metadata = {};
    
    // Parse TOML-like content
    const lines = zedataContent.split('\n');
    for (const line of lines) {
      const [key, value] = line.split('=').map(part => part.trim());
      if (key && value) {
        // Remove quotes if present
        metadata[key] = value.replace(/^["'](.*)["']$/, '$1');
      }
    }
    
    // Validate required fields
    const requiredFields = ['name', 'namespace', 'version', 'match'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return null;
      }
    }
    
    return metadata;
  }
  
  /**
   * Parse traditional userscript metadata
   * @param {string} scriptContent - The full script content
   * @returns {object|null} - Parsed metadata or null if not found
   */
  export function parseUserscriptMetadata(scriptContent) {
    const metadataRegex = /\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/;
    const match = scriptContent.match(metadataRegex);
    
    if (!match) return null;
    
    const metadataContent = match[1].trim();
    const metadata = {};
    
    // Parse traditional metadata
    const lines = metadataContent.split('\n');
    for (const line of lines) {
      const match = line.match(/\/\/\s*@(\w+)\s+(.*)/);
      if (match) {
        const [, key, value] = match;
        
        // Handle multiple values for the same key (like @match)
        if (metadata[key]) {
          if (Array.isArray(metadata[key])) {
            metadata[key].push(value);
          } else {
            metadata[key] = [metadata[key], value];
          }
        } else {
          metadata[key] = value;
        }
      }
    }
    
    return metadata;
  }