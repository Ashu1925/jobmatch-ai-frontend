import { useEffect, useState } from "react";
import { BriefcaseBusiness, MapPin, Plus, Search, Send, Sparkles, Target } from "lucide-react";
import type { TrackedJob } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

type JobListing = {
  id: number;
  company: string;
  title: string;
  location: string;
  applyUrl: string;
  description: string;
};

type JobSource = {
  name: string;
  boardToken?: string;
  careersUrl?: string;
};

const indiaDefaultSources: JobSource[] = [
  { name: "Karya", boardToken: "karya" },
  { name: "TechGrove", boardToken: "techgrovebybanyansoftware" },
  { name: "HackerRank", boardToken: "hackerrank" },
  { name: "Zscaler", boardToken: "zscaler" },
  { name: "Sigmoid", boardToken: "sigmoid" },
  { name: "Insurity India", boardToken: "insurityindia" },
];

function mergeWithIndiaDefaults(savedSources: JobSource[]) {
  const sourcesByToken = new Map(
    [...indiaDefaultSources, ...savedSources].map((source) => [
      source.boardToken ?? source.name.toLowerCase(),
      source,
    ])
  );

  return Array.from(sourcesByToken.values());
}

function getGreenhouseToken(careersUrl: string) {
  try {
    const parsedUrl = new URL(careersUrl.startsWith("http") ? careersUrl : `https://${careersUrl}`);

    if (!parsedUrl.hostname.includes("greenhouse.io")) {
      return "";
    }

    return parsedUrl.pathname.split("/").filter(Boolean)[0] ?? "";
  } catch {
    return "";
  }
}

const skillTerms = [
  "java", "spring", "spring boot", "react", "javascript", "typescript",
  "python", "sql", "mysql", "postgresql", "mongodb", "aws", "azure",
  "docker", "kubernetes", "git", "github", "html", "css", "tailwind",
  "node", "node.js", "express", "rest api", "microservices", "android",
  "kotlin", "figma", "excel", "power bi", "machine learning", "data analysis",
];

function getMatchScore(resumeText: string, job: JobListing) {
  if (!resumeText) {
    return null;
  }

  const normalisedResume = resumeText.toLowerCase();
  const normalisedJob = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const requiredSkills = skillTerms.filter((skill) => normalisedJob.includes(skill));

  if (requiredSkills.length === 0) {
    return 0;
  }

  const matchedSkills = requiredSkills.filter((skill) => normalisedResume.includes(skill));
  return Math.round((matchedSkills.length / requiredSkills.length) * 100);
}

function getMinimumExperience(job: JobListing) {
  const jobText = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const match = jobText.match(/(\d+)\s*(?:\+|[-–]\s*\d+)?\s*(?:years?|yrs?)/);

  return match ? Number(match[1]) : null;
}

function isInternship(job: JobListing) {
  return /\bintern(ship)?\b/.test(`${job.title} ${job.description ?? ""}`.toLowerCase());
}

type DashboardProps = {
  onTrackJob: (job: Omit<TrackedJob, "status" | "savedAt">) => void;
};

function Dashboard({ onTrackJob }: DashboardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [sources, setSources] = useState<JobSource[]>(() => {
    const savedSources = localStorage.getItem("jobSources");

    if (!savedSources) {
      return mergeWithIndiaDefaults([{ name: "Stripe", boardToken: "stripe" }]);
    }

    try {
      const parsedSources = JSON.parse(savedSources) as JobSource[];

      if (
        !Array.isArray(parsedSources) ||
        parsedSources.length === 0 ||
        !parsedSources.every((source) => source.name && (source.boardToken || source.careersUrl))
      ) {
        return mergeWithIndiaDefaults([{ name: "Stripe", boardToken: "stripe" }]);
      }

      return mergeWithIndiaDefaults(parsedSources);
    } catch {
      return mergeWithIndiaDefaults([{ name: "Stripe", boardToken: "stripe" }]);
    }
  });
  const [apiStatus, setApiStatus] = useState("Checking backend...");
  const [liveJobs, setLiveJobs] = useState<JobListing[]>([]);
  const [jobsError, setJobsError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All locations");
  const [locationSearch, setLocationSearch] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("All experience levels");
  const [backendScores, setBackendScores] = useState<Record<string, number>>({});
  const resumeText = localStorage.getItem("resumeText") ?? "";
  const scoredJobs = liveJobs.map((job) => ({
    ...job,
    matchScore: backendScores[`${job.company}-${job.id}`] ?? getMatchScore(resumeText, job),
  }));

  const availableLocations = Array.from(
    new Set(
      scoredJobs.map((job) => job.location)
    )
  ).sort();

  const filteredJobs = scoredJobs.filter((job) => {
    const jobLocation = job.location;
    const normalisedLocation = jobLocation.toLowerCase();
    const searchMatches = normalisedLocation.includes(locationSearch.trim().toLowerCase());
    const isInIndia = /india|bengaluru|bangalore|mumbai|delhi|gurugram|noida|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|kochi|kochin|thiruvananthapuram|indore|lucknow|chandigarh/.test(normalisedLocation);
    const isRemote = /remote|anywhere|work from home/.test(normalisedLocation);

    const locationMatches = selectedLocation === "India (all locations)"
      ? isInIndia
      : selectedLocation === "Remote work"
        ? isRemote
        : selectedLocation === "All locations" || jobLocation === selectedLocation;

    const minimumExperience = getMinimumExperience(job);
    const experienceMatches = experienceFilter === "All experience levels"
      || (experienceFilter === "Internships only" && isInternship(job))
      || (experienceFilter === "0-1 years" && minimumExperience !== null && minimumExperience <= 1)
      || (experienceFilter === "1-3 years" && minimumExperience !== null && minimumExperience >= 1 && minimumExperience <= 3)
      || (experienceFilter === "3-5 years" && minimumExperience !== null && minimumExperience >= 3 && minimumExperience <= 5)
      || (experienceFilter === "5+ years" && minimumExperience !== null && minimumExperience >= 5);

    return locationMatches && searchMatches && experienceMatches;
  });

  useEffect(() => {
    localStorage.setItem("jobSources", JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    if (!resumeText || liveJobs.length === 0) {
      return;
    }

    Promise.all(
      liveJobs.slice(0, 40).map(async (job) => {
        const response = await fetch(`${API_BASE}/matches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText,
            jobDescription: `${job.title} ${job.description ?? ""}`,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const result = await response.json() as { score: number };
        return { key: `${job.company}-${job.id}`, score: result.score };
      })
    ).then((results) => {
      setBackendScores(Object.fromEntries(results.filter((result): result is { key: string; score: number } => result !== null).map((result) => [result.key, result.score])));
    }).catch(() => undefined);
  }, [liveJobs, resumeText]);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((response) => response.text())
      .then((data) => setApiStatus(data))
      .catch(() => setApiStatus("Backend is not running"));
  }, []);

  useEffect(() => {
    setJobsError("");

    Promise.all(
      sources.filter((source): source is JobSource & { boardToken: string } => Boolean(source.boardToken)).map((source) =>
        fetch(
          `${API_BASE}/jobs/greenhouse/listing/${encodeURIComponent(source.name)}/${encodeURIComponent(source.boardToken)}`
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error("Unable to load jobs");
            }

            return response.json() as Promise<JobListing[]>;
          })
          .catch(() => [])
      )
    ).then((jobLists) => {
      const jobs = jobLists.flat();
      setLiveJobs(jobs);

      if (jobs.length === 0) {
        setJobsError("No live jobs could be loaded from your saved sources.");
      }
    });
  }, [sources]);

  function addCompany() {
    const trimmedName = companyName.trim();

    const trimmedCareersUrl = careersUrl.trim();
    const detectedBoardToken = getGreenhouseToken(trimmedCareersUrl);

    if (!trimmedName || sources.some((source) => source.name.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    setSources([
      ...sources,
      {
        name: trimmedName,
        boardToken: detectedBoardToken || undefined,
        careersUrl: trimmedCareersUrl || undefined,
      },
    ]);
    setCompanyName("");
    setCareersUrl("");
    setIsFormOpen(false);
  }

  function removeCompany(companyToRemove: string) {
    setSources(sources.filter((source) => source.name !== companyToRemove));
  }

  return (
    <section className="mt-2">
      <div className="flex flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-slate-900 p-7 text-white shadow-xl shadow-slate-300 md:flex-row md:items-center md:p-9">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
            <Sparkles size={17} />
            AI-POWERED JOB SEARCH
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Find your next great role.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            JobMatch AI monitors opportunities, compares them with your resume,
            and applies automatically when your match score reaches 80% or more.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {apiStatus}
          </p>

          <div className="mt-6 flex max-w-xl items-center gap-2 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-blue-300" />
              Resume ready
            </div>
            <div className="h-px w-5 bg-blue-400/60" />
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
              Matching jobs
            </div>
            <div className="h-px w-5 bg-blue-400/60" />
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              80%+ rule
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:w-52">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-400/30 bg-slate-950/30">
            <div className="absolute inset-1 rounded-full border border-emerald-300/50 animate-[spin_8s_linear_infinite] border-t-emerald-200" />
            <span className="text-xl font-bold text-emerald-300">80%</span>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-blue-200">AUTO-APPLY TARGET</p>
            <p className="mt-1 text-sm font-medium text-white">High-match roles only</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            <Plus size={17} />
            Add company
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Companies tracked</p>
              <h3 className="mt-3 text-3xl font-bold text-slate-900">{sources.length}</h3>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <BriefcaseBusiness size={21} />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Companies being monitored</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Strong matches</p>
              <h3 className="mt-3 text-3xl font-bold text-slate-900">
                {scoredJobs.filter((job) => (job.matchScore ?? 0) >= 80).length}
              </h3>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Target size={21} />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Resume match score: 80%+</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Applications sent</p>
              <h3 className="mt-3 text-3xl font-bold text-slate-900">0</h3>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Send size={21} />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Applied automatically or manually</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Live careers feed</p>
              <p className="mt-1 text-sm text-slate-500">
                Live openings, scored against your uploaded resume
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              LIVE
            </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <span className="text-sm font-semibold text-slate-700">Filter by location</span>
              <label className="sr-only" htmlFor="location-filter">Filter jobs by location</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  id="location-filter"
                  value={selectedLocation}
                  onChange={(event) => setSelectedLocation(event.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500"
                >
                  <option>All locations</option>
                  <option>India (all locations)</option>
                  <option>Remote work</option>
                  {availableLocations.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </div>
              <div className="relative min-w-52 flex-1 sm:max-w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={locationSearch}
                  onChange={(event) => setLocationSearch(event.target.value)}
                  placeholder="Any Indian city or state"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>
              <label className="sr-only" htmlFor="experience-filter">Filter jobs by experience</label>
              <select
                id="experience-filter"
                value={experienceFilter}
                onChange={(event) => setExperienceFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500"
              >
                <option>All experience levels</option>
                <option>Internships only</option>
                <option>0-1 years</option>
                <option>1-3 years</option>
                <option>3-5 years</option>
                <option>5+ years</option>
              </select>
              {(selectedLocation !== "All locations" || locationSearch || experienceFilter !== "All experience levels") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation("All locations");
                    setLocationSearch("");
                    setExperienceFilter("All experience levels");
                  }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {jobsError && (
              <p className="p-5 text-sm font-medium text-red-600">{jobsError}</p>
            )}

            {!jobsError && liveJobs.length === 0 && (
              <p className="p-5 text-sm text-slate-500">Loading live jobs...</p>
            )}

            {!jobsError && liveJobs.length > 0 && !resumeText && (
              <p className="border-b border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                Upload a resume from the Resume page to see match scores.
              </p>
            )}

            {!jobsError && liveJobs.length > 0 && filteredJobs.length === 0 && (
              <p className="p-5 text-sm text-slate-500">
                No live jobs match this location. Choose another location to see more roles.
              </p>
            )}

            {filteredJobs.slice(0, 8).map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-900">{job.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.company} - {job.location}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    job.matchScore === null
                      ? "bg-slate-100 text-slate-600"
                      : job.matchScore >= 80
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                  }`}>
                    {job.matchScore === null ? "Live job" : `${job.matchScore}% match`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onTrackJob({
                      id: `${job.company}-${job.id}`,
                      title: job.title,
                      company: job.company,
                      location: job.location,
                      applyUrl: job.applyUrl,
                      matchScore: job.matchScore,
                    })}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                  >
                    Track job
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="relative self-start overflow-hidden rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-200">
          <p className="text-sm font-semibold text-blue-100">AUTO-APPLY RULE</p>
          <h3 className="mt-3 text-2xl font-bold">Only apply to high-quality matches.</h3>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            Applications will be sent only when a job reaches an 80% or higher
            resume match score.
          </p>
          <div className="mt-6 rounded-xl bg-white/15 p-4">
            <p className="text-sm text-blue-100">Current threshold</p>
            <p className="mt-1 text-3xl font-bold">80%</p>
          </div>

          <div className="relative mt-8 flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-slate-950/15">
            <div className="absolute h-28 w-28 rounded-full border border-blue-200/40 animate-[ping_2.8s_ease-out_infinite]" />
            <div className="absolute h-20 w-20 rounded-full border border-blue-100/50 animate-[ping_2.8s_ease-out_infinite_700ms]" />
            <div className="absolute h-16 w-16 rounded-full border border-white/40" />
            <div className="absolute h-16 w-0.5 origin-bottom bg-gradient-to-t from-transparent via-cyan-200 to-white animate-[spin_3s_linear_infinite]" />
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg shadow-blue-950/30">
              <Sparkles size={17} />
            </div>
            <p className="absolute bottom-3 text-xs font-semibold tracking-wide text-blue-100">
              SCANNING FOR STRONG MATCHES
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <div className="flex items-start justify-between gap-4 text-left">
          <div>
            <p className="text-xs font-bold tracking-wider text-blue-600">JOB SOURCES</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Company watchlist</h3>
            <p className="mt-1 text-sm text-slate-600">
              We fetch live jobs automatically from these Greenhouse career boards.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {sources.length} saved
          </span>
        </div>

        {sources.length === 0 && (
          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="font-semibold text-slate-800">Your watchlist is empty</p>
            <p className="mt-1 text-sm text-slate-500">
              Use the Add company button above to begin monitoring Greenhouse career pages.
            </p>
          </div>
        )}

        {isFormOpen && (
          <div className="mt-6 rounded-xl bg-slate-50 p-5 text-left">
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              id="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Example: Stripe"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
            />
            <label htmlFor="careersUrl" className="mt-4 block text-sm font-medium text-slate-700">
              Official careers-page URL <span className="text-slate-400">(recommended)</span>
            </label>
            <input
              id="careersUrl"
              value={careersUrl}
              onChange={(event) => setCareersUrl(event.target.value)}
              placeholder="Example: careers.company.com or job-boards.greenhouse.io/company"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Paste the official careers link. If it uses Greenhouse, JobMatch AI detects it automatically and starts loading live jobs. Other company pages are saved for direct access while we add their hiring-system integrations.
            </p>
            <button
              type="button"
              onClick={addCompany}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Save company
            </button>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-6 text-left">
            <h3 className="text-sm font-semibold text-slate-700">Companies you monitor</h3>
            <ul className="mt-3 space-y-2">
              {sources.map((source) => (
                <li
                  key={source.boardToken ?? source.name}
                  className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-slate-800"
                >
                  <span>
                    {source.name}
                    <span className="ml-2 text-sm text-slate-500">
                      {source.boardToken ? "Live Greenhouse feed" : "Saved careers page"}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    {source.careersUrl && (
                      <a
                        href={source.careersUrl.startsWith("http") ? source.careersUrl : `https://${source.careersUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-blue-600"
                      >
                        Careers page
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeCompany(source.name)}
                      className="text-sm font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
