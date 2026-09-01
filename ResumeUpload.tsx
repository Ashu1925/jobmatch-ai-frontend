import { useState } from "react";
import { CheckCircle2, FileText, UploadCloud } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

type ResumeExtraction = {
  fileName: string;
  characterCount: number;
  text: string;
};

function ResumeUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function uploadAndExtractResume(file: File) {
    setIsUploading(true);
    setAnalysisMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/resume/extract`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Resume analysis failed");
      }

      const result = (await response.json()) as ResumeExtraction;
      localStorage.setItem("resumeText", result.text);
      localStorage.setItem("resumeFileName", result.fileName);
      setAnalysisMessage(`Resume analyzed: ${result.characterCount.toLocaleString()} characters extracted.`);
    } catch {
      setError("We could not analyze your resume. Make sure the backend is running and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please choose a PDF, DOCX, or TXT resume.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your resume must be 5 MB or smaller.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError("");
    void uploadAndExtractResume(file);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-blue-600">YOUR PROFILE</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">
        Upload your resume
      </h2>
      <p className="mt-3 text-slate-600">
        We use your resume to score job matches and only auto-apply when the
        match is 80% or higher.
      </p>

      <label className="mt-8 flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 p-10 text-center transition hover:border-blue-400 hover:bg-blue-100">
        <div className="rounded-2xl bg-white p-4 text-blue-600 shadow-sm">
          <UploadCloud size={32} />
        </div>

        <p className="mt-5 font-semibold text-slate-900">
          Choose your resume file
        </p>
        <p className="mt-2 text-sm text-slate-500">
          PDF, DOCX, or TXT - Maximum 5 MB
        </p>

        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {selectedFile && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="rounded-xl bg-white p-3 text-emerald-600">
            <FileText size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">
              {selectedFile.name}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {isUploading ? "Uploading and analyzing..." : "Uploaded and ready for matching"}
            </p>
          </div>

          {isUploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          ) : (
            <CheckCircle2 className="text-emerald-600" size={24} />
          )}
        </div>
      )}

      {analysisMessage && (
        <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
          {analysisMessage}
        </p>
      )}
    </section>
  );
}

export default ResumeUpload;
