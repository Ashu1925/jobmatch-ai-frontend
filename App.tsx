import Dashboard from './Dashboard'
import {Sparkles,Bell,BriefcaseBusiness,FileText,LayoutDashboard,Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import ResumeUpload from "./ResumeUpload";
import MyJobs from "./MyJobs";
import SettingsPage from "./SettingsPage";
import type { ApplicationStatus, TrackedJob } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

const navigation=[
    { label:"Dashboard",icon: LayoutDashboard},
    { label:"My jobs",icon:BriefcaseBusiness},
    { label:"Resume",icon:FileText},
    {label:"Settings",icon:Settings}

];

function App(){

    const [activePage, setActivePage] = useState("Dashboard")
    const [isEntering, setIsEntering] = useState(true);
    const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>(() => {
        try {
            return JSON.parse(localStorage.getItem("trackedJobs") ?? "[]") as TrackedJob[];
        } catch {
            return [];
        }
    });
    const [trackerError, setTrackerError] = useState("");

    useEffect(() => {
        localStorage.setItem("trackedJobs", JSON.stringify(trackedJobs));
    }, [trackedJobs]);

    useEffect(() => {
        fetch(`${API_BASE}/applications`)
            .then((response) => {
                if (!response.ok) throw new Error("Unable to load tracked jobs");
                return response.json();
            })
            .then((jobs: Array<{ id: number; title: string; company: string; location: string; applyUrl: string; matchScore: number | null; status: ApplicationStatus; createdAt: string }>) => {
                setTrackedJobs(jobs.map((job) => ({ ...job, id: String(job.id), savedAt: job.createdAt })));
            })
            .catch(() => setTrackerError("Your saved jobs could not sync with the backend. Check that the backend is running."));
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => setIsEntering(false), 1450);
        return () => window.clearTimeout(timer);
    }, []);

    async function trackJob(job: Omit<TrackedJob, "status" | "savedAt">) {
        const response = await fetch(`${API_BASE}/applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(job),
        });

        if (!response.ok) {
            setTrackerError("Unable to save this job. Please try again.");
            return;
        }

        const savedJob = await response.json() as Omit<TrackedJob, "id" | "savedAt"> & { id: number; createdAt: string };
        setTrackedJobs((currentJobs) => [{ ...savedJob, id: String(savedJob.id), savedAt: savedJob.createdAt }, ...currentJobs]);
        setTrackerError("");
        setActivePage("My jobs");
    }

    async function updateJobStatus(id: string, status: ApplicationStatus) {
        const response = await fetch(`${API_BASE}/applications/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            setTrackerError("Unable to update the application status.");
            return;
        }

        setTrackedJobs((currentJobs) => currentJobs.map((job) => job.id === id ? { ...job, status } : job));
        setTrackerError("");
    }

    async function removeJob(id: string) {
        const response = await fetch(`${API_BASE}/applications/${id}`, { method: "DELETE" });

        if (!response.ok) {
            setTrackerError("Unable to remove this job.");
            return;
        }

        setTrackedJobs((currentJobs) => currentJobs.filter((job) => job.id !== id));
        setTrackerError("");
    }
    return(
        <>
        {isEntering && (
            <div className="entry-screen fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950 text-white">
                <div className="entry-orb entry-orb-one" />
                <div className="entry-orb entry-orb-two" />
                <div className="relative z-10 text-center">
                    <div className="entry-logo mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-2xl shadow-blue-500/30">
                        <Sparkles size={36}/>
                    </div>
                    <p className="entry-title mt-6 text-2xl font-bold tracking-tight">jobMatch AI</p>
                    <p className="entry-subtitle mt-2 text-sm font-medium text-blue-200">Preparing your job search workspace</p>
                    <div className="entry-progress mx-auto mt-7 h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
                        <div className="entry-progress-bar h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" />
                    </div>
                </div>
            </div>
        )}
        <div className="app-shell min-h-screen bg-slate-100 text-slate-900">
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
                <div className="flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Sparkles size={20}/>
                    </div>
                    <div>
                        <p className="font-bold">jobMatch AI</p>
                        <p className="text-xs text-slate-500">Smart Job Search</p>
                    </div>
                </div>

                <nav className="mt-10 space-y-2">
                    { navigation.map(({label, icon: Icon})=>(
                        <button key={label} onClick={() => setActivePage(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                            activePage === label
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}>
                            <Icon size={19}/>
                            {label}
                        </button>
                    ))}
                </nav>
                <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-white">
                    <p className="text-sm font-semibold">Auto-apply enabled</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                        Applications are sent only for jobs with an 80%+ resume match.
                    </p>
                </div>
            </aside>
            <main className="min-h-screen md:ml-64">
                <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:px-10">
                    <div>
                        <p className="text-sm text-slate-500"> Sunday,August 31</p>
                        <h1 className="text-xl font-bold"> Your job search overview</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100">
                            <Bell size={20}/>
                        </button>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                            AY
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-10">
                    {activePage === "Dashboard" && <Dashboard onTrackJob={trackJob}/>} 

                    {activePage === "Resume" && <ResumeUpload/>}

                    {activePage === "My jobs" && (
                        <>
                            {trackerError && <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{trackerError}</p>}
                            <MyJobs jobs={trackedJobs} onStatusChange={updateJobStatus} onRemove={removeJob}/>
                        </>
                    )}

                    {activePage === "Settings" && <SettingsPage/>}

                    {activePage !== "Dashboard" && activePage !== "Resume" && activePage !== "My jobs" && activePage !== "Settings" && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                            <h2 className="text-xl font-bold text-slate-900">{activePage}</h2>
                            <p className="mt-2 text-slate-600">
                                This section is being connected to the backend next.
                            </p>
                        </div>
                    )}

                </div>
            </main>
        </div>
        </>
    );
}
export default App;
