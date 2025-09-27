import React, { useState, useEffect } from 'react'
import { z } from 'zod'
import { Monitor, X, Pause, RefreshCw, HelpCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/sidepanel/lib/utils'

// Props schema
const HelpSectionPropsSchema = z.object({
  isOpen: z.boolean(), // Whether the help section is open
  onClose: z.function().args().returns(z.void()), // Close handler
  className: z.string().optional() // Additional CSS classes
})

type HelpSectionProps = z.infer<typeof HelpSectionPropsSchema>


/**
 * Help section component displaying comprehensive usage instructions
 */
export function HelpSection ({
  isOpen,
  onClose,
  className
}: HelpSectionProps): JSX.Element | null {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    // Get version from manifest
    const manifest = chrome.runtime.getManifest()
    setVersion(manifest.version || '')
  }, [])

  // Lock background scroll while modal is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!isOpen) return null

     return (
     <div 
       className={cn(
         "absolute top-full right-0 z-[999] transform transition-all duration-200",
         isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
       )}
     >
       <div
         className={`bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto ${className || ''}`}
       >
        {/* Header */}
         <div className="flex items-center justify-between p-5 border-b border-border/30">
           <div className="flex items-center gap-1">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand/20 to-brand/10 flex items-center justify-center">
               <Monitor className="w-4 h-4" />
             </div>
             <div className="flex items-center gap-2">
               <h2 className="text-lg font-semibold text-foreground">Nemo Agent</h2>
               {version && <span className="text-xs text-muted-foreground/70">v{version}</span>}
             </div>
           </div>
           <button
             onClick={onClose}
             className="p-2 hover:bg-muted/50 rounded-xl transition-all duration-200"
             title="Close help"
           >
             <X className="w-4 h-4" />
           </button>
         </div>

         {/* Content */}
         <div className="p-5 space-y-4">
           {/* Introduction */}
           <div className="text-center">
             <p className="text-sm text-muted-foreground/80 leading-relaxed">
               I'm your intelligent browser automation assistant. I can navigate
               websites, extract information, and manage your browsing
               productivity—all through natural conversation.
             </p>
           </div>

            {/* Quick Controls */}
           <div className="space-y-3">
             <h3 className="text-base font-semibold text-foreground">Quick Controls</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                 <div className="flex items-center gap-2 p-3 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/60 dark:border-border/30 shadow-sm">
                   <div className="w-7 h-7 bg-gradient-to-br from-brand/20 to-brand/10 rounded-xl flex items-center justify-center">
                     <Pause className="w-3 h-3" fill="currentColor" />
                   </div>
                   <div>
                     <div className="font-medium text-sm text-foreground">Pause</div>
                     <div className="text-xs text-muted-foreground/70">Stop execution at any time</div>
                   </div>
                 </div>

                 <div className="flex items-center gap-2 p-3 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/60 dark:border-border/30 shadow-sm">
                   <div className="w-7 h-7 bg-gradient-to-br from-brand/20 to-brand/10 rounded-xl flex items-center justify-center">
                     <RefreshCw className="w-3 h-3" />
                   </div>
                   <div>
                     <div className="font-medium text-sm text-foreground">Reset</div>
                     <div className="text-xs text-muted-foreground/70">Start a fresh conversation</div>
                   </div>
                 </div>
               </div>

              <div className="p-4 bg-gradient-to-r from-brand/5 to-brand/10 border border-brand/20 rounded-xl">
               <div className="flex items-start gap-2">
                 <div className="w-5 h-5 bg-brand/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                   <HelpCircle className="w-3 h-3" />
                 </div>
                 <div>
                   <div className="font-medium text-sm text-foreground">Pro tip</div>
                   <div className="text-xs text-muted-foreground/80 leading-relaxed">
                     You can interrupt me anytime by typing a new instruction. I'll pause what I'm doing and switch to your new task immediately.
                   </div>
                 </div>
               </div>
             </div>
           </div>


           {/* Learn More */}
           <div className="pt-4 border-t border-border/30">
             <a
               href="https://bit.ly/Nemo-setup" //add own url for crx
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2.5 text-brand hover:text-brand/80 transition-all duration-200 group"
             >
               <div className="w-6 h-6 bg-brand/10 rounded-lg flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                 <ExternalLink className="w-3 h-3" />
               </div>
               <span className="text-xs font-medium">View detailed usage guide</span>
             </a>
           </div>
        </div>
      </div>
    </div>
  )
}
