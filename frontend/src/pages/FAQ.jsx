import { useState, useEffect } from 'react'
import { getFAQs } from '../services/api'

const FAQ = () => {
  const [faqs, setFaqs] = useState([])
  const [open, setOpen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFAQs().then(r => setFaqs(r.data.faqs || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = (id) => setOpen(open === id ? null : id)

  return (
    <div>
      {/* Header */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '80px 0', textAlign: 'center' }}>
        <div className="container" data-aos="fade-up">
          <span className="section-tag" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
            💬 HELP CENTER
          </span>
          <h1 className="section-title mt-3" style={{ color: '#fff' }}>
            Frequently Asked Questions
          </h1>
          <p className="section-subtitle mt-3 mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Got questions? We've got answers. If you don't find what you need, contact us!
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="sc-section">
        <div className="container" style={{ maxWidth: 760 }}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-sc mx-auto"></div></div>
          ) : (
            <div data-aos="fade-up">
              {faqs.map((faq, i) => (
                <div key={faq.id || i} className={`sc-accordion-item ${open === i ? 'open' : ''}`}
                  data-aos="fade-up" data-aos-delay={i * 60}>
                  <button className="sc-accordion-btn" onClick={() => toggle(i)}>
                    <span>{faq.question}</span>
                    <i className={`bi bi-${open === i ? 'dash' : 'plus'}`}
                      style={{ fontSize: '1.2rem', color: open === i ? 'var(--primary)' : 'var(--gray-400)', flexShrink: 0 }}></i>
                  </button>
                  {open === i && (
                    <div className="sc-accordion-body">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Still have questions? */}
          <div className="text-center mt-5 p-5 sc-card" data-aos="fade-up">
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤔</div>
            <h5 style={{ fontFamily: 'Syne', fontWeight: 700 }}>Still have questions?</h5>
            <p style={{ color: 'var(--gray-600)' }}>Our support team is happy to help you.</p>
            <a href="/contact" className="btn-primary-sc" style={{ display: 'inline-flex', marginTop: 8 }}>
              Contact Us <i className="bi bi-arrow-right ms-2"></i>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FAQ
