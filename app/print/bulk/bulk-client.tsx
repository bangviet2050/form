'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* ── Types ── */
interface InvoiceData {
  ticketId: string; customerName: string; phone: string; receivedDate: string
  deviceType: string; deviceModel: string; accessories: string
  conditionBefore: string; conditionAfter: string; repairCost: string
  receivedBy: string; repairedBy: string; status: string
  returnedDate: string; printedAt: string; notes: string
}

type PaperKey = 'A4' | 'A5' | 'A6' | 'A7'
type FieldKey = 'ticketId' | 'receivedDate' | 'customerName' | 'phone' | 'deviceType' | 'deviceModel' | 'accessories' | 'conditionBefore' | 'conditionAfter' | 'repairCost' | 'receivedBy' | 'repairedBy' | 'status' | 'returnedDate' | 'printedAt' | 'notes' | 'signature' | 'shopInfo'

const FIELD_LABELS: Record<FieldKey, string> = {
  ticketId: 'Mã phiếu', receivedDate: 'Ngày nhận', customerName: 'Khách hàng', phone: 'SĐT',
  deviceType: 'Hiệu máy', deviceModel: 'Model', accessories: 'Phụ kiện',
  conditionBefore: 'Trước sửa', conditionAfter: 'Sau sửa', repairCost: 'Giá sửa',
  receivedBy: 'Người nhận', repairedBy: 'Người sửa', status: 'Trạng thái',
  returnedDate: 'Ngày trả', printedAt: 'Ngày in', notes: 'Ghi chú',
  signature: 'Chữ ký', shopInfo: 'Thông tin cửa hàng',
}

const DEFAULT_FIELDS: Record<FieldKey, boolean> = {
  ticketId: true, receivedDate: true, customerName: true, phone: true,
  deviceType: true, deviceModel: true, accessories: true,
  conditionBefore: true, conditionAfter: true, repairCost: true,
  receivedBy: true, repairedBy: true, status: true,
  returnedDate: true, printedAt: true, notes: true,
  signature: true, shopInfo: true,
}

interface ShopInfo { name: string; address: string; phone: string }
const DEFAULT_SHOP: ShopInfo = { name: 'CỬA HÀNG SỬA CHỮA ĐIỆN TỬ ABC', address: '123 Đường ABC, Quận 1, TP.HCM', phone: '0901 234 567' }

interface PaperTheme { label: string; size: string; maxWidth: string; padding: string; margin: string; title: string; subtitle: string; section: string; cell: string; nameHighlight: string; footer: string; cellPad: string; sectionGap: number; signatureHeight: number; labelW: string }

const THEMES: Record<PaperKey, PaperTheme> = {
  A4: { label: 'A4', size: 'A4', maxWidth: '210mm', padding: '12mm 14mm', margin: '10mm', title: '22px', subtitle: '13px', section: '14px', cell: '13px', nameHighlight: '20px', footer: '10px', cellPad: '7px 10px', sectionGap: 12, signatureHeight: 56, labelW: '28%' },
  A5: { label: 'A5', size: 'A5', maxWidth: '148mm', padding: '8mm 10mm', margin: '7mm', title: '15px', subtitle: '9px', section: '10px', cell: '9px', nameHighlight: '14px', footer: '7px', cellPad: '5px 7px', sectionGap: 8, signatureHeight: 39, labelW: '29%' },
  A6: { label: 'A6', size: 'A6', maxWidth: '105mm', padding: '6mm 7mm', margin: '5mm', title: '11px', subtitle: '7px', section: '7px', cell: '7px', nameHighlight: '10px', footer: '5px', cellPad: '3px 5px', sectionGap: 6, signatureHeight: 28, labelW: '31%' },
  A7: { label: 'A7', size: 'A7', maxWidth: '74mm', padding: '4mm 5mm', margin: '4mm', title: '8px', subtitle: '5px', section: '5px', cell: '5px', nameHighlight: '8px', footer: '4px', cellPad: '2px 3px', sectionGap: 4, signatureHeight: 20, labelW: '33%' },
}

const STORAGE_KEY = 'print-settings'
function loadSettings() {
  if (typeof window === 'undefined') return null
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}

/* ── Toggle ── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '4px 0', userSelect: 'none' }}>
      <span onClick={() => onChange(!checked)} style={{ width: '34px', height: '18px', borderRadius: '9px', position: 'relative', transition: 'background 0.2s', backgroundColor: checked ? '#2563eb' : '#d1d5db', flexShrink: 0, cursor: 'pointer' }}>
        <span style={{ position: 'absolute', top: '2px', left: checked ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
      </span>
      <span style={{ color: checked ? '#111827' : '#9ca3af' }}>{label}</span>
    </label>
  )
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '0 0 10px 0' }}>{title}</h3>
      {children}
    </div>
  )
}

/* ── Single invoice ── */
function InvoiceSheet({ data, cfg, f, shop, paper }: {
  data: InvoiceData; cfg: PaperTheme; f: Record<FieldKey, boolean>; shop: ShopInfo; paper: PaperKey
}) {
  const Row = ({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) => {
    const s = { border: '1px solid #111827', padding: cfg.cellPad, lineHeight: 1.35, wordBreak: 'break-word' as const, verticalAlign: 'top' as const }
    return <tr><td style={{ ...s, fontWeight: 700, width: cfg.labelW, whiteSpace: 'nowrap' as const }}>{label}</td><td className={highlight ? 'print-name' : undefined} style={{ ...s, fontWeight: highlight ? 700 : 400, letterSpacing: highlight ? '0.01em' : undefined }}>{children}</td></tr>
  }
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <div style={{ marginTop: cfg.sectionGap }}><p className="print-section" style={{ fontWeight: 700, margin: `0 0 ${cfg.sectionGap / 2}px 0`, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</p>{children}</div>
  const Tbl = ({ children }: { children: React.ReactNode }) => <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>{children}</table>

  return (
    <div className="print-sheet" style={{ width: '100%', maxWidth: cfg.maxWidth, margin: '0 auto 12px auto', backgroundColor: '#fff', border: '1px solid #111827', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: cfg.padding, boxSizing: 'border-box', pageBreakAfter: 'always' }}>
      <div style={{ textAlign: 'center', marginBottom: cfg.sectionGap }}>
        {f.shopInfo && <div style={{ marginBottom: '4px' }}><p className="print-subtitle" style={{ fontWeight: 700, margin: '0 0 1px 0' }}>{shop.name}</p><p style={{ margin: '0 0 1px 0', color: '#555' }}>{shop.address}</p><p style={{ margin: 0, color: '#555' }}>ĐT: {shop.phone}</p></div>}
        <div className="print-title" style={{ fontWeight: 700, margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>PHIẾU SỬA CHỮA</div>
      </div>

      {(paper === 'A4' || paper === 'A5') && (<>
        <Tbl><tbody>
          <tr>{f.ticketId && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>Mã phiếu</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.ticketId}</td></>}{f.receivedDate && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>Ngày nhận</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.receivedDate}</td></>}</tr>
          {f.customerName && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>Khách hàng</td><td className="print-name" style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, letterSpacing: '0.01em' }}>{data.customerName}</td>{f.phone && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>SĐT</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.phone}</td></>}</tr>}
        </tbody></Tbl>
        <div style={{ display: 'flex', gap: cfg.sectionGap, marginTop: cfg.sectionGap }} className="avoid-break">
          <div style={{ flex: 1 }}><Section title="Thiết bị"><Tbl><tbody>{f.deviceType && <Row label="Hiệu máy">{data.deviceType}</Row>}{f.deviceModel && <Row label="Model">{data.deviceModel}</Row>}{f.accessories && <Row label="Phụ kiện">{data.accessories}</Row>}</tbody></Tbl></Section></div>
          <div style={{ flex: 1 }}><Section title="Sửa chữa"><Tbl><tbody>{f.conditionBefore && <Row label="Trước sửa">{data.conditionBefore}</Row>}{f.conditionAfter && <Row label="Sau sửa">{data.conditionAfter}</Row>}{f.repairCost && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: cfg.labelW, whiteSpace: 'nowrap' }}>Giá sửa</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td></tr>}</tbody></Tbl></Section></div>
        </div>
        <div style={{ display: 'flex', gap: cfg.sectionGap, marginTop: cfg.sectionGap }} className="avoid-break">
          <div style={{ flex: 1 }}><Section title="Nhân sự"><Tbl><tbody>{f.receivedBy && <Row label="Người nhận">{data.receivedBy}</Row>}{f.repairedBy && <Row label="Người sửa">{data.repairedBy}</Row>}{f.status && <Row label="Trạng thái">{data.status}</Row>}</tbody></Tbl></Section></div>
          <div style={{ flex: 1 }}><Section title="Bàn giao"><Tbl><tbody>{f.returnedDate && <Row label="Ngày trả">{data.returnedDate}</Row>}{f.printedAt && <Row label="Ngày in">{data.printedAt}</Row>}</tbody></Tbl></Section></div>
        </div>
        {f.notes && <Section title="Ghi chú"><Tbl><tbody><tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, minHeight: '30px', whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>{data.notes || '..........................................................................'}</td></tr></tbody></Tbl></Section>}
      </>)}

      {paper === 'A6' && (<Tbl><tbody>
        {f.ticketId && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%' }}>Mã phiếu</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.ticketId}</td>{f.receivedDate && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%' }}>Ngày nhận</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.receivedDate}</td></>}</tr>}
        {f.customerName && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Khách hàng</td><td className="print-name" style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.customerName}</td>{f.phone && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>SĐT</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.phone}</td></>}</tr>}
        {f.deviceType && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Hiệu máy</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceType}</td>{f.deviceModel && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Model</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceModel}</td></>}</tr>}
        {f.conditionBefore && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trước sửa</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.conditionBefore}</td>{f.repairCost && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>Giá sửa</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td></>}</tr>}
        {f.status && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trạng thái</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.status}</td>{f.returnedDate && <><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Ngày trả</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.returnedDate}</td></>}</tr>}
      </tbody></Tbl>)}

      {paper === 'A7' && (<Tbl><tbody>
        {f.ticketId && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: cfg.labelW, whiteSpace: 'nowrap' }}>Mã</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.ticketId}</td></tr>}
        {f.customerName && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Khách</td><td className="print-name" style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.customerName}</td></tr>}
        {f.phone && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>SĐT</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.phone}</td></tr>}
        {f.deviceType && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Hiệu</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceType}</td></tr>}
        {f.deviceModel && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Model</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceModel}</td></tr>}
        {f.conditionBefore && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trước sửa</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.conditionBefore}</td></tr>}
        {f.repairCost && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>Giá sửa</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td></tr>}
        {f.status && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trạng thái</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.status}</td></tr>}
        {f.returnedDate && <tr><td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Ngày trả</td><td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.returnedDate}</td></tr>}
      </tbody></Tbl>)}

      {f.signature && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: cfg.sectionGap, gap: cfg.sectionGap }} className="avoid-break"><div style={{ flex: 1, textAlign: 'center' }}><div style={{ marginTop: cfg.signatureHeight, borderTop: '1px solid #111827', paddingTop: '2px', fontWeight: 700 }}>Người nhận</div></div><div style={{ flex: 1, textAlign: 'center' }}><div style={{ marginTop: cfg.signatureHeight, borderTop: '1px solid #111827', paddingTop: '2px', fontWeight: 700 }}>Người giao</div></div></div>}
      <div className="print-footer" style={{ marginTop: cfg.sectionGap, display: 'flex', justifyContent: 'space-between', fontStyle: 'italic', color: '#999' }}><span>In lúc: {data.printedAt}</span><span>Phiếu sửa chữa</span></div>
    </div>
  )
}

/* ── Main ── */
export default function BulkPrintClient({ invoices }: { invoices: InvoiceData[] }) {
  const router = useRouter()
  const [paper, setPaper] = useState<PaperKey>('A5')
  const [fields, setFields] = useState<Record<FieldKey, boolean>>(DEFAULT_FIELDS)
  const [shop, setShop] = useState<ShopInfo>(DEFAULT_SHOP)
  const [loaded, setLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = loadSettings()
    if (saved) { setPaper(saved.paper); setFields({ ...DEFAULT_FIELDS, ...saved.fields }); setShop({ ...DEFAULT_SHOP, ...saved.shop }) }
    setLoaded(true)
  }, [])

  const cfg = THEMES[paper]
  const f = fields
  const toggleField = (key: FieldKey) => setFields(prev => ({ ...prev, [key]: !prev[key] }))
  const inputStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      const next = Math.round((prev + delta) * 100) / 100
      return Math.min(3, Math.max(0.2, next))
    })
  }, [])

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', boxSizing: 'border-box', fontFamily: '"Times New Roman", Times, serif', color: '#111827', display: 'flex', flexDirection: 'column' }}>
      <style key={`print-${paper}`}>{`
        @page { size: ${cfg.size}; margin: ${cfg.margin}; }
        .print-sheet table, .print-sheet td, .print-sheet th, .print-sheet p, .print-sheet div, .print-sheet span { font-size: ${cfg.cell} !important; line-height: 1.35; }
        .print-sheet .print-title { font-size: ${cfg.title} !important; }
        .print-sheet .print-subtitle { font-size: ${cfg.subtitle} !important; }
        .print-sheet .print-section { font-size: ${cfg.section} !important; }
        .print-sheet .print-name { font-size: ${cfg.nameHighlight} !important; }
        .print-sheet .print-footer { font-size: ${cfg.footer} !important; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { background: #fff !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-sheet { width: auto !important; max-width: none !important; margin: 0 !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={() => router.back()} style={{
            appearance: 'none', border: '1px solid #e5e7eb', backgroundColor: '#fff',
            color: '#374151', padding: '6px 12px', borderRadius: '8px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            Quay lại
          </button>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>|</span>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>In nhiều phiếu</span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>|</span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>{invoices.length} phiếu đã chọn</span>
        </div>
        <button type="button" onClick={() => window.print()} style={{
          appearance: 'none', border: 'none', backgroundColor: '#2563eb', color: '#fff', padding: '8px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          In tất cả ({invoices.length})
        </button>
      </div>

      {/* Body: left + right */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Settings */}
        <div className="no-print" style={{ width: '320px', minWidth: '320px', backgroundColor: '#fff', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '20px' }}>
          <SidebarSection title="Khổ giấy">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
              {(['A4', 'A5', 'A6', 'A7'] as PaperKey[]).map(k => (
                <button key={k} type="button" onClick={() => setPaper(k)} style={{
                  appearance: 'none', border: `2px solid ${paper === k ? '#2563eb' : '#e5e7eb'}`,
                  backgroundColor: paper === k ? '#eff6ff' : '#fff', color: paper === k ? '#2563eb' : '#374151',
                  padding: '8px 0', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>{k}</button>
              ))}
            </div>
          </SidebarSection>

          <SidebarSection title="Thông tin cửa hàng">
            <Toggle label="Hiện thông tin cửa hàng" checked={f.shopInfo} onChange={() => toggleField('shopInfo')} />
            {f.shopInfo && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input value={shop.name} onChange={e => setShop(s => ({ ...s, name: e.target.value }))} placeholder="Tên cửa hàng" style={inputStyle} />
                <input value={shop.address} onChange={e => setShop(s => ({ ...s, address: e.target.value }))} placeholder="Địa chỉ" style={inputStyle} />
                <input value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))} placeholder="SĐT cửa hàng" style={inputStyle} />
              </div>
            )}
          </SidebarSection>

          <SidebarSection title="Hiển thị trường">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {(Object.keys(FIELD_LABELS) as FieldKey[]).filter(k => k !== 'shopInfo').map(key => (
                <Toggle key={key} label={FIELD_LABELS[key]} checked={f[key]} onChange={() => toggleField(key)} />
              ))}
            </div>
          </SidebarSection>
        </div>

        {/* Right: Preview */}
        <div ref={previewRef} onWheel={handleWheel} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '24px', backgroundColor: '#f3f4f6', position: 'relative' }}>
          {/* Zoom controls */}
          <div className="no-print" style={{
            position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: '8px 0', marginBottom: '8px',
          }}>
            <button type="button" onClick={() => setZoom(z => Math.max(0.3, Math.round((z - 0.1) * 10) / 10))} style={{
              appearance: 'none', border: '1px solid #d1d5db', backgroundColor: '#fff',
              color: '#374151', width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
              alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>−</button>
            <span style={{
              fontSize: '13px', fontWeight: 600, color: '#374151', minWidth: '48px', textAlign: 'center',
              backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px',
            }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(z => Math.min(3, Math.round((z + 0.1) * 10) / 10))} style={{
              appearance: 'none', border: '1px solid #d1d5db', backgroundColor: '#fff',
              color: '#374151', width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
              alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>+</button>
            <button type="button" onClick={() => setZoom(1)} style={{
              appearance: 'none', border: '1px solid #d1d5db', backgroundColor: '#fff',
              color: '#374151', height: '32px', borderRadius: '6px', fontSize: '12px',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '0 10px',
            }}>Vừa</button>
          </div>

          <div style={{ transformOrigin: 'top center', transform: `scale(${zoom})` }}>
          {invoices.map((inv, i) => (
            <InvoiceSheet key={i} data={inv} cfg={cfg} f={f} shop={shop} paper={paper} />
          ))}
          </div>
        </div>
      </div>
    </main>
  )
}
