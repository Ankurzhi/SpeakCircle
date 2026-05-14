import { useState } from 'react'
import { submitContact } from '../services/api'
import Toast from '../components/Toast'

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await submitContact(form)
      setToast({ message: 'Message sent! We\'ll reply within 24 hours.', type: 'success' })
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setToast({ message: 'Failed to send message. Please try again.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '80px 0', textAlign: 'center' }}>
        <div className="container" data-aos="fade-up">
          <span className="section-tag" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>📬 GET IN TOUCH</span>
          <h1 className="section-title mt-3" style={{ color: '#fff' }}>Contact Us</h1>
          <p className="section-subtitle mt-3 mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Have a question, suggestion, or feedback? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="sc-section">
        <div className="container">
          <div className="row g-5 align-items-start">
            {/* Contact Info */}
            <div className="col-lg-4" data-aos="fade-right">
              {[
                { icon: 'envelope', title: 'Email Us', detail: 'ankubabu1972@gmail.com', color: '#dbeafe' },
                { icon: 'chat-dots', title: 'Live Chat', detail: 'Available 9AM – 6PM IST', color: '#dcfce7' },
                { icon: 'geo-alt', title: 'Location', detail: 'New Delhi, India 🇮🇳', color: '#fef3c7' },
              ].map((c, i) => (
                <div key={i} className="sc-card p-4 mb-3 d-flex gap-3 align-items-start">
                  <div style={{ width: 46, height: 46, background: c.color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`bi bi-${c.icon}`} style={{ fontSize: '1.2rem', color: 'var(--dark)' }}></i>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 2, fontSize: '.9rem' }}>{c.title}</p>
                    <p style={{ color: 'var(--gray-600)', margin: 0, fontSize: '.88rem' }}>{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="col-lg-8" data-aos="fade-left">
              <div className="sc-card p-5">
                <h5 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 24 }}>Send us a message</h5>
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="sc-form-group">
                        <label className="sc-label">Your Name</label>
                        <input className="sc-input" placeholder="John Doe"
                          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="sc-form-group">
                        <label className="sc-label">Email Address</label>
                        <input type="email" className="sc-input" placeholder="you@example.com"
                          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                      </div>
                    </div>
                  </div>
                  <div className="sc-form-group">
                    <label className="sc-label">Subject</label>
                    <input className="sc-input" placeholder="How can we help?"
                      value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                  </div>
                  <div className="sc-form-group">
                    <label className="sc-label">Message</label>
                    <textarea className="sc-input" rows={5} placeholder="Write your message here..."
                      value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required
                      style={{ resize: 'vertical' }}></textarea>
                  </div>
                  <button type="submit" className="btn-primary-sc" disabled={sending}
                    style={{ display: 'inline-flex', padding: '12px 28px' }}>
                    {sending ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</>
                    ) : (
                      <><i className="bi bi-send me-2"></i>Send Message</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Contact
