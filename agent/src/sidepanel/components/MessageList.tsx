import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { MessageItem } from './MessageItem'
import { CollapsibleThoughts } from './CollapsibleThoughts'
import { TypingIndicator } from './TypingIndicator'
import { GroupedThinkingSection } from './GroupedThinkingSection'
import { GroupedPlanningSection } from './GroupedPlanningSection'
import { GroupedExecutionSection } from './GroupedExecutionSection'
import { ParentCollapsibleWrapper } from './ParentCollapsibleWrapper'
import { AgentActivitySkeleton } from './skeleton/AgentActivitySkeleton'
import { ThinkingSkeleton } from './skeleton/ThinkingSkeleton'
import { PlanningSkeleton } from './skeleton/PlanningSkeleton'
import { ExecutionSkeleton } from './skeleton/ExecutionSkeleton'
import { Button } from '@/sidepanel/components/ui/button'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useAnalytics } from '../hooks/useAnalytics'
import { cn } from '@/sidepanel/lib/utils'
import { groupMessages } from '../utils/messageGrouping'
import type { Message } from '../stores/chatStore'
import { useSidePanelPortMessaging } from '@/sidepanel/hooks'
import { MessageType } from '@/lib/types/messaging'
import { useChatStore } from '@/sidepanel/stores/chatStore'
import { useSettingsStore } from '@/sidepanel/stores/settingsStore'
import { useTabsStore } from '@/sidepanel/stores/tabsStore'

interface MessageListProps {
  messages: Message[]
  isProcessing?: boolean
  onScrollStateChange?: (isUserScrolling: boolean) => void
  scrollToBottom?: () => void
  containerRef?: React.RefObject<HTMLDivElement>
}

// Example prompts - showcasing Nemo capabilities
const EXAMPLES = [
  "Visit Nemo launch and upvote ❤️",
  // "Find top-rated headphones under $200",
  "Go to GitHub and Star Nemo ⭐",
  // "Turn this article into a LinkedIn post",
  "Open amazon.com and order Sensodyne toothpaste 🪥",
]

// Animation constants  
const DEFAULT_DISPLAY_COUNT = 4 // Fixed number of examples to show

/**
 * MessageList component
 * Displays a list of chat messages with auto-scroll and empty state
 */
export function MessageList({ messages, isProcessing = false, onScrollStateChange, scrollToBottom: externalScrollToBottom, containerRef: externalContainerRef }: MessageListProps) {
  const { containerRef: internalContainerRef, isUserScrolling, scrollToBottom } = useAutoScroll<HTMLDivElement>([messages], externalContainerRef)
  const { trackFeature } = useAnalytics()
  const { sendMessage } = useSidePanelPortMessaging()
  const { upsertMessage, setProcessing } = useChatStore()
  const { chatMode, setChatMode } = useSettingsStore()
  const { getContextTabs, clearSelectedTabs } = useTabsStore()
  const [, setIsAtBottom] = useState(true)
  const [currentExamples] = useState<string[]>(EXAMPLES)
  const [isAnimating] = useState(false)
  const [displayCount] = useState(DEFAULT_DISPLAY_COUNT)
  
  // Track previously seen message IDs to determine which are new
  const previousMessageIdsRef = useRef<Set<string>>(new Set())
  const newMessageIdsRef = useRef<Set<string>>(new Set())

  // Use external container ref if provided, otherwise use internal one
  const containerRef = externalContainerRef || internalContainerRef
  

  // Track new messages for animation 
  useEffect(() => {
    const currentMessageIds = new Set(messages.map(msg => msg.msgId))
    const previousIds = previousMessageIdsRef.current
    
    // Find new messages (in current but not in previous)
    const newIds = new Set<string>()
    currentMessageIds.forEach(id => {
      if (!previousIds.has(id)) {
        newIds.add(id)
      }
    })
    
    newMessageIdsRef.current = newIds
    previousMessageIdsRef.current = currentMessageIds
  }, [messages])

  // Use simplified message grouping for new agent architecture
  const messageGroups = useMemo(() => {
    return groupMessages(messages)
  }, [messages])
  
  // Detect if task is completed (assistant message exists after thinking messages)
  const isTaskCompleted = useMemo(() => {
    return messages.some(msg => msg.role === 'assistant')
  }, [messages])
  
  // Scroll to latest assistant message when task completes
  useEffect(() => {
    if (isTaskCompleted) {
      const latestAssistantMessage = messages.findLast(msg => msg.role === 'assistant')
      if (latestAssistantMessage) {
        // Small delay to let sections collapse first
        setTimeout(() => {
          const messageElement = document.querySelector(`[data-message-id="${latestAssistantMessage.msgId}"]`)
          if (messageElement) {
            messageElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          }
        }, 100) // Minimal delay just for collapse animation
      }
    }
  }, [isTaskCompleted, messages])
  
  // Track currently executing narration for legacy narration blocks only
  const currentlyExecutingNarration = useMemo(() => {
    const lastNarrationIndex = messages.findLastIndex(m => m.role === 'narration')
    return lastNarrationIndex !== -1 && 
      !messages.slice(lastNarrationIndex + 1).some(m => m.role === 'assistant') ? 
      messages[lastNarrationIndex]?.msgId : null
  }, [messages])
  
  // Process narrations separately (only for narration messages, not thinking/execution)
  const narrationBlocks = useMemo(() => {
    const blocks: Array<{ type: 'narration-group' | 'collapsed-thoughts', messages: Message[] }> = []
    const allNarrations: Message[] = []
    let hasSeenAssistant = false
    
    // Only process narration messages (exclude thinking/execution which are handled by messageGroups)
    messages.forEach((message) => {
      if (message.role === 'assistant') {
        hasSeenAssistant = true
        if (allNarrations.length > 0) {
          blocks.push({ type: 'collapsed-thoughts', messages: [...allNarrations] })
          allNarrations.length = 0
        }
      } else if (message.role === 'narration') {
        if (!hasSeenAssistant) {
          allNarrations.push(message)
        }
      }
    })
    
    // Process remaining narrations
    if (allNarrations.length > 0 && !hasSeenAssistant) {
      if (allNarrations.length > 3) {
        const collapsedCount = allNarrations.length - 3
        const collapsedMessages = allNarrations.slice(0, collapsedCount)
        const visibleMessages = allNarrations.slice(collapsedCount)
        blocks.push({ type: 'collapsed-thoughts', messages: collapsedMessages })
        blocks.push({ type: 'narration-group', messages: visibleMessages })
      } else {
        blocks.push({ type: 'collapsed-thoughts', messages: [] })
        blocks.push({ type: 'narration-group', messages: allNarrations })
      }
    }
    
    return blocks
  }, [messages])


  // Check if we're at the bottom of the scroll container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkIfAtBottom = () => {
      const scrollDistance = container.scrollHeight - container.scrollTop - container.clientHeight
      const isNearBottom = scrollDistance < 100 // Increased threshold for better detection
      setIsAtBottom(isNearBottom)
      
      const shouldShowScrollButton = !isNearBottom && isUserScrolling
      onScrollStateChange?.(shouldShowScrollButton)
    }

    // Check initially after a small delay to ensure container is rendered
    setTimeout(checkIfAtBottom, 100)

    // Check on scroll
    container.addEventListener('scroll', checkIfAtBottom, { passive: true })
    
    // Also check when messages change
    checkIfAtBottom()
    
    return () => {
      container.removeEventListener('scroll', checkIfAtBottom)
    }
  }, [containerRef, onScrollStateChange, messages.length, isUserScrolling]) // Added isUserScrolling dependency

  // Use external scroll function if provided, otherwise use internal one
  const _handleScrollToBottom = () => {
    trackFeature('scroll_to_bottom')
    if (externalScrollToBottom) {
      externalScrollToBottom()
    } else {
      scrollToBottom()
    }
  }

  const handleExampleClick = (prompt: string) => {
    // Prevent any event propagation that might interfere
    trackFeature('example_prompt', { prompt })

    // Switch to Agent Mode for example runs
    try { setChatMode(false) } catch { /* no-op */ }

    // Mirror ChatInput.submitTask behavior
    const msgId = `user_${Date.now()}`
    upsertMessage({ msgId, role: 'user', content: prompt, ts: Date.now() })
    setProcessing(true)

    // Collect selected context tabs (same behavior as ChatInput)
    const contextTabs = getContextTabs()
    const tabIds = contextTabs.length > 0 ? contextTabs.map(tab => tab.id) : undefined

    sendMessage(MessageType.EXECUTE_QUERY, {
      query: prompt.trim(),
      tabIds,
      source: 'sidepanel',
      chatMode: false
    })

    // Clear selected tabs after sending (mirror ChatInput)
    try { clearSelectedTabs() } catch { /* no-op */ }
  }
  
  // Landing View
  if (messages.length === 0) {
    return (
      <div 
        className="h-full overflow-y-auto flex flex-col items-center justify-center p-8 text-center relative"
        role="region"
        aria-label="Welcome screen with example prompts"
      >
        {/* Main content - vertically centered (Examples remain centered) */}
        <div className="relative z-0 flex flex-col items-center justify-center min-h-0 max-w-lg w-full">
          
          {/* Tagline */}
          <div className="flex items-center justify-center -mt-4">
            <h2 className="text-3xl font-bold text-muted-foreground animate-fade-in-up flex items-baseline flex-wrap justify-center gap-2 text-center px-2">
              <span>Your <span className="text-brand">Agentic</span></span>
              <span>
                web assistant{' '}
                <img 
                  src="/assets/nemo.svg" 
                  alt="Nemo" 
                  className="w-8 h-8 inline-block align-text-bottom animate-fade-in-up"
                />
              </span>
            </h2>
          </div>

          {/* Example Prompts */}
          <div className="mb-8 mt-2">
            <h3 className="text-lg font-semibold text-foreground mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              What would you like to do?
            </h3>
            <div 
              className={`flex flex-col items-center max-w-lg w-full space-y-3 transition-transform duration-500 ease-in-out ${
                isAnimating ? 'translate-y-5' : ''
              }`}
              role="group"
              aria-label="Example prompts"
            >
              {currentExamples.map((prompt, index) => (
                <div 
                  key={`${prompt}-${index}`} 
                  className={`relative w-full transition-all duration-500 ease-in-out ${
                    isAnimating && index === 0 ? 'animate-fly-in-top' : 
                    isAnimating && index === currentExamples.length - 1 ? 'animate-fly-out-bottom' : ''
                  }`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="group relative text-sm h-auto py-3 px-4 whitespace-normal bg-background/50 backdrop-blur-sm border-2 border-brand/30 hover:border-brand hover:bg-brand/5 smooth-hover smooth-transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none overflow-hidden w-full message-enter"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleExampleClick(prompt)
                    }}
                    aria-label={`Use example: ${prompt}`}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    {/* Content */}
                    <span className="relative z-10 font-medium text-foreground group-hover:text-brand transition-colors duration-300">
                      {prompt}
                    </span>
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-brand/20 to-transparent"></div>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Chat View
  return (
    <div className="h-full flex flex-col">
      
      {/* Messages container */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[hsl(var(--background))]"
        ref={containerRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        tabIndex={0}
      >
        {/* Messages List */}
        <div className="p-6 space-y-3 pb-4">
          {/* Simplified rendering for new agent architecture */}
          {messageGroups.map((group, groupIndex) => {
            const key = `group-${groupIndex}`
            
            if (group.type === 'thinking') {
              // Render thinking section directly - no complex wrapper needed
              return (
                <GroupedThinkingSection
                  key={key}
                  messages={group.messages}
                  isLatest={groupIndex === messageGroups.length - 1}
                  isTaskCompleted={isTaskCompleted}
                />
              )
            } else {
              // Single message (user, assistant, error, etc.)
              const message = group.messages[0]
              if (!message) return null
              
              const isNewMessage = newMessageIdsRef.current.has(message.msgId)
              
              return (
                <div
                  key={message.msgId}
                  data-message-id={message.msgId}
                  className={isNewMessage ? 'animate-fade-in' : ''}
                  style={{ animationDelay: isNewMessage ? '0.1s' : undefined }}
                >
                  <MessageItem 
                    message={message} 
                    shouldIndent={false}
                    showLocalIndentLine={false}
                  />
                </div>
              )
            }
          })}
          
          {/* Narration blocks rendering (only for actual narration messages) */}
          {narrationBlocks.map((block, index) => {
            if (block.type === 'collapsed-thoughts') {
              return (
                <div key={`narration-collapsed-${index}`}>
                  <CollapsibleThoughts messages={block.messages} />
                </div>
              )
            } else if (block.type === 'narration-group') {
              return (
                <div key={`narration-group-${index}`} className="relative">
                  <div className="absolute left-[16px] top-0 bottom-0 w-px bg-gradient-to-b from-brand/40 via-brand/30 to-brand/20" />
                  {block.messages.map((message: Message, msgIndex: number) => {
                    const isCurrentlyExecuting = message.msgId === currentlyExecutingNarration
                    const isNewMessage = newMessageIdsRef.current.has(message.msgId)
                    
                    return (
                      <div
                        key={message.msgId}
                        className={cn("relative pl-8", isNewMessage ? 'animate-fade-in' : '')}
                        style={{ animationDelay: isNewMessage ? `${msgIndex * 0.1}s` : undefined }}
                      >
                        {isCurrentlyExecuting && (
                          <div 
                            className="absolute left-[12px] top-[8px] w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: '#EC6164' }}
                            aria-label="Currently executing"
                          />
                        )}
                        <MessageItem 
                          message={message} 
                          shouldIndent={false}
                          showLocalIndentLine={false}
                          applyIndentMargin={false}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            }
            return null
          })}
          
          {/* Show skeleton during processing - either initially or during delays */}
          {isProcessing && (
            <ThinkingSkeleton />
          )}
        </div>
      </div>
      
    </div>
  )
}
