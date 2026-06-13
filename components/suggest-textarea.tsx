'use client'

import { useEffect, useState, useRef } from 'react'

interface SuggestTextareaProps {
  id?: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  suggestions: string[]
  rows?: number
}

export function SuggestTextarea({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  suggestions,
  rows = 2,
}: SuggestTextareaProps) {
  const [showList, setShowList] = useState(false)
  const [filtered, setFiltered] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [userTyping, setUserTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ignoreBlurRef = useRef(false)
  const userClickedRef = useRef(false)

  const getFilteredSuggestions = () => {
    if (!userTyping || !value) {
      return suggestions
    }
    const lower = value.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(lower))
  }

  useEffect(() => {
    if (showList) {
      setFiltered(getFilteredSuggestions())
    } else {
      setFiltered([])
      setHighlightedIndex(-1)
      setUserTyping(false)
    }
  }, [value, showList, suggestions, userTyping])

  useEffect(() => {
    if (!showList || filtered.length === 0) {
      setHighlightedIndex(-1)
      return
    }
    setHighlightedIndex((current) => {
      if (current < 0) return -1
      return Math.min(current, filtered.length - 1)
    })
  }, [filtered, showList])

  const handleSelect = (item: string) => {
    ignoreBlurRef.current = true
    const syntheticEvent = {
      target: { name, value: item },
    } as React.ChangeEvent<HTMLTextAreaElement>
    onChange(syntheticEvent)
    setShowList(false)
    setHighlightedIndex(-1)
    setUserTyping(false)
    setTimeout(() => {
      ignoreBlurRef.current = false
      textareaRef.current?.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const currentSuggestions = getFilteredSuggestions()

    if (e.key === 'ArrowDown' && showList) {
      if (currentSuggestions.length === 0) return
      e.preventDefault()
      setFiltered(currentSuggestions)
      setHighlightedIndex((current) => {
        if (current < 0) return 0
        return (current + 1) % currentSuggestions.length
      })
      return
    }

    if (e.key === 'ArrowUp' && showList) {
      if (currentSuggestions.length === 0) return
      e.preventDefault()
      setFiltered(currentSuggestions)
      setHighlightedIndex((current) => {
        if (current < 0) return currentSuggestions.length - 1
        return (current - 1 + currentSuggestions.length) % currentSuggestions.length
      })
      return
    }

    if (e.key === 'Enter' && showList && highlightedIndex >= 0 && highlightedIndex < currentSuggestions.length) {
      e.preventDefault()
      handleSelect(currentSuggestions[highlightedIndex])
      return
    }

    if (e.key === 'Escape' && showList) {
      e.preventDefault()
      setShowList(false)
      setHighlightedIndex(-1)
      setUserTyping(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        rows={rows}
        onChange={(e) => {
          onChange(e)
          setShowList(true)
          setUserTyping(true)
          setHighlightedIndex(-1)
        }}
        onFocus={() => {
          if (userClickedRef.current) {
            setShowList(true)
            setUserTyping(false)
            setHighlightedIndex(-1)
          }
          userClickedRef.current = false
        }}
        onMouseDown={() => {
          userClickedRef.current = true
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (ignoreBlurRef.current) return
          setTimeout(() => {
            if (ignoreBlurRef.current) return
            setShowList(false)
            setHighlightedIndex(-1)
            setUserTyping(false)
            onBlur?.()
          }, 150)
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 resize-y"
      />
      {showList && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`w-full px-3 py-1.5 text-left text-sm truncate transition-colors ${
                index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 hover:text-blue-700'
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(item)
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
