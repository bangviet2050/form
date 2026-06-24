'use client'

interface XacNhanData {
  ticketId: string
  customerName: string
  phone: string
  receivedDate: string
  deviceType: string
  deviceModel: string
  accessories: string
  conditionBefore: string
  receivedBy: string
}

export default function XacNhanClient({ data }: { data: XacNhanData }) {
  const today = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date())

  const deviceText = [data.deviceType, data.deviceModel].filter(Boolean).join(' - ')

  return (
    <main style={{
      minHeight: '100vh', backgroundColor: '#f3f4f6',
      boxSizing: 'border-box', fontFamily: '"Times New Roman", Times, serif', color: '#111827',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @page { size: A5; margin: 6mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { background: #fff !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{
        backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>Phiếu tiếp nhận thiết bị</span>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>|</span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>{data.ticketId} — {data.customerName}</span>
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

      {/* Form content — A5 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: '148mm', backgroundColor: '#fff',
          border: '1px solid #111827', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: '6mm 8mm', boxSizing: 'border-box',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <p style={{ fontWeight: 700, fontSize: '12px', margin: '0 0 1px 0', textTransform: 'uppercase' }}>
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p style={{ fontWeight: 700, fontSize: '12px', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div style={{ width: '160px', height: '1px', backgroundColor: '#111827', margin: '0 auto 4px auto' }} />
          </div>

          {/* Title */}
          <h1 style={{
            textAlign: 'center', fontWeight: 700, fontSize: '14px',
            margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.02em',
          }}>
            PHIẾU TIẾP NHẬN THIẾT BỊ VÀ ĐIỀU KHOẢN DỊCH VỤ
          </h1>
          <p style={{ textAlign: 'center', fontSize: '11px', margin: '0 0 8px 0', color: '#333' }}>
            Mã phiếu: <strong>{data.ticketId}</strong>
          </p>

          {/* Customer info */}
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontWeight: 700, fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
              Thông tin khách hàng:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
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
                  <td style={{ border: '1px solid #111827', padding: '4px 6px', minHeight: '40px', whiteSpace: 'pre-wrap' }}>
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
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, fontSize: '11px', margin: '0 0 3px 0', textTransform: 'uppercase' }}>
              Điều khoản về bản quyền phần mềm
            </p>
            <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '0 0 5px 0', color: '#555' }}>
              (Khách hàng vui lòng đọc kỹ trước khi ký tên)
            </p>

            <p style={{ fontSize: '10px', margin: '0 0 8px 0', lineHeight: 1.8, textAlign: 'justify' }}>
              Cửa hàng chỉ thực hiện dịch vụ kiểm tra, sửa chữa phần cứng và/hoặc cài đặt hệ điều hành, phần mềm ở dạng <strong>nguyên bản, chưa kích hoạt (bản dùng thử/Trial)</strong> theo đúng quy định của nhà sản xuất.
            </p>
            <p style={{ fontSize: '10px', margin: '0 0 8px 0', lineHeight: 1.8, textAlign: 'justify' }}>
              Cửa hàng <strong>TUYỆT ĐỐI KHÔNG</strong> cung cấp, cài đặt các công cụ bẻ khóa, bẻ khóa bản quyền (Crack, Patch, Keygen...) cho thiết bị.
            </p>
            <p style={{ fontSize: '10px', margin: '0 0 8px 0', lineHeight: 1.8, textAlign: 'justify' }}>
              Khách hàng có trách nhiệm tự trang bị bản quyền (License/Product Key) hợp pháp để kích hoạt và sử dụng phần mềm. Cửa hàng hoàn toàn được miễn trừ mọi trách nhiệm pháp lý liên quan đến vấn đề bản quyền phần mềm trên thiết bị của khách hàng trong và sau quá trình làm dịch vụ.
            </p>
          </div>

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px' }}>
            <div style={{ textAlign: 'center', minWidth: '200px' }}>
              <p style={{ fontSize: '11px', margin: '0 0 4px 0' }}>
                Ngày {today}
              </p>
              <p style={{ fontWeight: 700, fontSize: '11px', margin: '0 0 60px 0' }}>
                Xác nhận của khách hàng
              </p>
              <p style={{ fontSize: '10px', fontStyle: 'italic', color: '#555', margin: 0 }}>
                (Ký, ghi rõ họ tên)
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
