import React, { useState, useRef, useEffect } from 'react'
import { ProviderDropdown } from './ProviderDropdown'
import { CommandPalette } from './CommandPalette'
import { SearchDropdown } from './SearchDropdown'
import { useProviderStore, type Provider } from '../stores/providerStore'
import { useAgentsStore } from '../stores/agentsStore'

interface CommandInputProps {
  onCreateAgent?: () => void
}

export function CommandInput({ onCreateAgent }: CommandInputProps = {}) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [isExecutingAgent, setIsExecutingAgent] = useState(false)
  const [executingAgentName, setExecutingAgentName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { getSelectedProvider, executeProviderAction, executeAgent } = useProviderStore()
  const { agents, selectedAgentId } = useAgentsStore()
  
  const selectedProvider = getSelectedProvider()
  
  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const handleProviderSelect = async (provider: Provider, query: string) => {
    setShowSearchDropdown(false)

    await executeProviderAction(provider, query)
    setValue('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    
    // Don't submit if dropdowns are open
    if ( showSearchDropdown) return
    
    const query = value.trim()
    
    console.log('CommandInput handleSubmit:', { selectedAgentId, agents, query })
    
    // Execute provider-specific action or agent
    if (selectedAgentId) {
      // Execute selected agent
      const agent = agents.find(a => a.id === selectedAgentId)
      console.log('Found agent:', agent)
      if (agent) {
        console.log('Executing agent:', agent.name, 'with query:', query)
        await executeAgent(agent, query)
      }
    } else if (selectedProvider) {
      console.log('Executing provider:', selectedProvider.name, 'with query:', query)
      await executeProviderAction(selectedProvider, query)
    }
    
    setValue('')
  }
  
  // Simple placeholder
  const getPlaceholder = () => {
    return 'Ask anything interesting ...'
  }
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`
        relative flex items-center gap-3
        bg-background/80 backdrop-blur-sm border-2 rounded-xl
        transition-all duration-300 ease-out
        ${isFocused ? 'border-[hsl(var(--brand))]/60 shadow-lg' : 'border-[hsl(var(--brand))]/30 hover:border-[hsl(var(--brand))]/50 hover:bg-background/90'}
        px-4 py-3
      `}>
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value
            setValue(newValue)
            
            // Show command palette when user types '/'
            // if (newValue === '/' || (newValue.startsWith('/') && showCommandPalette)) {
            //   setShowCommandPalette(true)
            //   setShowSearchDropdown(false)
            // } else {
              // Show search dropdown when there's text (not starting with '/')
            setShowSearchDropdown(newValue.trim().length > 0)
            // }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => {
            setIsFocused(false)
            setShowSearchDropdown(false)
          }, 200)}
          placeholder={getPlaceholder()}
          className="
            flex-1
            bg-transparent border-none outline-none
            text-base placeholder:text-muted-foreground
          "
          aria-label="Command input"
          autoComplete="off"
          spellCheck={false}
        />
        
      </div>
      
      {/* Search Dropdown */}
      {showSearchDropdown && (
        <SearchDropdown
          query={value}
          onSelect={handleProviderSelect}
          onClose={() => setShowSearchDropdown(false)}
        />
      )}
      
    </form>
  )
}