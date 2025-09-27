import { Logging } from '@/lib/utils/Logging'
import { isMockLLMSettings } from '@/config'
import { 
  NemoProvider,
  NemoProvidersConfig,
  NemoProvidersConfigSchema,
  NemoPrefObject,
  NEMO_PREFERENCE_KEYS
} from './NemoTypes'

// Type definitions for chrome.browserOS API
declare global {
  interface ChromeNemo {
    getPref(name: string, callback: (pref: NemoPrefObject) => void): void
    setPref(name: string, value: any, pageId?: string, callback?: (success: boolean) => void): void
    getAllPrefs(callback: (prefs: NemoPrefObject[]) => void): void
  }
  
  interface Chrome {
    browserOS?: ChromeNemo
  }
}

// Default constants
const DEFAULT_OPENAI_MODEL = 'gpt-4o'
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest'
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'
const DEFAULT_OLLAMA_MODEL = 'qwen3:4b'
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'

/**
 * Reads LLM provider settings from Nemo preferences
 */
export class LLMSettingsReader {
  private static mockProvider: NemoProvider | null = null
  
  /**
   * Set mock provider for testing (DEV MODE ONLY)
   * @param provider - Mock provider configuration
   */
  static setMockProvider(provider: Partial<NemoProvider>): void {
    if (!isMockLLMSettings()) {
      Logging.log('LLMSettingsReader', 'setMockProvider is only available in development mode', 'warning')
      return
    }
    
    this.mockProvider = {
      ...this.getDefaultNemoProvider(),
      ...provider
    }
    Logging.log('LLMSettingsReader', `Mock provider set: ${provider.name || provider.type}`)
  }
  /**
   * Read the default provider configuration
   * @returns Promise resolving to the default Nemo provider
   */
  static async read(): Promise<NemoProvider> {
    try {
      Logging.log('LLMSettingsReader', 'Reading provider settings from Nemo preferences')
      
      // Try chrome.browserOS.getPref API
      const provider = await this.readFromNemo()
      if (provider) {
        Logging.log('LLMSettingsReader', `Provider loaded: ${provider.name} (${provider.type})`)
        return provider
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      Logging.log('LLMSettingsReader', `Failed to read settings: ${errorMessage}`, 'error')
    }
    
    // Return default Nemo provider if reading fails
    const defaultProvider = this.getDefaultNemoProvider()
    Logging.log('LLMSettingsReader', 'Using default Nemo provider')
    return defaultProvider
  }
  
  /**
   * Read all providers configuration
   * @returns Promise resolving to all providers configuration
   */
  static async readAllProviders(): Promise<NemoProvidersConfig> {
    try {
      const config = await this.readProvidersConfig()
      if (config) {
        Logging.log('LLMSettingsReader', `Loaded ${config.providers.length} providers`)
        return config
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      Logging.log('LLMSettingsReader', `Failed to read providers: ${errorMessage}`, 'error')
    }
    
    // Return default config with Nemo provider only
    return {
      defaultProviderId: 'nemo',
      providers: [this.getDefaultNemoProvider()]
    }
  }
  
  /**
   * Read from chrome.browserOS.getPref API
   * @returns Promise resolving to the default provider or null
   */
  private static async readFromNemo(): Promise<NemoProvider | null> {
    // Check if API is available
    const browserOS = (chrome as any)?.browserOS as ChromeNemo | undefined
    if (!browserOS?.getPref) {
      // Fallback: try chrome.storage.local
      try {
        const key = NEMO_PREFERENCE_KEYS.PROVIDERS
        const stored = await new Promise<any>((resolve) => {
          chrome.storage?.local?.get(key, (result) => resolve(result))
        })
        const raw = stored?.[key]
        if (!raw) {
          if (isMockLLMSettings()) {
            Logging.log('LLMSettingsReader', 'No stored providers found, using mock provider', 'warning')
            return this.getMockProvider()
          }
          return null
        }
        const config = NemoProvidersConfigSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
        const def = config.providers.find(p => p.id === config.defaultProviderId) || null
        return def
      } catch (e) {
        if (isMockLLMSettings()) {
          Logging.log('LLMSettingsReader', 'Storage read failed, using mock provider', 'warning')
          return this.getMockProvider()
        }
        return null
      }
    }
    
    return new Promise<NemoProvider | null>((resolve) => {
      browserOS!.getPref(NEMO_PREFERENCE_KEYS.PROVIDERS, (pref: NemoPrefObject) => {
        if (chrome.runtime.lastError) {
          Logging.log('LLMSettingsReader', 
            `Failed to read preference: ${chrome.runtime.lastError.message}`, 'warning')
          resolve(null)
          return
        }
        
        if (!pref?.value) {
          Logging.log('LLMSettingsReader', 'No providers configuration found', 'warning')
          resolve(null)
          return
        }
        
        try {
          // Parse the JSON string
          const config = NemoProvidersConfigSchema.parse(JSON.parse(pref.value))
          // Normalize isDefault flags for safety
          config.providers = config.providers.map(p => ({
            ...p,
            isDefault: p.id === config.defaultProviderId
          }))
          
          // Find and return the default provider
          const defaultProvider = config.providers.find(p => p.id === config.defaultProviderId)
          
          if (!defaultProvider) {
            Logging.log('LLMSettingsReader', 'Default provider not found in config', 'warning')
            resolve(null)
          } else {
            resolve(defaultProvider)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          Logging.log('LLMSettingsReader', `Failed to parse providers config: ${errorMessage}`, 'error')
          resolve(null)
        }
      })
    })
  }
  
  /**
   * Read full providers configuration
   * @returns Promise resolving to providers config or null
   */
  private static async readProvidersConfig(): Promise<NemoProvidersConfig | null> {
    const browserOS = (chrome as any)?.browserOS as ChromeNemo | undefined
    if (!browserOS?.getPref) {
      // Fallback: try chrome.storage.local
      try {
        const key = NEMO_PREFERENCE_KEYS.PROVIDERS
        const stored = await new Promise<any>((resolve) => {
          chrome.storage?.local?.get(key, (result) => resolve(result))
        })
        const raw = stored?.[key]
        if (!raw) return null
        return NemoProvidersConfigSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
      } catch (_e) {
        return null
      }
    }
    
    return new Promise<NemoProvidersConfig | null>((resolve) => {
      browserOS!.getPref(NEMO_PREFERENCE_KEYS.PROVIDERS, (pref: NemoPrefObject) => {
        if (chrome.runtime.lastError || !pref?.value) {
          resolve(null)
          return
        }
        
        try {
          const config = NemoProvidersConfigSchema.parse(JSON.parse(pref.value))
          // Normalize isDefault flags for safety
          config.providers = config.providers.map(p => ({
            ...p,
            isDefault: p.id === config.defaultProviderId
          }))
          resolve(config)
        } catch (error) {
          resolve(null)
        }
      })
    })
  }
  
  /**
   * Get default Nemo built-in provider
   * @returns Default Nemo provider configuration
   */
  private static getDefaultNemoProvider(): NemoProvider {
    return {
      id: 'nemo',
      name: 'Nemo',
      type: 'nemo',
      isDefault: true,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
  
  /**
   * Get mock provider for development
   * @returns Mock provider configuration
   */
  private static getMockProvider(): NemoProvider {
    // Return custom mock if set
    if (this.mockProvider) {
      return this.mockProvider
    }
    
    // Can be overridden via environment
    const mockType = process.env.MOCK_PROVIDER_TYPE || 'nemo'
    
    const mockProviders: Record<string, NemoProvider> = {
      nemo: this.getDefaultNemoProvider(),
      openai: {
        id: 'mock_openai',
        name: 'Mock OpenAI',
        type: 'openai',
        isDefault: true,
        isBuiltIn: false,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || 'mock-key',
        modelId: DEFAULT_OPENAI_MODEL,
        capabilities: { supportsImages: true },
        modelConfig: { contextWindow: 128000, temperature: 0.7 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      anthropic: {
        id: 'mock_anthropic',
        name: 'Mock Anthropic',
        type: 'anthropic',
        isDefault: true,
        isBuiltIn: false,
        baseUrl: 'https://api.anthropic.com',
        apiKey: process.env.ANTHROPIC_API_KEY || 'mock-key',
        modelId: DEFAULT_ANTHROPIC_MODEL,
        capabilities: { supportsImages: true },
        modelConfig: { contextWindow: 200000, temperature: 0.7 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      gemini: {
        id: 'mock_gemini',
        name: 'Mock Gemini',
        type: 'google_gemini',
        isDefault: true,
        isBuiltIn: false,
        apiKey: process.env.GOOGLE_API_KEY || 'mock-key',
        modelId: DEFAULT_GEMINI_MODEL,
        capabilities: { supportsImages: true },
        modelConfig: { contextWindow: 1000000, temperature: 0.7 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ollama: {
        id: 'mock_ollama',
        name: 'Mock Ollama',
        type: 'ollama',
        isDefault: true,
        isBuiltIn: false,
        baseUrl: DEFAULT_OLLAMA_BASE_URL,
        modelId: DEFAULT_OLLAMA_MODEL,
        capabilities: { supportsImages: false },
        modelConfig: { contextWindow: 4096, temperature: 0.7 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    
    return mockProviders[mockType] || this.getDefaultNemoProvider()
  }
  
} 
