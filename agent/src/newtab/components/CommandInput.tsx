import React, { useState, useRef, useEffect } from 'react'
import { useProviderStore } from '../stores/providerStore'
import { useAgentsStore } from '../stores/agentsStore'

interface CommandInputProps {}

export function CommandInput({}: CommandInputProps = {}) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { executeAgent } = useProviderStore()
  const { agents, selectedAgentId } = useAgentsStore()
  
  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    
    const query = value.trim()
    
    console.log('CommandInput handleSubmit:', { selectedAgentId, agents, query })
    
    // Execute selected agent
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId)
      console.log('Found agent:', agent)
      if (agent) {
        console.log('Executing agent:', agent.name, 'with query:', query)
        await executeAgent(agent, query)
      }
    }
    
    setValue('')
  }
  
  // Simple placeholder
  const getPlaceholder = () => {
    return 'Ask me anything ...'
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
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => {
            setIsFocused(false)
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
      
    </form>
  )
}