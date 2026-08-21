import React from 'react';

export const ExecutiveCVView = ({ resumeData }) => {
  const { header, experience, projects, skills, education, achievements } = resumeData;

  return (
    <div id="resume-a4-page" className="executive-cv-page">
      {/* 1. Executive Header */}
      <header className="exec-header">
        <h1 className="exec-name">{header.fullName}</h1>
        <div className="exec-role">{header.targetTitle || "Senior Engineering & Technology Leader"}</div>
        <div className="exec-contact">
          <span>{header.email}</span> • <span>{header.mobile}</span> • <span>{header.location || "San Francisco, CA"}</span>
          {header.linkedIn?.url && <> • <a href={header.linkedIn.url} target="_blank" rel="noreferrer">{header.linkedIn.label || "LinkedIn"}</a></>}
        </div>
      </header>

      {/* 2. Executive Profile */}
      {header.summary && (
        <section className="exec-section">
          <h2 className="exec-title">Executive Profile</h2>
          <p className="exec-text">{header.summary}</p>
        </section>
      )}

      {/* 3. Professional Experience (First priority) */}
      {experience?.length > 0 && (
        <section className="exec-section">
          <h2 className="exec-title">Professional Experience</h2>
          {experience.map((exp, idx) => (
            <div key={idx} className="exec-entry">
              <div className="exec-row">
                <strong className="exec-role-title">{exp.role}</strong>
                <span className="exec-date">{exp.date}</span>
              </div>
              <div className="exec-company">{exp.organization}</div>
              <ul className="exec-bullets">
                {exp.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* 4. Strategic Initiatives & Key Projects */}
      {projects?.length > 0 && (
        <section className="exec-section">
          <h2 className="exec-title">Strategic Initiatives & Systems</h2>
          {projects.map((proj, idx) => (
            <div key={idx} className="exec-entry">
              <div className="exec-row">
                <strong>{proj.title} – {proj.descriptor}</strong>
                <span className="exec-date">{proj.date}</span>
              </div>
              <ul className="exec-bullets">
                {proj.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* 5. Core Competencies */}
      {skills?.length > 0 && (
        <section className="exec-section">
          <h2 className="exec-title">Core Competencies & Expertise</h2>
          <div className="exec-skills-grid">
            {skills.map((s, idx) => (
              <div key={idx} className="exec-skill-line">
                <strong>{s.category}:</strong> {s.items}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Education & Honors */}
      {education?.length > 0 && (
        <section className="exec-section">
          <h2 className="exec-title">Education & Credentials</h2>
          {education.map((edu, idx) => (
            <div key={idx} className="exec-edu-row">
              <span><strong>{edu.institution}</strong> — {edu.degree}</span>
              <span className="exec-date">{edu.date}</span>
            </div>
          ))}
          {achievements?.map((ach, idx) => (
            <div key={`ach-${idx}`} className="exec-edu-row sub">
              <span>★ {ach.text}</span>
              <span className="exec-date">{ach.date}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
