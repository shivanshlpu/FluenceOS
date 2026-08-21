import React from 'react';

export const ATSResumeView = ({ resumeData }) => {
  const { header, skills, experience, projects, training, certifications, achievements, education } = resumeData;

  return (
    <div id="resume-a4-page" className="ats-resume-page">
      {/* 1. HEADER / CONTACT BLOCK */}
      <header className="ats-header">
        <h1 className="ats-name">{header.fullName || "Your Name"}</h1>
        <div className="ats-contact-split">
          <div className="ats-contact-left">
            {header.linkedIn?.url && (
              <div>LinkedIn: <a href={header.linkedIn.url} target="_blank" rel="noreferrer">{header.linkedIn.label || "linkedin.com/in/profile"}</a></div>
            )}
            {header.github?.url && (
              <div>GitHub: <a href={header.github.url} target="_blank" rel="noreferrer">{header.github.label || "github.com/profile"}</a></div>
            )}
            {header.portfolio?.url && (
              <div>Portfolio: <a href={header.portfolio.url} target="_blank" rel="noreferrer">{header.portfolio.label || "portfolio.app"}</a></div>
            )}
          </div>
          <div className="ats-contact-right">
            {header.email && <div>Email: {header.email}</div>}
            {header.mobile && <div>Mobile: {header.mobile}</div>}
          </div>
        </div>
      </header>

      {/* 2. SKILLS SUMMARY */}
      {skills?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">SKILLS SUMMARY</h2>
          <div className="ats-skills-list">
            {skills.map((s, idx) => (
              <div key={idx} className="ats-skill-line">
                <strong className="ats-bold-label">{s.category}:</strong> {s.items}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. WORK EXPERIENCE */}
      {experience?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">WORK EXPERIENCE</h2>
          {experience.map((exp, idx) => (
            <div key={idx} className="ats-entry">
              <div className="ats-entry-header">
                <span className="ats-entry-title">
                  <strong>{exp.role}</strong> — ({exp.organization})
                  {exp.tagLabel && exp.tagUrl && (
                    <> | <a href={exp.tagUrl} target="_blank" rel="noreferrer" className="ats-tag-link">{exp.tagLabel}</a></>
                  )}
                </span>
                <span className="ats-entry-date">{exp.date}</span>
              </div>
              <ul className="ats-bullets">
                {exp.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* 4. PROJECTS */}
      {projects?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">PROJECTS</h2>
          {projects.map((proj, idx) => (
            <div key={idx} className="ats-entry">
              <div className="ats-entry-header">
                <span className="ats-entry-title">
                  <strong>{proj.title}</strong> – {proj.descriptor}
                  {proj.githubUrl && (
                    <> | <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="ats-tag-link">GitHub</a></>
                  )}
                  {proj.liveUrl && (
                    <> | <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="ats-tag-link">Live</a></>
                  )}
                </span>
                <span className="ats-entry-date">{proj.date}</span>
              </div>
              <ul className="ats-bullets">
                {proj.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
              {proj.techStack && (
                <div className="ats-tech-line">
                  <span className="ats-tech-label">Tech:</span> {proj.techStack}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* 5. TRAINING */}
      {training?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">TRAINING</h2>
          {training.map((trn, idx) => (
            <div key={idx} className="ats-entry">
              <div className="ats-entry-header">
                <span className="ats-entry-title">
                  <strong>{trn.title}</strong> – {trn.descriptor}
                  {trn.tagUrl && (
                    <> | <a href={trn.tagUrl} target="_blank" rel="noreferrer" className="ats-tag-link">{trn.tagLabel || "Certificate"}</a></>
                  )}
                </span>
                <span className="ats-entry-date">{trn.date}</span>
              </div>
              <ul className="ats-bullets">
                {trn.bullets?.map((b, bIdx) => b && <li key={bIdx}>{b}</li>)}
              </ul>
              {trn.techStack && (
                <div className="ats-tech-line">
                  <span className="ats-tech-label">Tech:</span> {trn.techStack}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* 6. CERTIFICATIONS */}
      {certifications?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">CERTIFICATIONS</h2>
          <div className="ats-cert-list">
            {certifications.map((c, idx) => (
              <div key={idx} className="ats-single-line-entry">
                <span>
                  {c.link ? (
                    <a href={c.link} target="_blank" rel="noreferrer" className="ats-cert-link">{c.name}</a>
                  ) : (
                    c.name
                  )} | {c.issuer}
                </span>
                <span className="ats-entry-date">{c.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. ACHIEVEMENTS */}
      {achievements?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">ACHIEVEMENTS</h2>
          <div className="ats-achievements-list">
            {achievements.map((ach, idx) => (
              <div key={idx} className="ats-single-line-entry">
                <span>{ach.text}</span>
                <span className="ats-entry-date">{ach.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. EDUCATION */}
      {education?.length > 0 && (
        <section className="ats-section">
          <h2 className="ats-section-title">EDUCATION</h2>
          {education.map((edu, idx) => (
            <div key={idx} className="ats-edu-entry">
              <div className="ats-entry-header">
                <strong>{edu.institution}</strong>
                <span className="ats-entry-date">{edu.location}</span>
              </div>
              <div className="ats-entry-header ats-edu-sub">
                <span>{edu.degree}</span>
                <span className="ats-entry-date">{edu.date}</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
