'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_ACTIONS = [
  { label: 'New song spec', prompt: 'Generate a new v1.6 song spec. Ask me for the concept first.' },
  { label: 'Next priority', prompt: 'What should I work on next based on the current pipeline? Give me one clear action.' },
  { label: 'Pigeon audio', prompt: 'I want to start audio production for "A Pigeon Complains About Gentrification". Lo-fi hip-hop / boom-bap, 85 BPM, D minor. Walk me through the daily-fast scaffold setup.' },
  { label: 'Viral analysis', prompt: 'Which of my published songs is performing best? What elements should I replicate?' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next }),
    })
    const data = await res.json()
    setMessages(m => [...m, { role: 'assistant', content: data.content }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">AI Chat</h2>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_ACTIONS.map(a => (
          <Button key={a.label} variant="outline" size="sm" onClick={() => send(a.prompt)} disabled={loading} className="text-xs">
            {a.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-16">
            <p className="text-2xl mb-2">🎵</p>
            <p>Ask anything about your pipeline, songs, or production.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
              thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          placeholder="Message... (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 resize-none"
          disabled={loading}
        />
        <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon">
          <Send size={16} />
        </Button>
      </div>
    </div>
  )
}
