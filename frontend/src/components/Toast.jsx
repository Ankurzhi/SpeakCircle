import { useEffect } from 'react'

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const icons = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' }
  const colors = { success: '#10b981', error: '#ef4444', info: '#2563eb' }

  return (
    <div className={`sc-toast ${type}`}>
      <div className="d-flex align-items-start gap-2">
        <i className={`bi bi-${icons[type]}`} style={{ color: colors[type], fontSize: '1.1rem', flexShrink: 0 }}></i>
        <div>
          <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 600, color: 'var(--text)' }}>
            {message}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', padding: 0 }}>
          <i className="bi bi-x" style={{ color: 'var(--gray-400)' }}></i>
        </button>
      </div>
    </div>
  )
}

export default Toast
