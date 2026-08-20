import ClayCard from '../../ui/ClayCard';
import ClayBadge from '../../ui/ClayBadge';
import { MapPin, DollarSign, Building, ExternalLink } from 'lucide-react';

export default function JobCard({ job }) {
    return (
        <ClayCard className="p-5">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-bold text-gray-800">{job.title || 'Untitled Position'}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Building size={14} /> {job.company || 'Unknown'}
                    </p>
                </div>
                <ClayBadge color="green">{job.type || 'Remote'}</ClayBadge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                {job.location && (
                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                )}
                {job.salary && (
                    <span className="flex items-center gap-1"><DollarSign size={14} /> {job.salary}</span>
                )}
            </div>

            {job.url && (
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                    className="clay-button px-4 py-2 text-sm bg-blue-50 text-blue-500 inline-flex items-center gap-1">
                    View Job <ExternalLink size={12} />
                </a>
            )}
        </ClayCard>
    );
}
