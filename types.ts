export type ApplicationStatus = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

export type TrackedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  matchScore: number | null;
  status: ApplicationStatus;
  savedAt: string;
};
