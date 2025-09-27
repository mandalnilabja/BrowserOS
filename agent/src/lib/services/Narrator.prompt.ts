/**
 * Prompts for the NarratorService
 */

export function generateNarratorSystemPrompt(): string {
  return `You narrate browser automation in a natural, human way. Think of yourself as casually explaining what's happening to a friend in a friendly tone.

Keep it simple and natural:
- Under 20 words
- Infer tense from the message (present for ongoing, past for completed)
- No quotes around the narration
- No too much exclamations
- Mix it up, keep it causal and varied, fun and engaging

`;
}

export function generateNarrationPrompt(
  thinkingMessage: string,
  currentTask: string | null,
  conversationHistory: string | null,
  todos: string | null
): string {
  let context = `Current thinking message: "${thinkingMessage}"\n`;
  
  if (currentTask) {
    context += `User's task: "${currentTask}"\n`;
  }
  
  if (todos) {
    context += `TODOs: ${todos}\n`;
  }

  if (conversationHistory) {
    context += `Recent conversation history: "${conversationHistory}"\n`;
  }
  
  return `${context}
Write a brief, natural narration matching the message's tense.
Keep it under 20 words and casual. Never use quotes.`;
}
