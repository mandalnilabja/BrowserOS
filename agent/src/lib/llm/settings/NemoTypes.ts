import { z } from 'zod'

/**
 * NemoProviderTypeSchema type enum
 */
export const NemoProviderTypeSchema = z.enum([
  'nemo',
  'openai',
  'openai_compatible',
  'anthropic',
  'google_gemini',
  'ollama',
  'openrouter',
  'custom'
])
export type NemoProviderType = z.infer<typeof NemoProviderTypeSchema>

/**
 * Provider capabilities configuration
 */
export const ProviderCapabilitiesSchema = z.object({
  supportsImages: z.boolean().optional()  // Whether the provider supports image inputs
})

/**
 * Model configuration for a provider
 */
export const ModelConfigSchema = z.object({
  contextWindow: z.union([z.number(), z.string()]).transform(val => {
    // Convert string to number if needed (from Chrome settings UI)
    return typeof val === 'string' ? parseInt(val, 10) : val
  }).optional(),  // Maximum context window size
  temperature: z.union([z.number(), z.string()]).transform(val => {
    // Convert string to number if needed (from Chrome settings UI)
    return typeof val === 'string' ? parseFloat(val) : val
  }).pipe(z.number().min(0).max(2)).optional()  // Default temperature setting
})

/**
 * Individual provider configuration from Nemo
 */
export const NemoProviderSchema = z.object({
  id: z.string(),  // Unique provider identifier
  name: z.string(),  // Display name for the provider
  type: NemoProviderTypeSchema,  // Provider type
  isDefault: z.boolean(),  // Whether this is the default provider
  isBuiltIn: z.boolean(),  // Whether this is a built-in provider
  baseUrl: z.string().optional(),  // API base URL
  apiKey: z.string().optional(),  // API key for authentication
  modelId: z.string().optional(),  // Model identifier
  capabilities: ProviderCapabilitiesSchema.optional(),  // Provider capabilities
  modelConfig: ModelConfigSchema.optional(),  // Model configuration
  createdAt: z.string(),  // ISO timestamp of creation
  updatedAt: z.string()  // ISO timestamp of last update
})

export type NemoProvider = z.infer<typeof NemoProviderSchema>

/**
 * Complete Nemo providers configuration
 */
export const NemoProvidersConfigSchema = z.object({
  defaultProviderId: z.string(),  // ID of the default provider
  providers: z.array(NemoProviderSchema)  // List of all providers
})

export type NemoProvidersConfig = z.infer<typeof NemoProvidersConfigSchema>

/**
 * Preference object returned by chrome.browserOS.getPref
 */
export const NemoPrefObjectSchema = z.object({
  key: z.string(),  // Preference key
  type: z.string(),  // Preference type
  value: z.any()  // Preference value (string for JSON preferences)
})

export type NemoPrefObject = z.infer<typeof NemoPrefObjectSchema>

/**
 * Browser preference keys for Nemo
 */
export const BROWSEROS_PREFERENCE_KEYS = {
  PROVIDERS: 'nemo.providers'
} as const