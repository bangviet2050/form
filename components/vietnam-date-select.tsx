'use client'

interface VietnamDateSelectProps {
  value: string // YYYY-MM-DD
  onChange: (dateStr: string) => void
  className?: string
  required?: boolean
}

export function VietnamDateSelect({
  value,
  onChange,
  className = '',
  required = false,
}: VietnamDateSelectProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const parseParts = (dateStr: string) => {
    if (!dateStr) return { day: '', month: '', year: '' }
    const [y, m, d] = dateStr.split('-')
    return { year: y, month: m, day: d }
  }

  const { day, month, year } = parseParts(value)

  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31
    return new Date(Number(y), Number(m), 0).getDate()
  }

  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)

  const handleChange = (part: 'day' | 'month' | 'year', val: string) => {
    let newY = part === 'year' ? val : year || String(currentYear)
    let newM = part === 'month' ? val : month || '01'
    let newD = part === 'day' ? val : day || '01'

    // Clamp day if month/year changed
    const maxDay = getDaysInMonth(newY, newM)
    if (Number(newD) > maxDay) newD = String(maxDay)

    const dateStr = `${newY}-${newM.padStart(2, '0')}-${newD.padStart(2, '0')}`
    onChange(dateStr)
  }

  const selectClass = 'h-10 rounded-md border border-gray-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 hover:border-gray-300 cursor-pointer'

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <select
        value={day}
        onChange={(e) => handleChange('day', e.target.value)}
        className={`${selectClass} w-[62px]`}
        required={required}
      >
        <option value="" disabled>Ngày</option>
        {days.map((d) => (
          <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => handleChange('month', e.target.value)}
        className={`${selectClass} w-[76px]`}
        required={required}
      >
        <option value="" disabled>Tháng</option>
        {months.map((m) => (
          <option key={m} value={String(m).padStart(2, '0')}>T{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => handleChange('year', e.target.value)}
        className={`${selectClass} w-[76px]`}
        required={required}
      >
        <option value="" disabled>Năm</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  )
}
