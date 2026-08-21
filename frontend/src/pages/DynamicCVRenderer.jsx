import React from 'react';
import { ATSResumeView } from './ATSResumeView';
import { GeneralCVView } from './GeneralCVView';
import { ExecutiveCVView } from './ExecutiveCVView';
import './ResumeTemplates.css';

export const DynamicCVRenderer = ({ cvType, data }) => {
  switch (cvType) {
    case 'specialized':
      return <ATSResumeView resumeData={data} />;
    case 'general':
      return <GeneralCVView resumeData={data} />;
    case 'executive':
      return <ExecutiveCVView resumeData={data} />;
    default:
      return <ATSResumeView resumeData={data} />;
  }
};
