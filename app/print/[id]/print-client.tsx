'use client'

import { useState } from 'react'

/* ── Types ── */
interface InvoiceData {
  ticketId: string
  customerName: string
  phone: string
  receivedDate: string
  deviceType: string
  deviceModel: string
  accessories: string
  conditionBefore: string
  conditionAfter: string
  repairCost: string
  receivedBy: string
  repairedBy: string
  status: string
  returnedDate: string
  printedAt: string
  notes: string
}

type PaperKey = 'A4' | 'A5' | 'A6' | 'A7'

interface PaperTheme {
  label: string
  size: string
  maxWidth: string
  padding: string
  margin: string
  /* typography (px strings) */
  title: string
  subtitle: string
  section: string
  cell: string
  nameHighlight: string
  footer: string
  /* spacing */
  cellPad: string
  sectionGap: number
  signatureHeight: number
  /* layout */
  columns: 1 | 2
  showShopName: boolean
  showSubtitle: boolean
  showNotes: boolean
  showConditionAfter: boolean
  showPrintDate: boolean
  labelW: string
}

const THEMES: Record<PaperKey, PaperTheme> = {
  A4: {
    label: 'A4', size: 'A4', maxWidth: '210mm', padding: '12mm 14mm', margin: '10mm',
    title: '22px', subtitle: '13px', section: '14px', cell: '13px', nameHighlight: '20px', footer: '10px',
    cellPad: '7px 10px', sectionGap: 12, signatureHeight: 56,
    columns: 2, showShopName: true, showSubtitle: true, showNotes: true, showConditionAfter: true, showPrintDate: true,
    labelW: '28%',
  },
  A5: {
    label: 'A5', size: 'A5', maxWidth: '148mm', padding: '8mm 10mm', margin: '7mm',
    title: '15px', subtitle: '9px', section: '10px', cell: '9px', nameHighlight: '14px', footer: '7px',
    cellPad: '5px 7px', sectionGap: 8, signatureHeight: 39,
    columns: 2, showShopName: true, showSubtitle: true, showNotes: true, showConditionAfter: true, showPrintDate: true,
    labelW: '29%',
  },
  A6: {
    label: 'A6', size: 'A6', maxWidth: '105mm', padding: '6mm 7mm', margin: '5mm',
    title: '11px', subtitle: '7px', section: '7px', cell: '7px', nameHighlight: '10px', footer: '5px',
    cellPad: '3px 5px', sectionGap: 6, signatureHeight: 28,
    columns: 2, showShopName: true, showSubtitle: false, showNotes: true, showConditionAfter: false, showPrintDate: true,
    labelW: '31%',
  },
  A7: {
    label: 'A7', size: 'A7', maxWidth: '74mm', padding: '4mm 5mm', margin: '4mm',
    title: '8px', subtitle: '5px', section: '5px', cell: '5px', nameHighlight: '8px', footer: '4px',
    cellPad: '2px 3px', sectionGap: 4, signatureHeight: 20,
    columns: 1, showShopName: false, showSubtitle: false, showNotes: false, showConditionAfter: false, showPrintDate: false,
    labelW: '33%',
  },
}

/* ── Reusable sub-components ── */

function Row({ cfg, label, children, wide, highlight }: {
  cfg: PaperTheme; label: string; children: React.ReactNode; wide?: boolean; highlight?: boolean
}) {
  const s = {
    border: '1px solid #111827',
    padding: cfg.cellPad,
    lineHeight: 1.35,
    wordBreak: 'break-word' as const,
    verticalAlign: 'top' as const,
  }
  return (
    <tr>
      <td style={{
        ...s,
        fontWeight: 700,
        width: wide ? '22%' : cfg.labelW,
        whiteSpace: 'nowrap' as const,
      }}>{label}</td>
      <td className={highlight ? 'print-name' : undefined} style={{
        ...s,
        fontWeight: highlight ? 700 : 400,
        letterSpacing: highlight ? '0.01em' : undefined,
      }}>{children}</td>
    </tr>
  )
}

function Section({ cfg, title, children }: { cfg: PaperTheme; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: cfg.sectionGap }}>
      <p className="print-section" style={{ fontWeight: 700, margin: `0 0 ${cfg.sectionGap / 2}px 0`, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</p>
      {children}
    </div>
  )
}

function Table({ children }: { children: React.ReactNode }) {
  return <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>{children}</table>
}

/* ── Main ── */

export default function PrintClient({ data }: { data: InvoiceData }) {
  const [paper, setPaper] = useState<PaperKey>('A5')
  const cfg = THEMES[paper]

  return (
    <main style={{
      minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px 8px',
      boxSizing: 'border-box', fontFamily: '"Times New Roman", Times, serif', color: '#111827',
    }}>
      <style key={`print-${paper}`}>{`
        @page { size: ${cfg.size}; margin: ${cfg.margin}; }

        /* Override Tailwind reset for print page */
        .print-sheet table,
        .print-sheet td,
        .print-sheet th,
        .print-sheet p,
        .print-sheet div,
        .print-sheet span {
          font-size: ${cfg.cell} !important;
          line-height: 1.35;
        }
        .print-sheet .print-title { font-size: ${cfg.title} !important; }
        .print-sheet .print-subtitle { font-size: ${cfg.subtitle} !important; }
        .print-sheet .print-section { font-size: ${cfg.section} !important; }
        .print-sheet .print-name { font-size: ${cfg.nameHighlight} !important; }
        .print-sheet .print-footer { font-size: ${cfg.footer} !important; }

        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { background: #fff !important; padding: 0 !important; }
          .print-shell { padding: 0 !important; }
          .print-sheet { width: auto !important; max-width: none !important; margin: 0 !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* ── Controls ── */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '12px',
      }}>
        {(['A4', 'A5', 'A6', 'A7'] as PaperKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setPaper(k)}
            style={{
              appearance: 'none',
              border: `1px solid ${paper === k ? '#111827' : '#d1d5db'}`,
              backgroundColor: paper === k ? '#111827' : '#fff',
              color: paper === k ? '#fff' : '#374151',
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            appearance: 'none', border: '1px solid #1d4ed8', backgroundColor: '#1d4ed8',
            color: '#fff', padding: '6px 16px', borderRadius: '6px', fontFamily: 'inherit',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginLeft: '4px',
          }}
        >
          In phiếu
        </button>
      </div>

      {/* ── Sheet ── */}
      <div className="print-shell">
        <div key={`sheet-${paper}`} className="print-sheet" style={{
          width: '100%', maxWidth: cfg.maxWidth, margin: '0 auto',
          backgroundColor: '#ffffff', border: '1px solid #111827',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: cfg.padding,
          boxSizing: 'border-box',
        }}>

          {/* ═══ HEADER ═══ */}
          <div style={{ textAlign: 'center', marginBottom: cfg.sectionGap }}>
            {cfg.showShopName && (
              <p className="print-subtitle" style={{ fontWeight: 700, margin: '0 0 2px 0' }}>
                CỬA HÀNG SỬA CHỮA ĐIỆN TỬ ABC
              </p>
            )}
            <div className="print-title" style={{
              fontWeight: 700, margin: 0,
              letterSpacing: '0.03em', textTransform: 'uppercase',
            }}>
              PHIẾU SỬA CHỮA
            </div>
            {cfg.showSubtitle && (
              <p className="print-subtitle" style={{ margin: '2px 0 0 0', color: '#555' }}>
                Tiếp nhận – Sửa chữa – Bàn giao
              </p>
            )}
          </div>

          {/* ═══ A4 / A5: Full 2-column layout ═══ */}
          {(paper === 'A4' || paper === 'A5') && (
            <>
              {/* Mã phiếu + Ngày nhận */}
              <Table><tbody>
                <tr>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>Mã phiếu</td>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.ticketId}</td>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>Ngày nhận</td>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.receivedDate}</td>
                </tr>
              </tbody></Table>

              {/* Khách hàng nổi bật */}
              <Table><tbody>
                <tr>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>Khách hàng</td>
                  <td className="print-name" style={{
                    border: '1px solid #111827', padding: cfg.cellPad,
                    fontWeight: 700, letterSpacing: '0.01em',
                  }}>{data.customerName}</td>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%', whiteSpace: 'nowrap' }}>SĐT</td>
                  <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.phone}</td>
                </tr>
              </tbody></Table>

              {/* Thiết bị + Sửa chữa */}
              <div style={{ display: 'flex', gap: cfg.sectionGap, marginTop: cfg.sectionGap }} className="avoid-break">
                <div style={{ flex: 1 }}>
                  <Section cfg={cfg} title="Thiết bị">
                    <Table><tbody>
                      <Row cfg={cfg} label="Hiệu máy">{data.deviceType}</Row>
                      <Row cfg={cfg} label="Model">{data.deviceModel}</Row>
                      <Row cfg={cfg} label="Phụ kiện">{data.accessories}</Row>
                    </tbody></Table>
                  </Section>
                </div>
                <div style={{ flex: 1 }}>
                  <Section cfg={cfg} title="Sửa chữa">
                    <Table><tbody>
                      <Row cfg={cfg} label="Trước sửa">{data.conditionBefore}</Row>
                      {cfg.showConditionAfter && <Row cfg={cfg} label="Sau sửa">{data.conditionAfter}</Row>}
                      <tr>
                        <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: cfg.labelW, whiteSpace: 'nowrap' }}>Giá sửa</td>
                        <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td>
                      </tr>
                    </tbody></Table>
                  </Section>
                </div>
              </div>

              {/* Nhân sự + Bàn giao */}
              <div style={{ display: 'flex', gap: cfg.sectionGap, marginTop: cfg.sectionGap }} className="avoid-break">
                <div style={{ flex: 1 }}>
                  <Section cfg={cfg} title="Nhân sự">
                    <Table><tbody>
                      <Row cfg={cfg} label="Người nhận">{data.receivedBy}</Row>
                      <Row cfg={cfg} label="Người sửa">{data.repairedBy}</Row>
                      <Row cfg={cfg} label="Trạng thái">{data.status}</Row>
                    </tbody></Table>
                  </Section>
                </div>
                <div style={{ flex: 1 }}>
                  <Section cfg={cfg} title="Bàn giao">
                    <Table><tbody>
                      <Row cfg={cfg} label="Ngày trả">{data.returnedDate}</Row>
                      {cfg.showPrintDate && <Row cfg={cfg} label="Ngày in">{data.printedAt}</Row>}
                    </tbody></Table>
                  </Section>
                </div>
              </div>

              {/* Ghi chú */}
              {cfg.showNotes && (
                <Section cfg={cfg} title="Ghi chú">
                  <Table><tbody>
                    <tr>
                      <td style={{
                        border: '1px solid #111827', padding: cfg.cellPad,
                        minHeight: '30px', whiteSpace: 'pre-wrap', lineHeight: 1.35,
                      }}>
                        {data.notes || '..........................................................................'}
                      </td>
                    </tr>
                  </tbody></Table>
                </Section>
              )}
            </>
          )}

          {/* ═══ A6: Compact single table ═══ */}
          {paper === 'A6' && (
            <Table><tbody>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%' }}>Mã phiếu</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.ticketId}</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: '22%' }}>Ngày nhận</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.receivedDate}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Khách hàng</td>
                <td className="print-name" style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.customerName}</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>SĐT</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.phone}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Hiệu máy</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceType}</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Model</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceModel}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trước sửa</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.conditionBefore}</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>Giá sửa</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trạng thái</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.status}</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Ngày trả</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.returnedDate}</td>
              </tr>
            </tbody></Table>
          )}

          {/* ═══ A7: Ultra-compact single column ═══ */}
          {paper === 'A7' && (
            <Table><tbody>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, width: cfg.labelW, whiteSpace: 'nowrap' }}>Mã</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.ticketId}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Khách</td>
                <td className="print-name" style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.customerName}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>SĐT</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.phone}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Hiệu</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceType}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Model</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.deviceModel}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Phụ kiện</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.accessories}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trước sửa</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.conditionBefore}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>Giá sửa</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700, color: '#b91c1c' }}>{data.repairCost}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Trạng thái</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>{data.status}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad, fontWeight: 700 }}>Ngày trả</td>
                <td style={{ border: '1px solid #111827', padding: cfg.cellPad }}>{data.returnedDate}</td>
              </tr>
            </tbody></Table>
          )}

          {/* ═══ CHỮ KÝ ═══ */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: cfg.sectionGap, gap: cfg.sectionGap,
          }} className="avoid-break">
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                marginTop: cfg.signatureHeight, borderTop: '1px solid #111827',
                paddingTop: '2px', fontWeight: 700,
              }}>
                Người nhận
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                marginTop: cfg.signatureHeight, borderTop: '1px solid #111827',
                paddingTop: '2px', fontWeight: 700,
              }}>
                Người giao
              </div>
            </div>
          </div>

          {/* ═══ FOOTER ═══ */}
          <div className="print-footer" style={{
            marginTop: cfg.sectionGap, display: 'flex', justifyContent: 'space-between',
            fontStyle: 'italic', color: '#999',
          }}>
            <span>In lúc: {data.printedAt}</span>
            <span>Phiếu sửa chữa</span>
          </div>
        </div>
      </div>
    </main>
  )
}
