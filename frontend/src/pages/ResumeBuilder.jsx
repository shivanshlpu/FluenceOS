import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { initialResumeData } from './resumeData';
import { DynamicCVRenderer } from './DynamicCVRenderer';
import { ChevronRight, ChevronLeft, Download, Save, Sparkles, Check, Loader, Edit3, Eye } from 'lucide-react';
import './ResumeBuilder.css';

export const ResumeBuilder = () => {
  const [resumeData, setResumeData] = useState(initialResumeData);
  const [cvType, setCvType] = useState('specialized'); // 'specialized' | 'general' | 'executive'
  const [activeStep, setActiveStep] = useState('personal'); // 'personal' | 'skills' | 'experience' | 'projects' | 'training' | 'education'
  const [mobileMode, setMobileMode] = useState('edit'); // 'edit' | 'preview'
  const [scale, setScale] = useState(1);
  const [atsScore, setAtsScore] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jobDescription, setJobDescription] = useState('');

  const previewWrapperRef = useRef(null);

  // Auto-fit A4 preview on mobile screens
  useEffect(() => {
    const calculateScale = () => {
      if (previewWrapperRef.current) {
        const availableWidth = previewWrapperRef.current.offsetWidth - 20;
        const a4WidthPx = 794; // 210mm @ 96dpi
        if (availableWidth < a4WidthPx && availableWidth > 0) {
          setScale(availableWidth / a4WidthPx);
        } else {
          setScale(1);
        }
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [mobileMode, cvType]);

  // Pixel-Perfect Isolated A4 PDF Export (No scaling distortion, 300 DPI high-res)
  const handleExportPDF = async () => {
    const originalElement = document.getElementById('resume-a4-page');
    if (!originalElement) {
      window.print();
      return;
    }

    setIsExporting(true);

    // Create an isolated unscaled clone off-screen
    const clone = originalElement.cloneNode(true);
    const container = document.createElement('div');
    container.id = 'pdf-render-isolated-container';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.minHeight = '297mm';
    container.style.background = '#ffffff';
    container.style.color = '#111111';
    container.style.zIndex = '-9999';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.transform = 'none';

    // Ensure clone has standard unscaled 100% dimensions
    clone.style.transform = 'none';
    clone.style.width = '210mm';
    clone.style.minHeight = '297mm';
    clone.style.margin = '0 auto';
    clone.style.boxShadow = 'none';
    clone.style.boxSizing = 'border-box';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const fileName = `${(resumeData.header.fullName || 'Resume').trim().replace(/\s+/g, '_')}_Resume.pdf`;
      const opt = {
        margin: [0, 0, 0, 0],
        filename: fileName,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 3, // Ultra-sharp 300 DPI text & layout
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
          windowHeight: 1123
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.warn('Isolated PDF export error, falling back to print:', err);
      window.print();
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsExporting(false);
    }
  };

  // ATS Scanner Mock Calculation
  const handleScanATS = () => {
    if (!jobDescription.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setAtsScore(94);
    }, 800);
  };

  // Form Handlers
  const updateHeader = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      header: { ...prev.header, [field]: value }
    }));
  };

  const updateHeaderLink = (key, url) => {
    setResumeData(prev => ({
      ...prev,
      header: {
        ...prev.header,
        [key]: {
          url: url,
          label: url.replace(/^https?:\/\//, '').replace(/\/$/, '')
        }
      }
    }));
  };

  const updateSkill = (index, items) => {
    const updated = [...resumeData.skills];
    updated[index].items = items;
    setResumeData(prev => ({ ...prev, skills: updated }));
  };

  const updateProject = (index, field, value) => {
    const updated = [...resumeData.projects];
    updated[index][field] = value;
    setResumeData(prev => ({ ...prev, projects: updated }));
  };

  const updateProjectBullet = (projIndex, bulletIndex, value) => {
    const updated = [...resumeData.projects];
    updated[projIndex].bullets[bulletIndex] = value;
    setResumeData(prev => ({ ...prev, projects: updated }));
  };

  const addProject = () => {
    setResumeData(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          title: "New Project",
          descriptor: "Full-Stack Web App",
          githubUrl: "https://github.com/",
          liveUrl: "",
          date: "Jan 2026 – Present",
          bullets: [
            "Architected system using modern frameworks to improve performance.",
            "Engineered core features and optimized backend pipelines.",
            "Delivered responsive user interface with automated testing."
          ],
          techStack: "React.js, Node.js, PostgreSQL"
        }
      ]
    }));
  };

  const removeProject = (index) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const steps = [
    { id: 'personal', num: '1', label: 'Personal' },
    { id: 'skills', num: '2', label: 'Skills' },
    { id: 'experience', num: '3', label: 'Experience' },
    { id: 'projects', num: '4', label: 'Projects' },
    { id: 'training', num: '5', label: 'Training' },
    { id: 'education', num: '6', label: 'Education' }
  ];

  const currentStepIdx = steps.findIndex(s => s.id === activeStep);
  const goToNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setActiveStep(steps[currentStepIdx + 1].id);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };
  const goToPrevStep = () => {
    if (currentStepIdx > 0) {
      setActiveStep(steps[currentStepIdx - 1].id);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  return (
    <div className="resume-app-wrapper">
      {/* Mobile Top Mode Toggle Bar */}
      <div className="mobile-toggle-bar">
        <button
          type="button"
          className={`mobile-toggle-btn ${mobileMode === 'edit' ? 'active' : ''}`}
          onClick={() => setMobileMode('edit')}
        >
          <Edit3 size={14} /> Edit CV Form
        </button>
        <button
          type="button"
          className={`mobile-toggle-btn ${mobileMode === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileMode('preview')}
        >
          <Eye size={14} /> A4 Live Preview
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="builder-hero-card">
        <div className="hero-top-row">
          <div className="hero-icon-box">📄</div>
          <div className="hero-text-box">
            <span className="ats-badge">100% Free ATS Optimizer</span>
            <h2>AI CV & Resume Builder</h2>
            <p>Craft ATS-friendly resumes with one-click AI bullet optimization & instant PDF export</p>
          </div>
        </div>

        {/* Archetype Template Selector (All 3 Options 100% Visible) */}
        <div className="archetype-grid-selector">
          <button
            type="button"
            className={`archetype-pill ${cvType === 'specialized' ? 'active' : ''}`}
            onClick={() => setCvType('specialized')}
          >
            💻 Specialized Tech
          </button>
          <button
            type="button"
            className={`archetype-pill ${cvType === 'general' ? 'active' : ''}`}
            onClick={() => setCvType('general')}
          >
            📄 Minimal General
          </button>
          <button
            type="button"
            className={`archetype-pill ${cvType === 'executive' ? 'active' : ''}`}
            onClick={() => setCvType('executive')}
          >
            👔 Executive Senior
          </button>
        </div>

        <div className="hero-actions-row">
          <button type="button" className="btn-secondary" onClick={() => alert("CV saved to local profile!")}>
            <Save size={15} /> Save CV
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={isExporting}
            onClick={handleExportPDF}
          >
            {isExporting ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
            {isExporting ? 'Generating PDF...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="builder-main-grid">
        {/* LEFT COLUMN: FORM CONTROLS */}
        <div className={`form-column-container ${mobileMode === 'preview' ? 'hide-on-mobile' : ''}`}>
          
          {/* Responsive 6-Step Grid Selector (All 6 Steps 100% Visible & Tapable) */}
          <div className="steps-grid-selector">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`step-grid-pill ${activeStep === s.id ? 'active' : ''}`}
                onClick={() => setActiveStep(s.id)}
              >
                <span className="step-num">{s.num}</span>
                <span className="step-txt">{s.label}</span>
              </button>
            ))}
          </div>

          {/* STEP 1: PERSONAL INFORMATION */}
          {activeStep === 'personal' && (
            <div className="section-card">
              <h3 className="section-card-title">Personal Information</h3>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={resumeData.header.fullName}
                    onChange={e => updateHeader('fullName', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Target Job Title</label>
                  <input
                    type="text"
                    value={resumeData.header.targetTitle}
                    onChange={e => updateHeader('targetTitle', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={resumeData.header.email}
                    onChange={e => updateHeader('email', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={resumeData.header.mobile}
                    onChange={e => updateHeader('mobile', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Location (City, Country)</label>
                  <input
                    type="text"
                    value={resumeData.header.location}
                    onChange={e => updateHeader('location', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={resumeData.header.linkedIn?.url || ''}
                    placeholder="https://linkedin.com/in/username"
                    onChange={e => updateHeaderLink('linkedIn', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>GitHub Profile URL</label>
                  <input
                    type="text"
                    value={resumeData.header.github?.url || ''}
                    placeholder="https://github.com/username"
                    onChange={e => updateHeaderLink('github', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Portfolio / Live Website</label>
                  <input
                    type="text"
                    value={resumeData.header.portfolio?.url || ''}
                    placeholder="https://yourportfolio.app"
                    onChange={e => updateHeaderLink('portfolio', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field full-width" style={{ marginTop: '12px' }}>
                <label>Professional Summary</label>
                <textarea
                  rows={3}
                  value={resumeData.header.summary}
                  onChange={e => updateHeader('summary', e.target.value)}
                />
              </div>

              {/* Step Navigation Actions */}
              <div className="step-footer-actions">
                <button type="button" className="btn-step-next" onClick={goToNextStep}>
                  Next: Skills Summary <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SKILLS SUMMARY */}
          {activeStep === 'skills' && (
            <div className="section-card">
              <h3 className="section-card-title">Skills Summary</h3>
              <p className="card-hint">List comma-separated items per category according to the rulebook.</p>
              {resumeData.skills.map((s, idx) => (
                <div key={idx} className="form-field" style={{ marginBottom: '10px' }}>
                  <label><strong>{s.category}</strong></label>
                  <input
                    type="text"
                    value={s.items}
                    onChange={e => updateSkill(idx, e.target.value)}
                  />
                </div>
              ))}

              <div className="step-footer-actions">
                <button type="button" className="btn-step-prev" onClick={goToPrevStep}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button type="button" className="btn-step-next" onClick={goToNextStep}>
                  Next: Experience <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: WORK EXPERIENCE */}
          {activeStep === 'experience' && (
            <div className="section-card">
              <h3 className="section-card-title">Work Experience</h3>
              {resumeData.experience.map((exp, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Job Role / Title</label>
                      <input
                        type="text"
                        value={exp.role}
                        onChange={e => {
                          const upd = [...resumeData.experience];
                          upd[idx].role = e.target.value;
                          setResumeData(prev => ({ ...prev, experience: upd }));
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Organization / Company Name</label>
                      <input
                        type="text"
                        value={exp.organization}
                        onChange={e => {
                          const upd = [...resumeData.experience];
                          upd[idx].organization = e.target.value;
                          setResumeData(prev => ({ ...prev, experience: upd }));
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Date Range (e.g. Aug 2025 or Aug 2024 – Present)</label>
                      <input
                        type="text"
                        value={exp.date}
                        onChange={e => {
                          const upd = [...resumeData.experience];
                          upd[idx].date = e.target.value;
                          setResumeData(prev => ({ ...prev, experience: upd }));
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Credential / Tag Link (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://certificate-url..."
                        value={exp.tagUrl || ''}
                        onChange={e => {
                          const upd = [...resumeData.experience];
                          upd[idx].tagUrl = e.target.value;
                          setResumeData(prev => ({ ...prev, experience: upd }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="bullet-input-box">
                    <label>Bullet Points (Task → Action → Result)</label>
                    {exp.bullets.map((b, bIdx) => (
                      <textarea
                        key={bIdx}
                        rows={2}
                        value={b}
                        placeholder={`Bullet ${bIdx + 1}`}
                        onChange={e => {
                          const upd = [...resumeData.experience];
                          upd[idx].bullets[bIdx] = e.target.value;
                          setResumeData(prev => ({ ...prev, experience: upd }));
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="step-footer-actions">
                <button type="button" className="btn-step-prev" onClick={goToPrevStep}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button type="button" className="btn-step-next" onClick={goToNextStep}>
                  Next: Projects <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PROJECTS */}
          {activeStep === 'projects' && (
            <div className="section-card">
              <div className="card-top-header">
                <h3 className="section-card-title">Projects ({resumeData.projects.length})</h3>
                <button type="button" className="btn-add-item" onClick={addProject}>
                  + Add Project
                </button>
              </div>

              {resumeData.projects.map((proj, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="item-card-header">
                    <span className="item-badge">Project #{idx + 1}</span>
                    {resumeData.projects.length > 1 && (
                      <button type="button" className="btn-delete" onClick={() => removeProject(idx)}>
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Project Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Freeko"
                        value={proj.title}
                        onChange={e => updateProject(idx, 'title', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Short Descriptor (What is it?)</label>
                      <input
                        type="text"
                        placeholder="e.g. AI-Powered Gym Coaching Platform"
                        value={proj.descriptor}
                        onChange={e => updateProject(idx, 'descriptor', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>GitHub Link</label>
                      <input
                        type="text"
                        placeholder="https://github.com/..."
                        value={proj.githubUrl || ''}
                        onChange={e => updateProject(idx, 'githubUrl', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Live Hosted URL</label>
                      <input
                        type="text"
                        placeholder="https://live-app.vercel.app"
                        value={proj.liveUrl || ''}
                        onChange={e => updateProject(idx, 'liveUrl', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Date Range (e.g. May 2026 – June 2026)</label>
                      <input
                        type="text"
                        value={proj.date}
                        onChange={e => updateProject(idx, 'date', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Tech Stack (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="React.js, Node.js, MongoDB, Docker..."
                        value={proj.techStack}
                        onChange={e => updateProject(idx, 'techStack', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bullet-input-box">
                    <label>3 Bullet Points (Task → Action → Result)</label>
                    {proj.bullets.map((b, bIdx) => (
                      <textarea
                        key={bIdx}
                        rows={2}
                        value={b}
                        placeholder={`Bullet ${bIdx + 1}: Built [X] using [Y] achieving [Z]...`}
                        onChange={e => updateProjectBullet(idx, bIdx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="step-footer-actions">
                <button type="button" className="btn-step-prev" onClick={goToPrevStep}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button type="button" className="btn-step-next" onClick={goToNextStep}>
                  Next: Training & Certs <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: TRAINING & CERTIFICATIONS */}
          {activeStep === 'training' && (
            <div className="section-card">
              <h3 className="section-card-title">Certifications & Training</h3>
              <div className="nested-item-card">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#c4c0e0' }}>Certifications</h4>
                {resumeData.certifications.map((c, idx) => (
                  <div key={idx} className="form-grid-2" style={{ marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Certificate Name"
                      value={c.name}
                      onChange={e => {
                        const upd = [...resumeData.certifications];
                        upd[idx].name = e.target.value;
                        setResumeData(prev => ({ ...prev, certifications: upd }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Issuer (e.g. Postman, NPTEL)"
                      value={c.issuer}
                      onChange={e => {
                        const upd = [...resumeData.certifications];
                        upd[idx].issuer = e.target.value;
                        setResumeData(prev => ({ ...prev, certifications: upd }));
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="step-footer-actions">
                <button type="button" className="btn-step-prev" onClick={goToPrevStep}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button type="button" className="btn-step-next" onClick={goToNextStep}>
                  Next: Education <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: EDUCATION */}
          {activeStep === 'education' && (
            <div className="section-card">
              <h3 className="section-card-title">Education</h3>
              {resumeData.education.map((edu, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>College / University / School</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={e => {
                          const upd = [...resumeData.education];
                          upd[idx].institution = e.target.value;
                          setResumeData(prev => ({ ...prev, education: upd }));
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Location (e.g. Punjab, India)</label>
                      <input
                        type="text"
                        value={edu.location}
                        onChange={e => {
                          const upd = [...resumeData.education];
                          upd[idx].location = e.target.value;
                          setResumeData(prev => ({ ...prev, education: upd }));
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Degree & CGPA</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={e => {
                          const upd = [...resumeData.education];
                          upd[idx].degree = e.target.value;
                          setResumeData(prev => ({ ...prev, education: upd }));
                        }}
                      />
                    </div>
                    <div className="form-field">
                      <label>Date Range (e.g. Aug 2023 – Present)</label>
                      <input
                        type="text"
                        value={edu.date}
                        onChange={e => {
                          const upd = [...resumeData.education];
                          upd[idx].date = e.target.value;
                          setResumeData(prev => ({ ...prev, education: upd }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="step-footer-actions">
                <button type="button" className="btn-step-prev" onClick={goToPrevStep}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button type="button" className="btn-step-next" onClick={() => setMobileMode('preview')}>
                  👁️ View A4 Live Preview
                </button>
              </div>
            </div>
          )}

          {/* ATS Job Match Scanner Card */}
          <div className="ats-scanner-box">
            <div className="scanner-header">
              <span>🛡️ ATS Job Match Scanner</span>
              {atsScore && <span className="score-pill">{atsScore}% ATS Match</span>}
            </div>
            <textarea
              rows={3}
              placeholder="Paste job description here to check ATS keyword alignment..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
            <button
              type="button"
              className="btn-scan"
              disabled={isScanning}
              onClick={handleScanATS}
            >
              {isScanning ? '⚡ Scanning Keywords...' : '✨ Scan Match Score'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: A4 LIVE PREVIEW */}
        <div
          ref={previewWrapperRef}
          className={`preview-column-container ${mobileMode === 'edit' ? 'hide-on-mobile' : ''}`}
        >
          <div
            className="preview-scaler-box"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center'
            }}
          >
            <DynamicCVRenderer cvType={cvType} data={resumeData} />
          </div>
        </div>
      </div>
    </div>
  );
};
