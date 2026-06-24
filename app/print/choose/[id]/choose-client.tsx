'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* ── Types ── */
interface AllData {
  id: number; ticketId: string; customerName: string; phone: string; receivedDate: string
  deviceType: string; deviceModel: string; accessories: string
  conditionBefore: string; conditionAfter: string; repairCost: string
  receivedBy: string; repairedBy: string; status: string
  returnedDate: string; printedAt: string; notes: string
}

type FieldKey =
  | 'ticketId' | 'receivedDate' | 'customerName' | 'phone'
  | 'deviceType' | 'deviceModel' | 'accessories'
  | 'conditionBefore' | 'conditionAfter' | 'repairCost'
  | 'receivedBy' | 'repairedBy' | 'status'
  | 'returnedDate' | 'printedAt' | 'notes'
  | 'signature' | 'shopInfo'

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
const DEFAULT_SHOP: ShopInfo = {
  name: 'CỬA HÀNG MÁY TÍNH THÀNH PHƯỚC',
  address: 'QL30, Ấp An Lạc, Xã An Bình, H.Cao Lãnh, Đồng Tháp',
  phone: '0979815815',
}

/* ── A5 config ── */
const A5 = {
  maxWidth: '148mm', padding: '5mm 7mm', margin: '5mm',
  title: '18px', subtitle: '12px', section: '13px', cell: '12px',
  nameHighlight: '16px', footer: '10px',
  cellPad: '4px 6px', gap: 5, sigH: 40, labelW: '30%',
}

/* ── localStorage ── */
const STORAGE_KEY = 'print-settings-v2'
interface PrintSettings { fields: Record<FieldKey, boolean>; shop: ShopInfo }
function loadSettings(): PrintSettings | null {
  if (typeof window === 'undefined') return null
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null }
}
function saveSettings(s: PrintSettings) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

/* ── Sub-components ── */
function Row({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  const s = { border: '1px solid #111827', padding: A5.cellPad, lineHeight: 1.35, wordBreak: 'break-word' as const, verticalAlign: 'top' as const }
  return (
    <tr>
      <td style={{ ...s, fontWeight: 700, width: A5.labelW, whiteSpace: 'nowrap' as const }}>{label}</td>
      <td className={highlight ? 'print-name' : undefined} style={{ ...s, fontWeight: highlight ? 700 : 400, letterSpacing: highlight ? '0.01em' : undefined }}>{children}</td>
    </tr>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: A5.gap }}>
      <p className="print-section" style={{ fontWeight: 700, margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</p>
      {children}
    </div>
  )
}

function Tbl({ children }: { children: React.ReactNode }) {
  return <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>{children}</table>
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '4px 0', userSelect: 'none' }}>
      <span onClick={() => onChange(!checked)} style={{
        width: '34px', height: '18px', borderRadius: '9px', position: 'relative', transition: 'background 0.2s',
        backgroundColor: checked ? '#2563eb' : '#d1d5db', flexShrink: 0, cursor: 'pointer',
      }}>
        <span style={{
          position: 'absolute', top: '2px', left: checked ? '16px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }} />
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

/* ═══════════════════════════════════════════════════════════
   PHIẾU SỬA CHỮA (Repair Invoice)
   ═══════════════════════════════════════════════════════════ */
function RepairForm({ data, f, shop }: { data: AllData; f: Record<FieldKey, boolean>; shop: ShopInfo }) {
  return (
    <div className="repair-sheet" style={{
      width: '100%', maxWidth: A5.maxWidth,
      backgroundColor: '#ffffff', border: '1px solid #111827',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: A5.padding,
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: A5.gap }}>
        {f.shopInfo && (
          <div style={{ marginBottom: '3px' }}>
            <p className="print-subtitle" style={{ fontWeight: 700, margin: '0 0 1px 0' }}>{shop.name}</p>
            <p style={{ margin: '0 0 1px 0', color: '#555' }}>{shop.address}</p>
            <p style={{ margin: 0, color: '#555' }}>ĐT: {shop.phone}</p>
          </div>
        )}
        <div className="print-title" style={{ fontWeight: 700, margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          PHIẾU SỬA CHỮA
        </div>
      </div>

      <Tbl><tbody>
        {f.ticketId && <Row label="Mã phiếu">{data.ticketId}</Row>}
        {f.receivedDate && <Row label="Ngày nhận">{data.receivedDate}</Row>}
        {f.customerName && <Row label="Khách hàng" highlight>{data.customerName}</Row>}
        {f.phone && <Row label="Số điện thoại">{data.phone}</Row>}
      </tbody></Tbl>

      <Section title="Thông tin thiết bị">
        <Tbl><tbody>
          {f.deviceType && <Row label="Hiệu máy">{data.deviceType}</Row>}
          {f.deviceModel && <Row label="Model">{data.deviceModel}</Row>}
          {f.accessories && <Row label="Phụ kiện">{data.accessories}</Row>}
        </tbody></Tbl>
      </Section>

      <Section title="Thông tin sửa chữa">
        <Tbl><tbody>
          {f.conditionBefore && <Row label="Trước khi sửa">{data.conditionBefore}</Row>}
          {f.conditionAfter && <Row label="Sau khi sửa">{data.conditionAfter}</Row>}
          {f.repairCost && <tr>
            <td style={{ border: '1px solid #111827', padding: A5.cellPad, fontWeight: 700, width: A5.labelW, whiteSpace: 'nowrap' }}>Giá sửa</td>
            <td className="print-cost" style={{ border: '1px solid #111827', padding: A5.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td>
          </tr>}
        </tbody></Tbl>
      </Section>

      <Section title="Nhân sự & Bàn giao">
        <Tbl><tbody>
          {f.receivedBy && <Row label="Người nhận">{data.receivedBy}</Row>}
          {f.repairedBy && <Row label="Người sửa">{data.repairedBy}</Row>}
          {f.status && <Row label="Trạng thái">{data.status}</Row>}
          {f.returnedDate && <Row label="Ngày trả">{data.returnedDate}</Row>}
          {f.printedAt && <Row label="Ngày in">{data.printedAt}</Row>}
        </tbody></Tbl>
      </Section>

      {f.notes && (
        <Section title="Ghi chú">
          <Tbl><tbody>
            <tr>
              <td style={{ border: '1px solid #111827', padding: A5.cellPad, minHeight: '25px', whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>
                {data.notes || '..........................................................................'}
              </td>
            </tr>
          </tbody></Tbl>
        </Section>
      )}

      {f.signature && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: A5.gap, gap: A5.gap }} className="avoid-break">
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginTop: A5.sigH, borderTop: '1px solid #111827', paddingTop: '2px', fontWeight: 700 }}>Người nhận</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginTop: A5.sigH, borderTop: '1px solid #111827', paddingTop: '2px', fontWeight: 700 }}>Người giao</div>
          </div>
        </div>
      )}

      <div className="print-footer" style={{ marginTop: A5.gap, display: 'flex', justifyContent: 'space-between', fontStyle: 'italic', color: '#999' }}>
        <span>In lúc: {data.printedAt}</span>
        <span>Phiếu sửa chữa</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PHIẾU TIẾP NHẬN (Reception Form)
   ═══════════════════════════════════════════════════════════ */
function ReceptionForm({ data }: { data: AllData }) {
  const today = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date())

  const deviceText = [data.deviceType, data.deviceModel].filter(Boolean).join(' - ')

  return (
    <div className="reception-sheet" style={{
      width: '100%', maxWidth: A5.maxWidth, backgroundColor: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      padding: A5.padding, boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 1px 0', textTransform: 'uppercase' }}>
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </p>
        <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
          Độc lập - Tự do - Hạnh phúc
        </p>
        <div style={{ width: '160px', height: '1px', backgroundColor: '#111827', margin: '0 auto 3px auto' }} />
      </div>

      {/* Title */}
      <h1 style={{ textAlign: 'center', fontWeight: 700, fontSize: '17px', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0', whiteSpace: 'nowrap' }}>
        PHIẾU TIẾP NHẬN THIẾT BỊ VÀ ĐIỀU KHOẢN DỊCH VỤ
      </h1>
      <p style={{ textAlign: 'center', fontSize: '14px', margin: '0 0 8px 0', color: '#333' }}>
        Mã phiếu: <strong>{data.ticketId}</strong>
      </p>

      {/* Customer info */}
      <div style={{ marginBottom: '6px' }}>
        <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
          Thông tin khách hàng:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, width: '34%', whiteSpace: 'nowrap' }}>Họ và tên</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px' }}>{data.customerName}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>Số điện thoại</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px' }}>{data.phone}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>Tên thiết bị / Model</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px' }}>{deviceText || '................................'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>Phụ kiện kèm theo</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px' }}>{data.accessories || '................................'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'top' }}>Tình trạng tiếp nhận</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', minHeight: '35px', whiteSpace: 'pre-wrap' }}>
                {data.conditionBefore || '................................'}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>Ngày tiếp nhận</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px' }}>{data.receivedDate}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #111827', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>Nhân viên tiếp nhận</td>
              <td style={{ border: '1px solid #111827', padding: '4px 6px' }}>{data.receivedBy || '................................'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terms */}
      <div style={{ marginBottom: '6px' }}>
        <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 3px 0', textTransform: 'uppercase' }}>
          Điều khoản về bản quyền phần mềm
        </p>
        <p style={{ fontSize: '13px', fontStyle: 'italic', margin: '0 0 5px 0', color: '#555' }}>
          (Khách hàng vui lòng đọc kỹ trước khi ký tên)
        </p>

        <p style={{ fontSize: '13px', margin: '0 0 6px 0', lineHeight: 1.5, textAlign: 'justify' }}>
          Cửa hàng chỉ thực hiện dịch vụ kiểm tra, sửa chữa phần cứng và/hoặc cài đặt hệ điều hành, phần mềm ở dạng <strong>nguyên bản, chưa kích hoạt (bản dùng thử/Trial)</strong> theo đúng quy định của nhà sản xuất.
        </p>
        <p style={{ fontSize: '13px', margin: '0 0 6px 0', lineHeight: 1.5, textAlign: 'justify' }}>
          Cửa hàng <strong>TUYỆT ĐỐI KHÔNG</strong> cung cấp, cài đặt các công cụ bẻ khóa, bẻ khóa bản quyền (Crack, Patch, Keygen...) cho thiết bị.
        </p>
        <p style={{ fontSize: '13px', margin: '0 0 6px 0', lineHeight: 1.5, textAlign: 'justify' }}>
          Khách hàng có trách nhiệm tự trang bị bản quyền (License/Product Key) hợp pháp để kích hoạt và sử dụng phần mềm. Cửa hàng hoàn toàn được miễn trừ mọi trách nhiệm pháp lý liên quan đến vấn đề bản quyền phần mềm trên thiết bị của khách hàng trong và sau quá trình làm dịch vụ.
        </p>
      </div>

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <div style={{ textAlign: 'center', minWidth: '200px' }}>
          <p style={{ fontSize: '14px', margin: '0 0 1px 0' }}>Ngày {today}</p>
          <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 1px 0' }}>Xác nhận của khách hàng</p>
          <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#555', margin: '0 0 2px 0' }}>(Ký, ghi rõ họ tên)</p>
          <div style={{ height: '30px' }} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN — Unified Print Page
   ═══════════════════════════════════════════════════════════ */
export default function ChooseClient({ data }: { data: AllData }) {
  const [tab, setTab] = useState<'repair' | 'reception'>('repair')
  const [fields, setFields] = useState<Record<FieldKey, boolean>>(DEFAULT_FIELDS)
  const [shop, setShop] = useState<ShopInfo>(DEFAULT_SHOP)
  const [loaded, setLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = loadSettings()
    if (saved) {
      setFields({ ...DEFAULT_FIELDS, ...saved.fields })
      setShop({ ...DEFAULT_SHOP, ...saved.shop })
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveSettings({ fields, shop })
  }, [fields, shop, loaded])

  const f = fields
  const toggleField = (key: FieldKey) => setFields(prev => ({ ...prev, [key]: !prev[key] }))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      const next = Math.round((prev + delta) * 100) / 100
      return Math.min(3, Math.max(0.2, next))
    })
  }, [])

  const inputStyle = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '7px 10px',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none', transition: 'border 0.15s',
    boxSizing: 'border-box' as const,
  }

  return (
    <main style={{
      minHeight: '100vh', backgroundColor: '#f3f4f6',
      boxSizing: 'border-box', fontFamily: '"Times New Roman", Times, serif', color: '#111827',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @page { size: A5; margin: 5mm; }
        .repair-sheet table, .repair-sheet td, .repair-sheet th,
        .repair-sheet p, .repair-sheet div, .repair-sheet span {
          font-size: 12px !important; line-height: 1.35;
        }
        .repair-sheet .print-title { font-size: 18px !important; }
        .repair-sheet .print-subtitle { font-size: 12px !important; }
        .repair-sheet .print-section { font-size: 14px !important; }
        .repair-sheet .print-name { font-size: 16px !important; }
        .repair-sheet .print-cost { font-size: 16px !important; }
        .repair-sheet .print-footer { font-size: 10px !important; }
        .form-hidden { display: none !important; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; height: auto !important; overflow: hidden !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { background: #fff !important; padding: 0 !important; }
          main * { background: #fff !important; }
          .print-shell { padding: 0 !important; transform: none !important; }
          .repair-sheet, .reception-sheet { width: auto !important; max-width: none !important; margin: 0 !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .form-hidden { display: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* ═══ TOP BAR ═══ */}
      <div className="no-print" style={{
        backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>{data.ticketId} — {data.customerName}</span>
        </div>
        <button type="button" onClick={() => window.print()} style={{
          appearance: 'none', border: 'none', backgroundColor: '#2563eb',
          color: '#fff', padding: '8px 24px', borderRadius: '8px', fontSize: '14px',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          In phiếu
        </button>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div className="no-print" style={{
        backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px',
        display: 'flex', gap: '4px', flexShrink: 0,
      }}>
        <button type="button" onClick={() => setTab('repair')} style={{
          appearance: 'none', border: 'none', backgroundColor: tab === 'repair' ? '#eff6ff' : 'transparent',
          color: tab === 'repair' ? '#2563eb' : '#6b7280',
          padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          borderBottom: tab === 'repair' ? '2px solid #2563eb' : '2px solid transparent',
          display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
          Phiếu sửa chữa
        </button>
        <button type="button" onClick={() => setTab('reception')} style={{
          appearance: 'none', border: 'none', backgroundColor: tab === 'reception' ? '#ecfdf5' : 'transparent',
          color: tab === 'reception' ? '#059669' : '#6b7280',
          padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          borderBottom: tab === 'reception' ? '2px solid #059669' : '2px solid transparent',
          display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
          Phiếu tiếp nhận
        </button>
      </div>

      {/* ═══ BODY: LEFT + RIGHT ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT: Settings (only for repair form) ── */}
        {tab === 'repair' && (
          <div className="no-print" style={{
            width: '320px', minWidth: '320px', backgroundColor: '#fff',
            borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '20px',
          }}>
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
        )}

        {/* ── RIGHT: Preview ── */}
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

          {/* Print shell — only visible form is shown, hidden form uses form-hidden class */}
          <div className="print-shell" style={{ display: 'flex', justifyContent: 'center', transformOrigin: 'top center', transform: `scale(${zoom})` }}>
            <div className={tab === 'repair' ? '' : 'form-hidden'}>
              <RepairForm data={data} f={f} shop={shop} />
            </div>
            <div className={tab === 'reception' ? '' : 'form-hidden'}>
              <ReceptionForm data={data} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
