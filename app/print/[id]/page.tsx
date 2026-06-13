import type { CSSProperties } from 'react'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PrintInvoicePageProps {
  params: Promise<{
    id: string
  }>
}

function formatVietnamDateTime(date: string | Date | null | undefined) {
  if (!date) return '-'

  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return '-'

  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return formatter.format(parsedDate)
}

function formatCurrencyVND(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'

  const numericValue = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numericValue)) return '-'

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numericValue)
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Chờ sửa',
    repairing: 'Đang sửa',
    completed: 'Xong',
    returned: 'Đã trả máy',
  }

  return map[status] || status
}

export default async function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/sign-in')
  }

  const { id } = await params
  const customerId = Number.parseInt(id, 10)

  if (Number.isNaN(customerId)) {
    notFound()
  }

  // Admin can print any customer's invoice; staff only their own
  const whereCondition = session.user.role === 'admin'
    ? eq(customers.id, customerId)
    : and(eq(customers.id, customerId), eq(customers.userId, session.user.id))

  const result = await db
    .select()
    .from(customers)
    .where(whereCondition)
    .limit(1)

  const customer = result[0]

  if (!customer) {
    notFound()
  }

  const printedAt = formatVietnamDateTime(new Date())

  const pageStyle: CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '24px 16px',
    boxSizing: 'border-box',
    fontFamily: '"Times New Roman", Times, serif',
    color: '#111827',
  }

  const sheetStyle: CSSProperties = {
    width: '100%',
    maxWidth: '210mm',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    border: '1px solid #111827',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
    padding: '14mm',
    boxSizing: 'border-box',
  }

  const titleStyle: CSSProperties = {
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    margin: '0 0 6px 0',
    textTransform: 'uppercase',
  }

  const shopStyle: CSSProperties = {
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 700,
    margin: '0 0 4px 0',
  }

  const subtitleStyle: CSSProperties = {
    textAlign: 'center',
    fontSize: '12px',
    margin: '0',
  }

  const sectionTitleStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
  }

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    marginBottom: '12px',
  }

  const cellStyle: CSSProperties = {
    border: '1px solid #111827',
    padding: '8px 10px',
    verticalAlign: 'top',
    fontSize: '13px',
    lineHeight: 1.45,
    wordBreak: 'break-word',
  }

  const labelStyle: CSSProperties = {
    fontWeight: 700,
    width: '38%',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  }

  const narrowLabelStyle: CSSProperties = {
    fontWeight: 700,
    width: '28%',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  }

  const valueStyle: CSSProperties = {
    fontWeight: 400,
  }

  const infoRowStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  }

  const infoBoxStyle: CSSProperties = {
    flex: '1 1 280px',
  }

  const noteBoxStyle: CSSProperties = {
    minHeight: '54px',
    whiteSpace: 'pre-wrap',
  }

  const signatureRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px',
    marginTop: '24px',
  }

  const signatureBlockStyle: CSSProperties = {
    flex: 1,
    textAlign: 'center',
  }

  const signatureLineStyle: CSSProperties = {
    marginTop: '54px',
    borderTop: '1px solid #111827',
    paddingTop: '6px',
    fontSize: '13px',
    fontWeight: 700,
  }

  const footerStyle: CSSProperties = {
    marginTop: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    fontSize: '12px',
    fontStyle: 'italic',
  }

  return (
    <main style={pageStyle}>
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          main {
            background: #ffffff !important;
            padding: 0 !important;
          }

          .print-shell {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .print-sheet {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-shell" style={{ marginBottom: '12px' }}>
        <button
          id="print-invoice-button"
          type="button"
          className="no-print"
          style={{
            appearance: 'none',
            border: '1px solid #111827',
            backgroundColor: '#111827',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            margin: '0 auto 12px auto',
            display: 'block',
          }}
        >
          In phiếu
        </button>

        <div className="print-sheet" style={sheetStyle}>
          <div style={{ marginBottom: '12px' }}>
            <p style={shopStyle}>CỬA HÀNG SỬA CHỮA ĐIỆN TỬ ABC</p>
            <h1 style={titleStyle}>PHIẾU SỬA CHỮA THIẾT BỊ ĐIỆN TỬ</h1>
            <p style={subtitleStyle}>
              Phiếu tiếp nhận - sửa chữa - bàn giao thiết bị
            </p>
          </div>

          <table style={tableStyle} className="avoid-break">
            <tbody>
              <tr>
                <td style={{ ...cellStyle, ...narrowLabelStyle }}>Mã phiếu</td>
                <td style={{ ...cellStyle, ...valueStyle }}>{customer.ticketId}</td>
                <td style={{ ...cellStyle, ...narrowLabelStyle }}>Ngày nhận</td>
                <td style={{ ...cellStyle, ...valueStyle }}>
                  {formatVietnamDateTime(customer.receivedDate)}
                </td>
              </tr>
              <tr>
                <td style={{ ...cellStyle, ...narrowLabelStyle }}>Tên khách hàng</td>
                <td style={{ ...cellStyle, ...valueStyle }}>{customer.customerName}</td>
                <td style={{ ...cellStyle, ...narrowLabelStyle }}>SĐT</td>
                <td style={{ ...cellStyle, ...valueStyle }}>{customer.phone}</td>
              </tr>
            </tbody>
          </table>

          <div style={infoRowStyle} className="avoid-break">
            <div style={infoBoxStyle}>
              <p style={sectionTitleStyle}>Thông tin thiết bị</p>
              <table style={tableStyle}>
                <tbody>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Hiệu máy</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.deviceType}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Model</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.deviceModel || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Phụ kiện</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.accessories || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={infoBoxStyle}>
              <p style={sectionTitleStyle}>Thông tin sửa chữa</p>
              <table style={tableStyle}>
                <tbody>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Trước khi sửa</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.conditionBefore || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Sau khi sửa</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.conditionAfter || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Giá sửa chữa</td>
                    <td style={{ ...cellStyle, ...valueStyle, fontWeight: 700 }}>
                      {formatCurrencyVND(customer.repairCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...infoRowStyle, marginBottom: '0' }} className="avoid-break">
            <div style={infoBoxStyle}>
              <p style={sectionTitleStyle}>Nhân sự và trạng thái</p>
              <table style={tableStyle}>
                <tbody>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Người nhận máy</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.receivedBy || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Người sửa máy</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.repairedBy || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Trạng thái</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{getStatusLabel(customer.status)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={infoBoxStyle}>
              <p style={sectionTitleStyle}>Ngày bàn giao</p>
              <table style={tableStyle}>
                <tbody>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Ngày trả</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>
                      {formatVietnamDateTime(customer.returnedDate)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Ngày in</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{printedAt}</td>
                  </tr>
                  <tr>
                    <td style={{ ...cellStyle, ...labelStyle }}>Mã phiếu</td>
                    <td style={{ ...cellStyle, ...valueStyle }}>{customer.ticketId}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="avoid-break" style={{ marginTop: '4px' }}>
            <p style={sectionTitleStyle}>Ghi chú / Tình trạng bổ sung</p>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, ...noteBoxStyle }}>
                    {customer.notes || '............................................................'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={signatureRowStyle} className="avoid-break">
            <div style={signatureBlockStyle}>
              <div style={signatureLineStyle}>Người nhận</div>
            </div>
            <div style={signatureBlockStyle}>
              <div style={signatureLineStyle}>Người giao</div>
            </div>
          </div>

          <div style={footerStyle}>
            <span>Phiếu được in lúc: {printedAt}</span>
            <span>Trang in phiếu sửa chữa</span>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              const button = document.getElementById('print-invoice-button');
              if (button) {
                button.addEventListener('click', function () {
                  window.print();
                });
              }
            })();
          `,
        }}
      />
    </main>
  )
}
