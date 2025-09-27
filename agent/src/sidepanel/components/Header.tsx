import React, { memo, useState } from 'react'
import { Button } from '@/sidepanel/components/ui/button'
import { useSidePanelPortMessaging } from '@/sidepanel/hooks'
import { MessageType } from '@/lib/types/messaging'
import { useAnalytics } from '../hooks/useAnalytics'
import { SettingsModal } from './SettingsModal'
import { HelpSection } from './HelpSection'
import { Settings, Pause, RotateCcw, HelpCircle } from 'lucide-react'
import { useSettingsStore } from '@/sidepanel/stores/settingsStore'
import { useEffect } from 'react'
import { z } from 'zod'
import { NemoProvidersConfig, NemoProvidersConfigSchema } from '@/lib/llm/settings/types'
import { MCP_SERVERS, type MCPServerConfig } from '@/config/mcpServers'


interface HeaderProps {
  onReset: () => void
  showReset: boolean  // This now means "has messages to reset"
  isProcessing: boolean
}

/**
 * Header component for the sidepanel
 * Displays title, connection status, and action buttons (pause/reset)
 * Memoized to prevent unnecessary re-renders
 */
export const Header = memo(function Header({ onReset, showReset, isProcessing }: HeaderProps) {
  const { sendMessage, connected, addMessageListener, removeMessageListener } = useSidePanelPortMessaging()
  const { trackClick } = useAnalytics()
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showMCPDropdown, setShowMCPDropdown] = useState(false)
  const [providersConfig, setProvidersConfig] = useState<NemoProvidersConfig | null>(null)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [mcpInstallStatus, setMcpInstallStatus] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [installedServers, setInstalledServers] = useState<any[]>([])
  const { theme } = useSettingsStore()
  
  const handleCancel = () => {
    trackClick('pause_task')
    sendMessage(MessageType.CANCEL_TASK, {
      reason: 'User clicked pause button',
      source: 'sidepanel'
    })
  }
  
  const handleReset = () => {
    trackClick('reset_conversation')
    // Send reset message to background
    sendMessage(MessageType.RESET_CONVERSATION, {
      source: 'sidepanel'
    })
    
    // Clear local state
    onReset()
  }

  const handleSettingsClick = () => {
    trackClick('open_settings')
    setShowSettings(true)
  }

  const handleHelpClick = () => {
    trackClick('open_help')
    setShowHelp(true)
  }

  const fetchInstalledServers = () => {
    sendMessage(MessageType.MCP_GET_INSTALLED_SERVERS, {})
  }

  // Close dropdown when clicking outside and fetch servers when opening
  useEffect(() => {
    if (!showMCPDropdown) return
    
    // Fetch installed servers when dropdown opens
    fetchInstalledServers()
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.mcp-dropdown-container')) {
        setShowMCPDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMCPDropdown])

  // Close settings and help dropdowns when clicking outside
  useEffect(() => {
    if (!showSettings && !showHelp) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.settings-dropdown') && !target.closest('.help-dropdown')) {
        setShowSettings(false)
        setShowHelp(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings, showHelp])

  // Load providers config for default provider dropdown
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload && payload.status === 'success' && payload.data) {
        // Handle providers config
        if (payload.data.providersConfig) {
          try {
            const cfg = NemoProvidersConfigSchema.parse(payload.data.providersConfig)
            setProvidersConfig(cfg)
          } catch (err) {
            setProvidersError(err instanceof Error ? err.message : String(err))
          }
        }
        // Handle installed servers response
        if (payload.data.servers) {
          setInstalledServers(payload.data.servers)
        }
      }
    }
    addMessageListener<any>(MessageType.WORKFLOW_STATUS, handler)
    // Initial fetch
    sendMessage(MessageType.GET_LLM_PROVIDERS as any, {})
    return () => removeMessageListener<any>(MessageType.WORKFLOW_STATUS, handler)
  }, [])

  // Listen for MCP server installation/deletion status
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.status === 'success') {
        // Get server name from config for display
        const serverName = MCP_SERVERS.find(s => s.id === payload.serverId)?.name || payload.serverId
        setMcpInstallStatus({
          message: `${serverName} connected successfully!`,
          type: 'success'
        })
        // Refresh installed servers list after successful installation
        fetchInstalledServers()
      } else if (payload.status === 'deleted') {
        setMcpInstallStatus({
          message: 'Server removed successfully',
          type: 'success'
        })
        // Refresh installed servers list after successful deletion
        fetchInstalledServers()
      } else if (payload.status === 'auth_failed') {
        setMcpInstallStatus({
          message: payload.error || 'Authentication failed. Please try again.',
          type: 'error'
        })
      } else if (payload.status === 'error') {
        setMcpInstallStatus({
          message: payload.error || 'Operation failed. Please try again.',
          type: 'error'
        })
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setMcpInstallStatus(null), 5000)
    }
    
    addMessageListener<any>(MessageType.MCP_SERVER_STATUS, handler)
    return () => removeMessageListener<any>(MessageType.MCP_SERVER_STATUS, handler)
  }, [])

  return (
    <>
      <header 
        className="relative flex items-center justify-between h-12 px-3 bg-[hsl(var(--header))] border-b border-border/50"
        role="banner"
      >
        


        {/* Left side - Control buttons */}
        <nav className="flex items-center gap-2 sm:gap-3" role="navigation" aria-label="Chat controls">
          {/* Show Pause button if processing */}
          {isProcessing && (
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300"
              aria-label="Pause current task"
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </Button>
          )}
          
          {/* Show Reset button if has messages */}
          {showReset && (
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-300"
              aria-label="Reset conversation"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </nav>

        {/* Right side - Help and Settings buttons */}
        <div className="flex items-center gap-2">
          {/* Help button */}
          <div className="relative help-dropdown">
            <Button
              onClick={handleHelpClick}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
              aria-label="Open help"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            <HelpSection 
              isOpen={showHelp}
              onClose={() => setShowHelp(false)}
            />
          </div>

          {/* Settings button */}
          <div className="relative settings-dropdown">
            <Button
              onClick={handleSettingsClick}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl hover:bg-brand/10 hover:text-brand transition-all duration-300"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <SettingsModal 
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              onOpenHelp={() => {
                setShowSettings(false)
                setShowHelp(true)
              }}
            />
          </div>
        </div>
      </header>
    </>
  )
})