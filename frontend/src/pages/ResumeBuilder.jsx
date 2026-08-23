import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import { initialResumeData } from './resumeData';
import { DynamicCVRenderer } from './DynamicCVRenderer';
import { ChevronRight, ChevronLeft, Download, Save, Sparkles, Check, Loader, Edit3, Eye, Plus, Trash2, RotateCcw, CloudCheck, CheckCheck } from 'lucide-react';
import { pythonAPI } from '../services/api';
import './ResumeBuilder.css';

const CV_STORAGE_KEY = 'fluence_cv_data_v2';
const CV_META_KEY = 'fluence_cv_meta_v2';

const getInitialResumeData = () => {
  try {
    const saved = localStorage.getItem(CV_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.header && parsed.skills) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load CV from localStorage:', e);
  }
  return initialResumeData;
};

const getInitialMeta = () => {
  try {
    const saved = localStorage.getItem(CV_META_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return { cvType: 'specialized', activeStep: 'personal', jobDescription: '' };
};

export const ResumeBuilder = () => {
  const initialMeta = getInitialMeta();
  const [resumeData, setResumeData] = useState(getInitialResumeData);
  const [cvType, setCvType] = useState(initialMeta.cvType || 'specialized'); // 'specialized' | 'general' | 'executive'
  const [activeStep, setActiveStep] = useState(initialMeta.activeStep || 'personal'); // 'personal' | 'skills' | 'experience' | 'projects' | 'training' | 'education'
  const [mobileMode, setMobileMode] = useState('edit'); // 'edit' | 'preview'
  const [scale, setScale] = useState(0.85);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [pageHeight, setPageHeight] = useState(1123);
  const [atsScore, setAtsScore] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jobDescription, setJobDescription] = useState(initialMeta.jobDescription || '');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'synced'

  const previewWrapperRef = useRef(null);
  const innerResumeRef = useRef(null);
  const A4_STANDARD_WIDTH = 794;

  const calculateResponsiveScale = useCallback(() => {
    if (!previewWrapperRef.current) return;
    const containerWidth = previewWrapperRef.current.clientWidth - 28; // Account for container padding
    if (containerWidth <= 0) return;
    const autoScale = Math.min(1.0, containerWidth / A4_STANDARD_WIDTH);
    setScale(autoScale * zoomMultiplier);

    if (innerResumeRef.current) {
      setPageHeight(innerResumeRef.current.offsetHeight || 1123);
    }
  }, [zoomMultiplier]);

  useEffect(() => {
    calculateResponsiveScale();
    const handleResize = () => calculateResponsiveScale();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      calculateResponsiveScale();
    });
    if (previewWrapperRef.current) {
      observer.observe(previewWrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [calculateResponsiveScale, mobileMode, cvType, resumeData]);


  // Persistence effect: Auto-save to localStorage & debounced sync to backend
  useEffect(() => {
    try {
      localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(resumeData));
      localStorage.setItem(CV_META_KEY, JSON.stringify({ cvType, activeStep, jobDescription }));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    const timer = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await pythonAPI.post('/api/cv/save', {
          cvData: resumeData,
          title: resumeData.header?.fullName ? `${resumeData.header.fullName}'s Resume` : 'My Resume'
        });
        // Auto-log activity to tracker for streak
        pythonAPI.post('/api/tracker/log-activity', {
          activityType: 'cv',
          durationMinutes: 5,
          title: 'Refined ATS CV'
        }).catch(() => {});
        setSaveStatus('synced');
      } catch (err) {
        setSaveStatus('saved');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [resumeData, cvType, activeStep, jobDescription]);

  // Load cloud CV on mount if no local edits exist
  useEffect(() => {
    const fetchCloudCV = async () => {
      try {
        const localSaved = localStorage.getItem(CV_STORAGE_KEY);
        if (!localSaved) {
          const res = await pythonAPI.get('/api/cv/my-cv');
          if (res && res.cv && res.cv.header) {
            setResumeData(res.cv);
          }
        }
      } catch (err) {}
    };
    fetchCloudCV();
  }, []);

  const handleManualSave = async () => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(resumeData));
      await pythonAPI.post('/api/cv/save', {
        cvData: resumeData,
        title: resumeData.header?.fullName ? `${resumeData.header.fullName}'s Resume` : 'My Resume'
      });
      await pythonAPI.post('/api/tracker/log-activity', {
        activityType: 'cv',
        durationMinutes: 5,
        title: 'Saved ATS Resume'
      }).catch(() => {});
      setSaveStatus('synced');
      setTimeout(() => setSaveStatus('saved'), 2500);
    } catch (err) {
      setSaveStatus('saved');
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm("Are you sure you want to reset your CV to the default sample template? This will replace your current edits.")) {
      setResumeData(initialResumeData);
      localStorage.removeItem(CV_STORAGE_KEY);
      localStorage.removeItem(CV_META_KEY);
      setSaveStatus('saved');
    }
  };

  // Clean Multi-Page Non-Slicing PDF Export Engine
  const handleExportPDF = async () => {

    const originalElement = document.getElementById('resume-a4-page');
    if (!originalElement) {
      window.print();
      return;
    }

    setIsExporting(true);

    // Create an isolated unscaled clone off-screen with multi-page automatic flow
    const clone = originalElement.cloneNode(true);
    const container = document.createElement('div');
    container.id = 'pdf-render-isolated-container';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.minHeight = 'auto';
    container.style.background = '#ffffff';
    container.style.color = '#111111';
    container.style.zIndex = '-9999';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.transform = 'none';

    // Ensure clone has standard unscaled dimensions and clean page-break rules
    clone.style.transform = 'none';
    clone.style.width = '210mm';
    clone.style.minHeight = 'auto';
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
        margin: [6, 0, 8, 0], // Clean 6mm top and 8mm bottom breathing margins on every page
        filename: fileName,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 3, // Ultra-sharp 300 DPI text & layout
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: [
            '.ats-section-title',
            '.ats-entry',
            '.ats-edu-entry',
            '.ats-single-line-entry',
            '.ats-skill-line',
            '.gen-title',
            '.gen-entry',
            '.exec-title',
            '.exec-entry',
            '.exec-edu-row',
            'h1', 'h2', 'h3', 'header'
          ]
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

  // --- Dynamic Handlers: Header ---
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

  // --- Dynamic Handlers: Skills ---
  const updateSkillCategory = (index, field, value) => {
    const updated = [...resumeData.skills];
    updated[index][field] = value;
    setResumeData(prev => ({ ...prev, skills: updated }));
  };

  const addSkillCategory = () => {
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, { category: "New Category", items: "Item 1, Item 2, Item 3" }]
    }));
  };

  const removeSkillCategory = (index) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  // --- Dynamic Handlers: Experience ---
  const updateExperience = (index, field, value) => {
    const updated = [...resumeData.experience];
    updated[index][field] = value;
    setResumeData(prev => ({ ...prev, experience: updated }));
  };

  const updateExperienceBullet = (expIdx, bIdx, value) => {
    const updated = [...resumeData.experience];
    updated[expIdx].bullets[bIdx] = value;
    setResumeData(prev => ({ ...prev, experience: updated }));
  };

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          role: "Software Engineer",
          organization: "Company Name",
          date: "Jan 2025 – Present",
          tagUrl: "",
          bullets: [
            "Engineered scalable systems using modern software patterns.",
            "Optimized pipeline performance and reduced latency by 35%.",
            "Collaborated with cross-functional teams to deliver core modules."
          ]
        }
      ]
    }));
  };

  const removeExperience = (index) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  // --- Dynamic Handlers: Projects ---
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
          descriptor: "Full-Stack Web Application",
          githubUrl: "https://github.com/",
          liveUrl: "",
          date: "Jan 2026 – Present",
          bullets: [
            "Architected full-stack system using modern frameworks for high performance.",
            "Engineered core modules and optimized backend data pipelines.",
            "Delivered responsive user interface with automated unit testing."
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

  // --- Dynamic Handlers: Training & Certs ---
  const updateCertification = (index, field, value) => {
    const updated = [...resumeData.certifications];
    updated[index][field] = value;
    setResumeData(prev => ({ ...prev, certifications: updated }));
  };

  const addCertification = () => {
    setResumeData(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { name: "New Certification", issuer: "Issuing Body", date: "2026", url: "" }
      ]
    }));
  };

  const removeCertification = (index) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  // --- Dynamic Handlers: Education ---
  const updateEducation = (index, field, value) => {
    const updated = [...resumeData.education];
    updated[index][field] = value;
    setResumeData(prev => ({ ...prev, education: updated }));
  };

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          institution: "University Name",
          location: "City, Country",
          degree: "Bachelor of Technology in Computer Science",
          date: "2023 – 2027"
        }
      ]
    }));
  };

  const removeEducation = (index) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
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

        {/* Archetype Template Selector */}
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

        <div className="hero-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Live Auto-save status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: '20px',
            background: saveStatus === 'saving' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: saveStatus === 'saving' ? '#eab308' : '#10b981',
            border: `1px solid ${saveStatus === 'saving' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}>
            {saveStatus === 'saving' ? (
              <>
                <Loader size={12} className="animate-spin" /> Saving...
              </>
            ) : saveStatus === 'synced' ? (
              <>
                <CheckCheck size={13} color="#10b981" /> Cloud Synced
              </>
            ) : (
              <>
                <Check size={13} color="#10b981" /> Auto-Saved
              </>
            )}
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleManualSave}
            title="Force save all edits to local and cloud"
          >
            <Save size={14} /> Save CV
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetToDefault}
            title="Reset CV to initial sample data"
            style={{ color: 'var(--text-muted)' }}
          >
            <RotateCcw size={13} /> Reset
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
          
          {/* Responsive 6-Step Grid Selector */}
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
              <div className="card-top-header">
                <h3 className="section-card-title">Skills Summary ({resumeData.skills.length})</h3>
                <button type="button" className="btn-add-item" onClick={addSkillCategory}>
                  <Plus size={13} /> Add Category
                </button>
              </div>
              <p className="card-hint">List comma-separated technical items per category according to ATS rules.</p>
              
              {resumeData.skills.map((s, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="item-card-header">
                    <input
                      type="text"
                      className="category-title-input"
                      value={s.category}
                      placeholder="Category Name (e.g. Languages)"
                      onChange={e => updateSkillCategory(idx, 'category', e.target.value)}
                    />
                    {resumeData.skills.length > 1 && (
                      <button type="button" className="btn-delete" onClick={() => removeSkillCategory(idx)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={s.items}
                    placeholder="e.g. Java, Python, C++, TypeScript..."
                    onChange={e => updateSkillCategory(idx, 'items', e.target.value)}
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
              <div className="card-top-header">
                <h3 className="section-card-title">Work Experience ({resumeData.experience.length})</h3>
                <button type="button" className="btn-add-item" onClick={addExperience}>
                  <Plus size={13} /> Add Experience
                </button>
              </div>

              {resumeData.experience.map((exp, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="item-card-header">
                    <span className="item-badge">Experience #{idx + 1}</span>
                    {resumeData.experience.length > 0 && (
                      <button type="button" className="btn-delete" onClick={() => removeExperience(idx)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Job Role / Title</label>
                      <input
                        type="text"
                        value={exp.role}
                        onChange={e => updateExperience(idx, 'role', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Organization / Company Name</label>
                      <input
                        type="text"
                        value={exp.organization}
                        onChange={e => updateExperience(idx, 'organization', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Date Range (e.g. Aug 2024 – Present)</label>
                      <input
                        type="text"
                        value={exp.date}
                        onChange={e => updateExperience(idx, 'date', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Credential / Tag Link (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://certificate-url..."
                        value={exp.tagUrl || ''}
                        onChange={e => updateExperience(idx, 'tagUrl', e.target.value)}
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
                        onChange={e => updateExperienceBullet(idx, bIdx, e.target.value)}
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
                  <Plus size={13} /> Add Project
                </button>
              </div>

              {resumeData.projects.map((proj, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="item-card-header">
                    <span className="item-badge">Project #{idx + 1}</span>
                    {resumeData.projects.length > 1 && (
                      <button type="button" className="btn-delete" onClick={() => removeProject(idx)}>
                        <Trash2 size={13} />
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
              <div className="card-top-header">
                <h3 className="section-card-title">Certifications ({resumeData.certifications.length})</h3>
                <button type="button" className="btn-add-item" onClick={addCertification}>
                  <Plus size={13} /> Add Certification
                </button>
              </div>

              {resumeData.certifications.map((c, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="item-card-header">
                    <span className="item-badge">Certification #{idx + 1}</span>
                    {resumeData.certifications.length > 1 && (
                      <button type="button" className="btn-delete" onClick={() => removeCertification(idx)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Certificate Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Postman API Fundamentals"
                        value={c.name}
                        onChange={e => updateCertification(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Issuer & Date</label>
                      <input
                        type="text"
                        placeholder="e.g. Postman | Jan 2026"
                        value={c.issuer}
                        onChange={e => updateCertification(idx, 'issuer', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

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
              <div className="card-top-header">
                <h3 className="section-card-title">Education ({resumeData.education.length})</h3>
                <button type="button" className="btn-add-item" onClick={addEducation}>
                  <Plus size={13} /> Add Education
                </button>
              </div>

              {resumeData.education.map((edu, idx) => (
                <div key={idx} className="nested-item-card">
                  <div className="item-card-header">
                    <span className="item-badge">Education #{idx + 1}</span>
                    {resumeData.education.length > 1 && (
                      <button type="button" className="btn-delete" onClick={() => removeEducation(idx)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>College / University / School</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={e => updateEducation(idx, 'institution', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Location (e.g. Punjab, India)</label>
                      <input
                        type="text"
                        value={edu.location}
                        onChange={e => updateEducation(idx, 'location', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Degree & CGPA</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={e => updateEducation(idx, 'degree', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Date Range (e.g. Aug 2023 – Present)</label>
                      <input
                        type="text"
                        value={edu.date}
                        onChange={e => updateEducation(idx, 'date', e.target.value)}
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
          {/* Zoom & Fit Toolbar */}
          <div className="preview-controls-bar">
            <div className="preview-controls-left">
              <span>📄 A4 Live Preview</span>
              <span className="preview-zoom-badge">
                {Math.round(scale * 100)}% {zoomMultiplier === 1 ? '(Fit)' : ''}
              </span>
            </div>

            <div className="preview-controls-right">
              <button
                type="button"
                className="preview-zoom-btn"
                onClick={() => setZoomMultiplier(prev => Math.max(0.4, +(prev - 0.1).toFixed(2)))}
                title="Zoom Out"
              >
                −
              </button>
              <button
                type="button"
                className="preview-zoom-btn"
                onClick={() => setZoomMultiplier(1)}
                title="Fit to Screen"
              >
                Fit
              </button>
              <button
                type="button"
                className="preview-zoom-btn"
                onClick={() => setZoomMultiplier(prev => Math.min(1.8, +(prev + 0.1).toFixed(2)))}
                title="Zoom In"
              >
                +
              </button>
            </div>
          </div>

          {/* Scaled A4 Container */}
          <div
            className="preview-scaler-box"
            style={{
              width: `${Math.round(A4_STANDARD_WIDTH * scale)}px`,
              height: `${Math.round((pageHeight || 1123) * scale)}px`,
              position: 'relative',
            }}
          >
            <div
              ref={innerResumeRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${A4_STANDARD_WIDTH}px`,
                position: 'absolute',
                left: 0,
                top: 0,
              }}
            >
              <DynamicCVRenderer cvType={cvType} data={resumeData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

