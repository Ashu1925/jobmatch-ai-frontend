import { BellRing, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";

type JobSettings = {
  fullName: string;
  email: string;
  matchThreshold: number;
  emailNotifications: boolean;
  autoApplyEnabled: boolean;
};

const defaultSettings: JobSettings = {
  fullName: "",
  email: "",
  matchThreshold: 80,
  emailNotifications: true,
  autoApplyEnabled: false,
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

function SettingsPage() {
  const [settings, setSettings] = useState<JobSettings>(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem("jobSettings") ?? "{}") };
    } catch {
      return defaultSettings;
    }
  });
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState("");

  function saveSettings() {
    localStorage.setItem("jobSettings", JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  async function sendTestEmail() {
    if (!settings.email) {
      setTestStatus("Enter your notification email first.");
      return;
    }

    setTestStatus("Sending test email...");
    try {
      const response = await fetch(`${API_BASE}/notifications/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.email }),
      });
      setTestStatus(response.ok ? "Test email sent. Check your inbox." : "Email could not be sent. Check the server settings.");
    } catch {
      setTestStatus("Email service is unavailable right now.");
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-blue-600">PREFERENCES</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">Settings</h2>
      <p className="mt-3 text-slate-600">Control notifications and the high-match rule for your job search.</p>

      <div className="mt-8 space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">Your profile</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Name
              <input value={settings.fullName} onChange={(event) => setSettings({ ...settings, fullName: event.target.value })} placeholder="Your name" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Notification email
              <input type="email" value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} placeholder="you@example.com" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-500" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><BellRing size={21} /></div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Match and notification rules</h3>
              <p className="mt-1 text-sm text-slate-500">Only notify you for roles at or above this match score.</p>
              <label className="mt-5 block text-sm font-semibold text-slate-700">Minimum match: {settings.matchThreshold}%
                <input type="range" min="50" max="100" step="5" value={settings.matchThreshold} onChange={(event) => setSettings({ ...settings, matchThreshold: Number(event.target.value) })} className="mt-3 w-full accent-blue-600" />
              </label>
              <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                Email me about strong matches
                <input type="checkbox" checked={settings.emailNotifications} onChange={(event) => setSettings({ ...settings, emailNotifications: event.target.checked })} className="h-4 w-4 accent-blue-600" />
              </label>
              <button type="button" onClick={sendTestEmail} className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100">
                Send test email
              </button>
              {testStatus && <p className="mt-3 text-sm font-semibold text-slate-600">{testStatus}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 text-amber-700" size={22} />
            <div>
              <h3 className="font-bold text-amber-950">Application approval rule</h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">JobMatch AI will never submit an application invisibly. Supported applications can be prepared when they meet your threshold, but you will review and confirm each submission.</p>
              <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-bold text-amber-950">
                <input type="checkbox" checked={settings.autoApplyEnabled} onChange={(event) => setSettings({ ...settings, autoApplyEnabled: event.target.checked })} className="h-4 w-4 accent-blue-600" />
                Prepare high-match applications for my review
              </label>
            </div>
          </div>
        </div>
      </div>

      <button type="button" onClick={saveSettings} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700">
        <CheckCircle2 size={18} /> Save settings
      </button>
      {saved && <span className="ml-3 text-sm font-bold text-emerald-700">Settings saved.</span>}
    </section>
  );
}

export default SettingsPage;
