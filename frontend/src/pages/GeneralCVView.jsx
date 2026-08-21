import React from 'react';

export const GeneralCVView = ({ resumeData }) => {
  const { header, skills, experience, projects, education, certifications } = resumeData;

  return (
    <div id="resume-a4-page" className="general-cv-page">
      {/* 1. Header (Centered classic layout) */}
      <header className="gen-header">
        <h1 className="gen-name">{header.fullName}</h1>
        <p className="gen-contact">
          {header.email} • {header.mobile} • {header.location || "San Francisco, CA"}
          {header.linkedIn?.url && <> • <a href={header.linkedIn.url} target="_blank" rel="noreferrer">LinkedIn</a></>}
          {header.github?.url && <> • <a href={header.github.url} target="_blank" rel="noreferrer">GitHub</a></>}
        </p>
      </header>

      {/* 2. Professional Summary */}
      {header.summary && (
        <section className="gen-section">
          <h2 className="gen-title">Professional Summary</h2>
          <p className="gen-summary">{header.summary}</p>
        </section>
      )}

      {/* 3. Education (Top focus for general corporate / new grads) */}
      {education?.length > 0 && (
        <section className="gen-section">
          <h2 className="gen-title">Education</h2>
          {education.map((edu, idx) => (
            <div key={idx} className="gen-entry">
              <div className="gen-row">
                <strong>{edu.institution}</strong>
                <span>{edu.date}</span>
              </div>
              <div className="gen-row sub">
                <span>{edu.degree}</span>
                <span>{edu.location}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 4. Work Experience */}
      {experience?.length > 0 && (
        <section className="gen-section">
          <h2 className="gen-title">Work Experience</h2>
          {experience.map((exp, idx) => (
            <div key={idx} className="gen-entry">
              <div className="gen-row">
                <strong>{exp.role} – {exp.organization}</strong>
                <span>{exp.date}</span>
              </div>
              <ul className="gen-bullets">
                {exp.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* 5. Projects */}
      {projects?.length > 0 && (
        <section className="gen-section">
          <h2 className="gen-title">Key Projects</h2>
          {projects.map((proj, idx) => (
            <div key={idx} className="gen-entry">
              <div className="gen-row">
                <strong>{proj.title}</strong>
                <span>{proj.date}</span>
              </div>
              <div className="gen-desc">{proj.descriptor}</div>
              <ul className="gen-bullets">
                {proj.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* 6. Skills Summary */}
      {skills?.length > 0 && (
        <section className="gen-section">
          <h2 className="gen-title">Skills & Competencies</h2>
          <div className="gen-skills-grid">
            {skills.map((s, idx) => (
              <div key={idx} className="gen-skill-item">
                <strong>{s.category}:</strong> {s.items}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Certifications */}
      {certifications?.length > 0 && (
        <section className="gen-section">
          <h2 className="gen-title">Certifications</h2>
          <div className="gen-cert-list">
            {certifications.map((c, idx) => (
              <div key={idx} className="gen-row sub">
                <span><strong>{c.name}</strong> – {c.issuer}</span>
                <span>{c.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
