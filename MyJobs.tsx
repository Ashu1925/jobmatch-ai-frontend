import { BriefcaseBusiness, ExternalLink, Trash2 } from "lucide-react";
import type { ApplicationStatus, TrackedJob } from "./types";

type MyJobsProps = {
  jobs: TrackedJob[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onRemove: (id: string) => void;
};

const statuses: ApplicationStatus[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

const statusStyles: Record<ApplicationStatus, string> = {
  Saved: "bg-slate-100 text-slate-700",
  Applied: "bg-blue-50 text-blue-700",
  Interview: "bg-violet-50 text-violet-700",
  Offer: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

function MyJobs({ jobs, onStatusChange, onRemove }: MyJobsProps) {
  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold text-blue-600">APPLICATION TRACKER</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">My jobs</h2>
          <p className="mt-2 text-slate-600">Track every saved role from discovery to offer.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
          {jobs.length} tracked
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BriefcaseBusiness size={26} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-slate-900">No jobs saved yet</h3>
          <p className="mt-2 text-sm text-slate-500">Go to the Dashboard and select Track job beside any role you want to follow.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{job.title}</h3>
                    {job.matchScore !== null && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{job.matchScore}% match</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{job.company} · {job.location}</p>
                  <p className="mt-2 text-xs text-slate-400">Saved {new Date(job.savedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={job.status}
                    onChange={(event) => onStatusChange(job.id, event.target.value as ApplicationStatus)}
                    className={`rounded-lg border-0 px-3 py-2 text-sm font-bold outline-none ${statusStyles[job.status]}`}
                  >
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <a href={job.applyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800">
                    Open job <ExternalLink size={15} />
                  </a>
                  <button type="button" onClick={() => onRemove(job.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${job.title}`}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyJobs;
