'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText } from 'lucide-react'

interface TruncateTextProps {
  text: string
  maxLines?: number
  maxLength?: number
  title?: string
}

export function TruncateText({ text, maxLines = 2, maxLength, title }: TruncateTextProps) {
  const [showFull, setShowFull] = useState(false)

  if (!text) return null

  // If maxLength is set and text is short enough, just show it
  if (maxLength && text.length <= maxLength) {
    return <span className="break-all">{text}</span>
  }

  // Estimate if text would overflow based on line count
  // Rough estimate: ~60 chars per line for most contexts
  const charsPerLine = 60
  const estimatedLines = Math.ceil(text.length / charsPerLine)
  const isLong = estimatedLines > maxLines || (maxLength && text.length > maxLength)

  if (!isLong) {
    return <span className="break-all">{text}</span>
  }

  // Truncate for display
  const displayText = maxLength
    ? text.slice(0, maxLength) + '...'
    : text.split('\n').slice(0, maxLines).join('\n') + '...'

  return (
    <>
      <span className="break-all">{displayText}</span>
      <button
        type="button"
        onClick={() => setShowFull(true)}
        className="inline-flex items-center gap-1 ml-1 text-blue-500 hover:text-blue-700 text-xs font-medium transition-colors"
      >
        Xem thêm
      </button>

      <Dialog open={showFull} onOpenChange={setShowFull}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {title || 'Chi tiết'}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 leading-relaxed py-2 break-all whitespace-pre-wrap overflow-hidden">
            {text}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
