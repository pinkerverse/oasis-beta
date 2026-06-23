"use client";

import { useState, useRef } from "react";



type AnalysisResult = {
  frameworkMatches: {
    strand: string;
    objectives: string[];
  }[];
  confidence: number;
  level: string;
  nextSteps: string[];
};

const pupilProgress = [
  { area: "Mathematics", level: "Exceeding", score: 100 },
  { area: "Communication", level: "Secure", score: 75 },
  { area: "Research Skills", level: "Secure", score: 75 },
  { area: "Critical Thinking", level: "Developing", score: 50 },
  { area: "Creativity", level: "Developing", score: 50 },
  { area: "Physical", level: "Exceeding", score: 100 },
  { area: "Social Skills", level: "Secure", score: 75 },
  { area: "Self-Management", level: "Below", score: 25 },
];

const snapshotData = [
  {
    area: "Mathematics",
    baseline: "Developing",
    current: "Exceeding",
    change: 2,
  },
  {
    area: "Communication",
    baseline: "Secure",
    current: "Secure",
    change: 0,
  },
  {
    area: "Research Skills",
    baseline: "Developing",
    current: "Secure",
    change: 1,
  },
  {
    area: "Critical Thinking",
    baseline: "Below",
    current: "Developing",
    change: 1,
  },
  {
    area: "Creativity",
    baseline: "Developing",
    current: "Exceeding",
    change: 2,
  },
  {
    area: "Physical",
    baseline: "Secure",
    current: "Exceeding",
    change: 1,
  },
  {
    area: "Social Skills",
    baseline: "Developing",
    current: "Secure",
    change: 1,
  },
  {
    area: "Self-Management",
    baseline: "Below",
    current: "Developing",
    change: 1,
  },
];

const evidenceCoverage = [
  { area: "Mathematics", short: "M", count: 12, lastAdded: "2 days ago" },
  { area: "Communication", short: "C", count: 9, lastAdded: "1 day ago" },
  { area: "Research Skills", short: "R", count: 7, lastAdded: "4 days ago" },
  { area: "Critical Thinking", short: "CT", count: 5, lastAdded: "1 week ago" },
  { area: "Creativity", short: "Cr", count: 3, lastAdded: "2 weeks ago" },
  { area: "Physical", short: "P", count: 2, lastAdded: "3 weeks ago" },
  { area: "Social Skills", short: "SS", count: 8, lastAdded: "3 days ago" },
  { area: "Self-Management", short: "SM", count: 4, lastAdded: "6 days ago" },
];

const maxEvidenceCount = Math.max(...evidenceCoverage.map((item) => item.count));

const learningJourneyData = {
  Overall: [
    { label: "Sep", level: 1 },
    { label: "Oct", level: 2 },
    { label: "Nov", level: 2 },
    { label: "Dec", level: 3 },
    { label: "Jan", level: 4 },
  ],
  Mathematics: [
    { label: "Sep", level: 1 },
    { label: "Oct", level: 2 },
    { label: "Nov", level: 3 },
    { label: "Dec", level: 3 },
    { label: "Jan", level: 4 },
  ],
  Communication: [
    { label: "Sep", level: 2 },
    { label: "Oct", level: 2 },
    { label: "Nov", level: 3 },
    { label: "Dec", level: 3 },
    { label: "Jan", level: 3 },
  ],
  "Research Skills": [
    { label: "Sep", level: 1 },
    { label: "Oct", level: 2 },
    { label: "Nov", level: 2 },
    { label: "Dec", level: 3 },
    { label: "Jan", level: 3 },
  ],
  "Critical Thinking": [
    { label: "Sep", level: 1 },
    { label: "Oct", level: 1 },
    { label: "Nov", level: 2 },
    { label: "Dec", level: 2 },
    { label: "Jan", level: 3 },
  ],
  Creativity: [
    { label: "Sep", level: 2 },
    { label: "Oct", level: 2 },
    { label: "Nov", level: 2 },
    { label: "Dec", level: 3 },
    { label: "Jan", level: 3 },
  ],
  Physical: [
    { label: "Sep", level: 2 },
    { label: "Oct", level: 3 },
    { label: "Nov", level: 3 },
    { label: "Dec", level: 4 },
    { label: "Jan", level: 4 },
  ],
  "Social Skills": [
    { label: "Sep", level: 2 },
    { label: "Oct", level: 2 },
    { label: "Nov", level: 3 },
    { label: "Dec", level: 3 },
    { label: "Jan", level: 3 },
  ],
  "Self-Management": [
    { label: "Sep", level: 1 },
    { label: "Oct", level: 1 },
    { label: "Nov", level: 2 },
    { label: "Dec", level: 2 },
    { label: "Jan", level: 2 },
  ],
};

const classInsights = {
  Mathematics: {
    Below: { count: 2, learners: ["Lucas Chen", "Noah Patel"] },
    Developing: { count: 5, learners: ["Emma Brown", "Olivia Garcia", "Ava Khan", "Leo Wang", "Maya Singh"] },
    Secure: { count: 10, learners: ["Matthew Smith", "Sofia Lee", "Ethan Clark", "Amelia Jones", "Daniel Kim", "Mia Roberts", "Arjun Mehta", "Lily Chen", "Oscar Brown", "Grace Wilson"] },
    Exceeding: { count: 5, learners: ["Henry Taylor", "Isla Scott", "Jack Evans", "Chloe Martin", "Zara Ahmed"] },
  },

  Communication: {
    Below: { count: 4, learners: ["Lucas Chen", "Noah Patel", "Leo Wang", "Ava Khan"] },
    Developing: { count: 6, learners: ["Emma Brown", "Olivia Garcia", "Maya Singh", "Daniel Kim", "Oscar Brown", "Grace Wilson"] },
    Secure: { count: 9, learners: ["Matthew Smith", "Sofia Lee", "Ethan Clark", "Amelia Jones", "Mia Roberts", "Arjun Mehta", "Lily Chen", "Henry Taylor", "Isla Scott"] },
    Exceeding: { count: 3, learners: ["Jack Evans", "Chloe Martin", "Zara Ahmed"] },
  },

  ResearchSkills: {
    Below: { count: 1, learners: ["Noah Patel"] },
    Developing: { count: 7, learners: ["Emma Brown", "Lucas Chen", "Olivia Garcia", "Ava Khan", "Leo Wang", "Maya Singh", "Oscar Brown"] },
    Secure: { count: 11, learners: ["Matthew Smith", "Sofia Lee", "Ethan Clark", "Amelia Jones", "Daniel Kim", "Mia Roberts", "Arjun Mehta", "Lily Chen", "Grace Wilson", "Henry Taylor", "Isla Scott"] },
    Exceeding: { count: 3, learners: ["Jack Evans", "Chloe Martin", "Zara Ahmed"] },
  },

  Creativity: {
    Below: { count: 3, learners: ["Lucas Chen", "Noah Patel", "Leo Wang"] },
    Developing: { count: 8, learners: ["Emma Brown", "Olivia Garcia", "Ava Khan", "Maya Singh", "Daniel Kim", "Oscar Brown", "Grace Wilson", "Lily Chen"] },
    Secure: { count: 8, learners: ["Matthew Smith", "Sofia Lee", "Ethan Clark", "Amelia Jones", "Mia Roberts", "Arjun Mehta", "Henry Taylor", "Isla Scott"] },
    Exceeding: { count: 3, learners: ["Jack Evans", "Chloe Martin", "Zara Ahmed"] },
  },
};

export default function Home() {
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [observation, setObservation] = useState("");
  const [evidenceImage, setEvidenceImage] = useState<File | null>(null);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showAddLearnerModal, setShowAddLearnerModal] = useState(false);
const [showManageLearners, setShowManageLearners] =
  useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
const [teacherLevel, setTeacherLevel] = useState("Secure");
const [overrideReason, setOverrideReason] = useState("");
  const [showObservationPanel, setShowObservationPanel] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
const [learnerToArchive, setLearnerToArchive] = useState<any>(null);
  const [editingLearner, setEditingLearner] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
const [assessmentPhilosophy, setAssessmentPhilosophy] =
  useState("Hybrid");
  const [showPTCNotes, setShowPTCNotes] = useState(false);
  const [showReportHelper, setShowReportHelper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
const [newLearnerFirstName, setNewLearnerFirstName] = useState("");
const [newLearnerLastName, setNewLearnerLastName] = useState("");
const [isSEND, setIsSEND] = useState(false);
const [isEAL, setIsEAL] = useState(false);
const [isGifted, setIsGifted] = useState(false);
const [newLearnerDob, setNewLearnerDob] = useState("");
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedJourney, setSelectedJourney] = useState("Overall");
  const [snapshotFrom, setSnapshotFrom] = useState("Baseline");
const [snapshotTo, setSnapshotTo] = useState("Current");
const [assessmentScale, setAssessmentScale] = useState(
  "Below / Developing / Secure / Exceeding"
);

const [customLevels, setCustomLevels] = useState([
  "Level 1",
  "Level 2",
  "Level 3",
]);
const [showTodaysFocus, setShowTodaysFocus] = useState(false);
  const journey =
    learningJourneyData[selectedJourney as keyof typeof learningJourneyData];
    const showLearnerOverview = selectedChildren.length === 1;
const [selectedAreas, setSelectedAreas] = useState([
  "Mathematics",
  "Communication",
]);
    const [pupils, setPupils] = useState([
  {
    firstName: "Matthew",
    lastName: "Smith",
    status: "green",
    send: false,
eal: false,
gifted: true,
    lastObservation:
      "Built a bridge using blocks and explained why a wider base made the structure stronger.",
    lastObservationDate: "2 days ago",
    lastLevel: "Secure",
  },

   {
    firstName: "Emma",
    lastName: "Brown",
    status: "yellow",
    send: true,
eal: true,
gifted: false,
    lastObservation:
      "Worked collaboratively during group discussion.",
    lastObservationDate: "5 days ago",
    lastLevel: "Developing",
  },
  {
    firstName: "Lucas",
    lastName: "Chen",
    status: "red",
  },
  {
    firstName: "Olivia",
    lastName: "Garcia",
    status: "green",
  },
  {
    firstName: "Noah",
    lastName: "Patel",
    status: "yellow",
  },
]);

<div className="mt-6">

  <p className="mb-3 text-sm font-semibold text-slate-700">
    Learner Flags
  </p>

  <div className="space-y-3">

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isSEND}
        onChange={(e) => setIsSEND(e.target.checked)}
      />
      <span>⭐ SEND</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isEAL}
        onChange={(e) => setIsEAL(e.target.checked)}
      />
      <span>🌍 EAL</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isGifted}
        onChange={(e) => setIsGifted(e.target.checked)}
      />
      <span>🚀 Gifted</span>
    </label>

  </div>

</div>

const evidenceDetails = [
  {
    month: "Sep",
    level: "Developing",
    area: "Mathematics",
    observation:
      "Matthew measured three plants using a ruler and recorded the results independently.",
    confidence: 87,
  },
  {
    month: "Oct",
    level: "Developing",
    area: "Research Skills",
    observation:
      "Matthew collected information and compared growth patterns across several plants.",
    confidence: 89,
  },
  {
    month: "Nov",
    level: "Secure",
    area: "Mathematics",
    observation:
      "Matthew explained differences in plant growth and justified his conclusions.",
    confidence: 91,
  },
  {
    month: "Dec",
    level: "Secure",
    area: "Communication",
    observation:
      "Matthew shared findings with peers and answered questions confidently.",
    confidence: 88,
  },
  {
    month: "Jan",
    level: "Exceeding",
    area: "Critical Thinking",
    observation:
      "Matthew independently suggested improvements to the investigation process.",
    confidence: 94,
  },
];

function toggleChild(name: string) {
  if (selectedChildren.includes(name)) {
    setSelectedChildren(
      selectedChildren.filter((child) => child !== name)
    );
  } else {
    setSelectedChildren([...selectedChildren, name]);
  }
}

  const levelToY = (level: number) => {
    if (level === 4) return 35;
    if (level === 3) return 85;
    if (level === 2) return 135;
    return 185;
  };

  const journeyPoints = journey
    .map((point, index) => {
      const x = 110 + index * 65;
      const y = levelToY(point.level);
      return `${x},${y}`;
    })
    .join(" ");

function handleAddLearner() {

  if (!newLearnerFirstName.trim()) return;

  if (editingIndex !== null) {

    const updatedPupils = [...pupils];

    updatedPupils[editingIndex] = {
      ...updatedPupils[editingIndex],
      firstName: newLearnerFirstName,
      lastName: newLearnerLastName,
      
    };

    setPupils(updatedPupils);

    setEditingIndex(null);

  } else {

    const newLearner = {
  firstName: newLearnerFirstName,
  lastName: newLearnerLastName || "",
  status: "yellow",

  send: isSEND,
  eal: isEAL,
  gifted: isGifted,

  lastObservation: "",
  lastObservationDate: "",
  lastLevel: "Not Assessed",
};

    setPupils([...pupils, newLearner]);

  }

  setNewLearnerFirstName("");
  setNewLearnerLastName("");
  setNewLearnerDob("");

  setShowAddLearnerModal(false);
}

function confirmArchiveLearner() {

  if (!learnerToArchive) return;

  setPupils(
    pupils.filter(
      (p) =>
        !(
          p.firstName === learnerToArchive.firstName &&
          p.lastName === learnerToArchive.lastName
        )
    )
  );

  setLearnerToArchive(null);
  setShowArchiveModal(false);
}

function toggleArea(area: string) {

  if (selectedAreas.includes(area)) {

    setSelectedAreas(
      selectedAreas.filter((a) => a !== area)
    );

  } else {

    setSelectedAreas([
      ...selectedAreas,
      area,
    ]);

  }
}

  async function handleAnalyse() {
  if (selectedChildren.length === 0) return;
  if (!observation.trim()) return;

  setLoading(true);
  setAnalysis(null);

  try {
    const response = await fetch("/api/analyse-observation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        observation,
        frameworkKey: "eyfs",
        learners: selectedChildren,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed");
    }

    setAnalysis(data);
  } catch (error) {
    console.error(error);
    alert("Something went wrong while analysing the observation.");
  } finally {
    setLoading(false);
  }
}

{/* HEADER */}




  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-7xl"></div>
      <div className="mb-6 flex items-center justify-between">

        </div>

{/* HEADER */}

<div className="mb-8 flex items-start justify-between">

  {/* LEFT SIDE */}

  <div>

    <img
      src="/oasis-logo.png"
      alt="OASIS"
      className="h-48 w-48 object-contain"
    />

    <p className="mt-2 text-sm tracking-[0.25em] text-slate-500">
      OBSERVATION • ASSESSMENT • INSIGHT
    </p>

  </div>

  {/* RIGHT SIDE */}

  <div className="flex items-center gap-3">

    <button
      onClick={() => setShowFrameworkModal(true)}
      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      Upload Framework
    </button>

    <button
      onClick={() => setShowBaselineModal(true)}
      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      Add Baseline
    </button>

<button
  onClick={() => setShowPTCNotes(true)}
  disabled={selectedChildren.length === 0}
  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  PTC Notes
</button>

<button
  onClick={() => setShowReportHelper(true)}
  disabled={selectedChildren.length === 0}
  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  Report Helper
</button>

    <button
      onClick={() => setShowTodaysFocus(true)}
      className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-slate-700"
    >
      Today's Focus
    </button>



  </div>

</div>

<div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">

  <div className="mb-4 flex items-center justify-between">

    <div className="mb-4 flex items-center justify-between">

  <div className="flex items-center gap-3">

    <h2 className="text-xl font-bold text-slate-900">
      Learners
    </h2>

    <button
      onClick={() => setShowManageLearners(true)}
      className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      Manage
    </button>

  </div>



</div>

    <p className="text-sm text-slate-500">
      Select one or more learners
    </p>

  </div>

  <div className="flex flex-wrap gap-6">

    {pupils.map((child) => (
      <button
        key={`${child.firstName}-${child.lastName}`}
        onClick={() =>
  toggleChild(`${child.firstName} ${child.lastName}`)
}
        className="group relative flex flex-col items-center"
      >

        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition ${
            selectedChildren.includes(
  `${child.firstName} ${child.lastName}`
)
              ? "border-blue-500 bg-slate-300"
              : "border-slate-200 bg-slate-300"
          }`}
        >

          <span className="text-xl font-bold text-slate-600">
  {(child.firstName[0] + child.lastName[0]).toUpperCase()}
</span>

          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              child.status === "green"
                ? "bg-green-500"
                : child.status === "yellow"
                ? "bg-yellow-400"
                : "bg-red-500"
            }`}
          />

        </div>

        <span className="mt-2 text-sm text-slate-700">
  {child.firstName}
</span>

<div className="pointer-events-none absolute left-0 top-full z-50 mt-3 hidden w-72 -rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block hover:block">

  <p className="font-semibold text-slate-900">
    {child.firstName} {child.lastName}
  </p>

  <p className="mt-1 text-xs text-slate-500">
    Last Observation • {child.lastObservationDate}
  </p>

  <p className="mt-3 text-sm text-slate-700">
    {child.lastObservation}
  </p>

  <div className="mt-3 flex flex-wrap items-center gap-2">

  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
    {child.lastLevel}
  </span>

  {child.send && (
    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
      ⭐ SEND
    </span>
  )}

  {child.eal && (
    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
      🌍 EAL
    </span>
  )}

  {child.gifted && (
    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
      🚀 Gifted
    </span>
  )}

</div>

</div>

      </button>
    ))}

   <button
  onClick={() => setShowAddLearnerModal(true)}
  className="flex flex-col items-center"
>

      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-slate-100">

        <span className="text-3xl text-slate-500">
          +
        </span>

      </div>

      <span className="mt-2 text-sm text-slate-700">
        Add Learner
      </span>

    </button>

  </div>

</div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">

  <button
    onClick={() => setShowObservationPanel(!showObservationPanel)}
    className="flex w-full items-center justify-between"
  >
    <h2 className="text-2xl font-bold text-slate-900">
      New Observation
    </h2>

    <span className="text-2xl text-slate-500">
      {showObservationPanel ? "⌃" : "⌄"}
    </span>
  </button>

  {showObservationPanel && (
    <div className="mt-6">

      <div>
        <label className="block text-sm font-semibold text-slate-700">
          Observation
        </label>

        <textarea
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          style={{
            color: "#000000",
            WebkitTextFillColor: "#000000",
            opacity: 1,
          }}
          className="mt-2 h-56 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
          placeholder="Type or paste an observation..."
        />

        <div className="mt-4">

  <label className="cursor-pointer">

    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">

      📷 Add Photo Evidence

    </div>

    <input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) =>
    setEvidenceImage(
      e.target.files?.[0] || null
    )
  }
/>

  </label>

</div>

{evidenceImage && (

  <div className="mt-4">

    <div className="relative inline-block">

      <img
        src={URL.createObjectURL(evidenceImage)}
        alt="Evidence"
        className="max-h-48 rounded-2xl border border-slate-200"
      />

      <button
        onClick={() => {
  setEvidenceImage(null);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
      >
        X
      </button>

    </div>

    <p className="mt-2 text-sm text-slate-500">
      {evidenceImage.name}
    </p>

  </div>

)}
      </div>

      {selectedChildren.length === 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Please select one or more learners before analysing evidence.
          </p>
        </div>
      )}

      <button
        onClick={handleAnalyse}
        disabled={loading || selectedChildren.length === 0}
        className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {loading ? "Analysing..." : "Analyse Observation"}
      </button>

    </div>
  )}

</div>

        {showObservationPanel && (
  <div className="mt-8">

          {loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <p className="text-lg font-medium text-slate-700">
                ⏳ Analysing observation...
              </p>
            </div>
          )}

          {analysis && (
            <>
              <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Analysis For</p>

                   <p className="text-2xl font-bold text-slate-900">
  {selectedChildren.length > 0
    ? selectedChildren.join(", ")
    : "No Learners Selected"}
</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">Assessment Status</p>

                    <p className="font-semibold text-emerald-600">Complete</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="text-sm text-slate-500">AI Confidence</p>

                  <p className="mt-2 text-5xl font-bold text-slate-900">
                    {analysis.confidence}%
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">

  <div className="flex items-center justify-between">
    <p className="text-sm text-slate-500">
      Suggested Level
    </p>

    <button
      onClick={() => setShowOverrideModal(true)}
      className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      Override
    </button>
  </div>

  <p className="mt-2 text-3xl font-bold text-slate-900">
    {analysis.level}
  </p>

</div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="mb-4 text-sm text-slate-500">
                    Framework Matches
                  </p>

                  <div className="space-y-4">
                    {analysis.frameworkMatches.map((match) => (
                      <div key={match.strand}>
                        <p className="font-semibold text-slate-900">
                          {match.strand}
                        </p>

                        <ul className="ml-5 mt-1 list-disc text-slate-700">
                          {match.objectives.map((objective) => (
                            <li key={objective}>{objective}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="mb-4 text-sm text-slate-500">Next Steps</p>

                  <ul className="ml-5 list-disc space-y-2 text-slate-700">
                    {analysis.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        )}

        <div className="my-8 flex items-center gap-4">
</div>

{selectedChildren.length <= 1 && (
<div className="mt-8 w-full">

  <div className="my-8 flex w-full items-center gap-4">

    <div className="h-px flex-1 bg-slate-200" />

    <h2 className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
      Learner Overview
    </h2>

    <div className="h-px flex-1 bg-slate-200" />

  </div>

  {selectedChildren.length !== 1 ? (

    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">

      <h3 className="text-lg font-semibold text-slate-900">
        No Learner Selected
      </h3>

      <p className="mt-2 text-slate-500">
        Select one learner above to view progress, evidence coverage,
        learning journey and assessment snapshots.
      </p>

    </div>

  ) : (

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900">
              Learner Progress
            </h2>

            <p className="text-sm font-medium text-slate-500">
  For {selectedChildren.join(", ")}
</p>

<p className="mt-1 text-slate-500">
  Current attainment across learning areas
</p>

            <div className="mt-8 space-y-5">
              {pupilProgress.map((item) => (
                <div key={item.area}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-slate-900">
                      {item.area}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        item.level === "Exceeding"
                          ? "bg-blue-100 text-blue-700"
                          : item.level === "Secure"
                          ? "bg-green-100 text-green-700"
                          : item.level === "Developing"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {item.level}
                    </span>
                  </div>

                  <div className="h-3 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        item.level === "Exceeding"
                          ? "bg-blue-500"
                          : item.level === "Secure"
                          ? "bg-green-500"
                          : item.level === "Developing"
                          ? "bg-yellow-500"
                          : "bg-purple-500"
                      }`}
                      style={{
                        width: `${item.score}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                 <h2 className="text-2xl font-bold text-slate-900">
  Evidence Coverage
</h2>

<p className="text-sm font-medium text-slate-500">
  For {selectedChildren.join(", ")}
</p>

<p className="mt-1 text-slate-500">
  Assessment evidence collected
</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">Total</p>

                  <p className="text-3xl font-bold text-slate-900">
                    {evidenceCoverage.reduce(
                      (sum, item) => sum + item.count,
                      0
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex h-56 items-end gap-4 border-b border-slate-200 pb-4">
                {evidenceCoverage.map((item) => (
                  <div
                    key={item.area}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className="w-10 rounded-t-xl bg-slate-900 transition-all hover:bg-slate-700"
                      style={{
                        height: `${Math.max(
                          (item.count / maxEvidenceCount) * 170,
                          20
                        )}px`,
                      }}
                    />

                    <div className="pointer-events-none absolute bottom-full mb-3 hidden w-44 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">
                      <p className="font-bold text-slate-900">{item.area}</p>

                      <p className="mt-1 text-xs font-medium text-slate-900">
                        {item.count} observations
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Last added: {item.lastAdded}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-8 gap-2 text-center text-xs font-semibold text-slate-500">
                {evidenceCoverage.map((item) => (
                  <span key={item.area}>{item.short}</span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
  Learning Journey
</h2>

<p className="text-sm font-medium text-slate-500">
  For {selectedChildren.join(", ")}
</p>

<p className="mt-1 text-slate-500">
  Progress across observations
</p>
                </div>

                <select
                  value={selectedJourney}
                  onChange={(e) => setSelectedJourney(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-black"
                >
                  <option>Overall</option>
                  <option>Mathematics</option>
                  <option>Communication</option>
                  <option>Research Skills</option>
                  <option>Critical Thinking</option>
                  <option>Creativity</option>
                  <option>Physical</option>
                  <option>Social Skills</option>
                  <option>Self-Management</option>
                </select>
              </div>

              <div className="mt-6">
                <svg viewBox="0 0 420 230" className="h-72 w-full">
                  {[35, 85, 135, 185].map((y) => (
                    <line
                      key={y}
                      x1="95"
                      y1={y}
                      x2="390"
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                  ))}

                  <text x="8" y="39" fontSize="12" fill="#64748b">
                    Exceeding
                  </text>
                  <text x="8" y="89" fontSize="12" fill="#64748b">
                    Secure
                  </text>
                  <text x="8" y="139" fontSize="12" fill="#64748b">
                    Developing
                  </text>
                  <text x="8" y="189" fontSize="12" fill="#64748b">
                    Below
                  </text>

                  <polyline
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="3"
                    points={journeyPoints}
                  />

                  {journey.map((point, index) => {
                    const x = 110 + index * 65;
                    const y = levelToY(point.level);

                    return (
                      <g key={point.label}>
                        <circle
  cx={x}
  cy={y}
  r="8"
  fill="#0f172a"
  stroke="white"
  strokeWidth="3"
  className="cursor-pointer"
  onClick={() =>
    setSelectedEvidence(evidenceDetails[index])
  }
/>
                          

                        <text
                          x={x}
                          y="218"
                          textAnchor="middle"
                          fontSize="12"
                          fill="#64748b"
                        >
                          {point.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>

        
        )}

      </div>

)}

{selectedChildren.length === 1 && (
  <>
    {/* ASSESSMENT SNAPSHOT */}

    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Assessment Snapshot
          </h2>

          <p className="text-sm font-medium text-slate-500">
            For {selectedChildren.join(", ")}
          </p>

          <p className="mt-1 text-slate-500">
            Compare progress across different assessment points.
          </p>
        </div>

        <div className="flex gap-3">

          <select
            value={snapshotFrom}
            onChange={(e) => setSnapshotFrom(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-black"
          >
            <option>Baseline</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Current</option>
          </select>

          <span className="flex items-center text-slate-500">
            →
          </span>

          <select
            value={snapshotTo}
            onChange={(e) => setSnapshotTo(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-black"
          >
            <option>Current</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>End of Year</option>
          </select>

        </div>

      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">

        {snapshotData.map((item) => (

          <div
            key={item.area}
            className="rounded-2xl bg-slate-50 p-4"
          >

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.area}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.baseline} → {item.current}
                </p>
              </div>

              <div>

                {item.change > 0 ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    ▲ +{item.change}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    ▬ No Change
                  </span>
                )}

              </div>

            </div>

            <div className="mt-4">

              <div className="relative h-2 rounded-full bg-slate-200">

                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400 shadow"
                  style={{ left: "15%" }}
                />

                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow"
                  style={{ left: `${15 + item.change * 25}%` }}
                />

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
</>
)}

<div className="my-10 flex items-center gap-4">

  <div className="h-px flex-1 bg-slate-200" />

  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
    Class Insights
  </h2>

  <div className="h-px flex-1 bg-slate-200" />

</div>

<div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">

{/* CLASS INSIGHTS */}

<div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">

  <div>
    <h2 className="text-2xl font-bold text-slate-900">
      Class Insights
    </h2>

    <p className="mt-1 text-slate-500">
      Distribution of learners across attainment levels.
    </p>
  </div>

  <div className="mt-6 flex flex-wrap gap-2">

    {Object.keys(classInsights).map((area) => (

      <button
        key={area}
        onClick={() => toggleArea(area)}
        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
          selectedAreas.includes(area)
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {area}
      </button>

    ))}

  </div>

  <div className="mt-8 space-y-8">

    {selectedAreas.map((area) => {

      const data =
        classInsights[
          area as keyof typeof classInsights
        ];

      const total =
  data.Below.count +
  data.Developing.count +
  data.Secure.count +
  data.Exceeding.count;

      return (

        <div key={area}>

          <div className="mb-2 flex items-center justify-between">

            <h3 className="font-semibold text-slate-900">
              {area}
            </h3>

            <span className="text-sm text-slate-500">
              {total} Learners
            </span>

          </div>

          <div className="flex h-5 overflow-hidden rounded-full">

            <div
              className="bg-purple-400"
              style={{
                width: `${(data.Below.count / total) * 100}%`,
              }}
            />

            <div
              className="bg-yellow-400"
              style={{
                width: `${(data.Developing.count / total) * 100}%`,
              }}
            />

            <div
              className="bg-green-500"
              style={{
                width: `${(data.Secure.count / total) * 100}%`,
              }}
            />

            <div
              className="bg-blue-500"
              style={{
                width: `${(data.Exceeding.count / total) * 100}%`,
              }}
            />

          </div>

          <div className="mt-3 grid grid-cols-4 text-sm">

            <div className="group relative">

  <span className="font-medium text-purple-500">
    Below
  </span>

  <p className="font-medium text-slate-900">
    {data.Below.count}
  </p>

  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">

    <p className="font-semibold text-slate-900">
      Below
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {data.Below.count} learners
    </p>

    <div className="mt-3 space-y-1 text-sm text-slate-700">

      {data.Below.learners.map((learner) => (
        <p key={learner}>
          {learner}
        </p>
      ))}

    </div>

  </div>

</div>

            <div className="group relative">

  <span className="font-medium text-yellow-500">
    Developing
  </span>

  <p className="font-medium text-slate-900">
    {data.Developing.count}
  </p>

  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">

    <p className="font-semibold text-slate-900">
    Developing
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {data.Developing.count} learners
    </p>

    <div className="mt-3 space-y-1 text-sm text-slate-700">

      {data.Developing.learners.map((learner) => (
        <p key={learner}>
          {learner}
        </p>
      ))}

    </div>

  </div>

</div>


           <div className="group relative">

  <span className="font-medium text-green-500">
    Secure
  </span>

  <p className="font-medium text-slate-900">
    {data.Secure.count}
  </p>

  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">

    <p className="font-semibold text-slate-900">
      Secure
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {data.Secure.count} learners
    </p>

    <div className="mt-3 space-y-1 text-sm text-slate-700">

      {data.Secure.learners.map((learner) => (
        <p key={learner}>
          {learner}
        </p>
      ))}

    </div>

  </div>

</div>

          <div className="group relative">

  <span className="font-medium text-blue-500">
    Exceeding
  </span>

  <p className="font-medium text-slate-900">
    {data.Exceeding.count}
  </p>

  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">

    <p className="font-semibold text-slate-900">
      Exceeding
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {data.Exceeding.count} learners
    </p>

    <div className="mt-3 space-y-1 text-sm text-slate-700">

      {data.Exceeding.learners.map((learner) => (
        <p key={learner}>
          {learner}
        </p>
      ))}

    </div>

  </div>

</div>

          </div>

        </div>

      );
    })}

  </div>

</div>

</div>

{showOverrideModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Teacher Confirmation
          </h2>

          <p className="mt-2 text-slate-500">
            Review the AI suggested level and confirm your teacher judgement.
          </p>
        </div>

        <button
          onClick={() => setShowOverrideModal(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <p className="text-sm text-slate-500">
          AI Suggested
        </p>

        <p className="mt-1 text-xl font-bold text-slate-900">
          {analysis?.level}
        </p>

      </div>

      <div className="mt-8">

        <p className="text-sm font-semibold text-slate-700">
          Teacher Judgement
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">

          {["Below", "Developing", "Secure", "Exceeding"].map((level) => (
            <button
              key={level}
              onClick={() => setTeacherLevel(level)}
              className={`rounded-xl border px-4 py-3 font-medium ${
                teacherLevel === level
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {level}
            </button>
          ))}

        </div>

      </div>

      <div className="mt-8">

        <label className="block text-sm font-semibold text-slate-700">
          Reason for override
        </label>

        <textarea
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          className="mt-2 h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
          placeholder="Optional: add context for your judgement..."
        />

      </div>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowOverrideModal(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700"
        >
          Cancel
        </button>

        <button
          onClick={() => setShowOverrideModal(false)}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          Confirm Override
        </button>

      </div>

    </div>

  </div>
)}

{showArchiveModal && learnerToArchive && (

  <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

      <h2 className="text-2xl font-bold text-slate-900">
        Archive Learner
      </h2>

      <p className="mt-4 text-slate-600">
        Are you sure you want to archive:
      </p>

      <p className="mt-2 font-semibold text-slate-900">
        {learnerToArchive.firstName} {learnerToArchive.lastName}
      </p>

      <p className="mt-4 text-sm text-slate-500">
        Archived learners can be restored later.
      </p>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => {
            setShowArchiveModal(false);
            setLearnerToArchive(null);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2"
        >
          Cancel
        </button>

        <button
          onClick={confirmArchiveLearner}
          className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Archive Learner
        </button>

      </div>

    </div>

  </div>

)}

{showManageLearners && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Manage Learners
          </h2>

          <p className="mt-2 text-slate-500">
            Edit or archive learners.
          </p>
        </div>

        <button
          onClick={() => setShowManageLearners(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 space-y-3">

        {pupils.map((child, index) => (

          <div
            key={index}
            className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
          >

            <div>

              <p className="font-semibold text-slate-900">
                {child.firstName} {child.lastName}
              </p>

              <p className="text-sm text-slate-500">
                Status: {child.status}
              </p>

            </div>

            <div className="flex gap-2">

             <button
  onClick={() => {

    setEditingIndex(index);

    setNewLearnerFirstName(child.firstName);
    setNewLearnerLastName(child.lastName);
    setShowManageLearners(false);
    setShowAddLearnerModal(true);

  }}
  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
>
  Edit
</button>

              <button
  onClick={() => {
    setLearnerToArchive(child);
    setShowArchiveModal(true);
  }}
  className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
>
  Archive
</button>

            </div>

          </div>

        ))}

      </div>

    </div>

  </div>
)}

{showAddLearnerModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {editingIndex !== null
  ? "Edit Learner"
  : "Add Learner"}
          </h2>

          <p className="mt-2 text-slate-500">
            Create a new learner profile.
          </p>
        </div>

        <button
          onClick={() => setShowAddLearnerModal(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 space-y-6">

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            First Name
          </label>

          <input
            value={newLearnerFirstName}
            onChange={(e) =>
              setNewLearnerFirstName(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
            placeholder="Matthew"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            Last Name
          </label>

          <input
            value={newLearnerLastName}
            onChange={(e) =>
              setNewLearnerLastName(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
            placeholder="Smith"
          />
        </div>

<div className="mt-6">

  <p className="mb-3 text-sm font-semibold text-slate-700">
    Learner Flags
  </p>

  <div className="space-y-3">

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isSEND}
        onChange={(e) => setIsSEND(e.target.checked)}
      />
      <span>⭐ SEND</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isEAL}
        onChange={(e) => setIsEAL(e.target.checked)}
      />
      <span>🌍 EAL</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isGifted}
        onChange={(e) => setIsGifted(e.target.checked)}
      />
      <span>🚀 Gifted</span>
    </label>

  </div>

</div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            Date of Birth
          </label>

          <input
            type="date"
            value={newLearnerDob}
            onChange={(e) =>
              setNewLearnerDob(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
          />
        </div>

      </div>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowAddLearnerModal(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700"
        >
          Cancel
        </button>

        <button
  onClick={handleAddLearner}
  className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
>
  {editingIndex !== null
  ? "Update Learner"
  : "Save Learner"}
</button>

      </div>

    </div>

  </div>
)}
      
      {showFrameworkModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Upload Framework
          </h2>

          <p className="mt-2 text-slate-500">
            Import your school's assessment framework.
          </p>
        </div>

        <button
          onClick={() => setShowFrameworkModal(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center">

        <div className="mx-auto max-w-md">

          <h3 className="text-xl font-bold text-slate-900">
            Drop Framework Here
          </h3>

          <p className="mt-3 text-slate-500">
            PDF, Word, Excel or curriculum document
          </p>

          <button className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700">
            Browse Files
          </button>

        </div>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl bg-slate-100 p-5">
          <h3 className="font-bold text-slate-900">
            Detect Strands
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            AI identifies learning areas and categories automatically.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-5">
          <h3 className="font-bold text-slate-900">
            Detect Objectives
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Learning objectives are extracted and organised.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-5">
          <h3 className="font-bold text-slate-900">
            Choose Assessment Scale and Philosophy
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            This will setup the UI to your school bespoke needs.
          </p>
        </div>

      </div>

      <div className="mt-8 rounded-2xl bg-blue-50 p-5">

  <h3 className="font-bold text-slate-900">
    Example AI Workflow
  </h3>

  <div className="mt-3 text-sm text-slate-700">

    <p>Uploaded framework:</p>

    <p className="mt-2 font-medium">
      Early Years Learning Framework.pdf
    </p>

    <div className="mt-4 rounded-xl bg-white p-4">

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <p>✓ 8 strands detected</p>
          <p>✓ 62 objectives detected</p>
        </div>

      </div>

      <div className="my-6 border-t border-slate-200" />

      <h3 className="text-lg font-semibold text-slate-900">
        Assessment Scale
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Choose or create the attainment levels your school uses.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">

        {[
          "Below / Developing / Secure / Exceeding",
          "Working Towards / At / Above",
          "Emerging / Expected / Exceeding",
          "Custom Scale",
        ].map((scale) => (
          <button
            key={scale}
            onClick={() => setAssessmentScale(scale)}
            className={`rounded-xl border p-4 text-left text-sm font-medium ${
              assessmentScale === scale
                ? "border-slate-900 bg-slate-100 text-slate-900"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {scale}
          </button>
        ))}

      </div>

      {assessmentScale === "Custom Scale" && (
        <div className="mt-6 rounded-2xl bg-slate-50 p-5">

          <h4 className="font-semibold text-slate-900">
            Custom Levels
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Start with three levels and add more if needed.
          </p>

          <div className="mt-4 space-y-3">

            {customLevels.map((level, index) => (
              <input
                key={index}
                value={level}
                onChange={(e) => {
                  const updated = [...customLevels];
                  updated[index] = e.target.value;
                  setCustomLevels(updated);
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
                placeholder={`Level ${index + 1}`}
              />
            ))}

          </div>

          <button
            onClick={() =>
              setCustomLevels([
                ...customLevels,
                `Level ${customLevels.length + 1}`,
              ])
            }
            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Add Level
          </button>

        </div>
        
      )}

<div className="mt-8 border-t border-slate-200 pt-6">

  <h3 className="text-lg font-semibold text-slate-900">
    Assessment Philosophy
  </h3>

  <p className="mt-1 text-sm text-slate-500">
    Choose how progress should be tracked throughout the year.
  </p>

  <div className="mt-4 space-y-3">

  </div>

<button
  onClick={() => setAssessmentPhilosophy("Fixed")}
  className={`w-full rounded-xl border p-4 text-left ${
    assessmentPhilosophy === "Fixed"
      ? "border-slate-900 bg-slate-100"
      : "border-slate-300 bg-white"
  }`}
>
  <p className="font-medium">
    Fixed Progression
  </p>

  <p className="mt-1 text-sm text-slate-500">
    Example: Developing → Secure → Exceeding
  </p>
</button>

<button
  onClick={() => setAssessmentPhilosophy("Rolling")}
  className={`w-full rounded-xl border p-4 text-left ${
    assessmentPhilosophy === "Rolling"
      ? "border-slate-900 bg-slate-100"
      : "border-slate-300 bg-white"
  }`}
>
  <p className="font-medium">
    Rolling Expectations
  </p>

  <p className="mt-1 text-sm text-slate-500">
    Example: Secure → Secure → Secure
  </p>
</button>

      <button
  onClick={() => setAssessmentPhilosophy("Hybrid")}
  className={`w-full rounded-xl border p-4 text-left ${
    assessmentPhilosophy === "Hybrid"
      ? "border-slate-900 bg-slate-100"
      : "border-slate-300 bg-white"
  }`}
>
  <div className="flex items-center gap-2">

    <p className="font-medium">
      Hybrid
    </p>

    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
      Recommended
    </span>

  </div>

  <p className="mt-1 text-sm text-slate-500">
    Track both attainment and growth separately.
  </p>
</button>

</div>
</div>


<div className="mt-8 border-t border-slate-200 pt-6">

  <div className="flex justify-end">

    <button
      className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700"
    >
      Convert Framework
    </button>

  </div>

</div>
    </div>

  </div>

</div>

        </div>



)}
      {showBaselineModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Add Baseline Data
          </h2>

          <p className="mt-2 text-slate-500">
            Import existing learner attainment and assessment information.
          </p>
        </div>

        <button
          onClick={() => setShowBaselineModal(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 p-6">

          <h3 className="text-lg font-bold text-slate-900">
            Whole Class Baseline
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Import assessment data for an entire class.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">

            <p className="font-medium text-slate-700">
              Drop CSV, Excel, PDF or report here
            </p>

            <p className="mt-2 text-sm text-slate-500">
              or click to browse
            </p>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 p-6">

          <h3 className="text-lg font-bold text-slate-900">
            Individual Learner
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Import assessment information for one learner.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">

            <p className="font-medium text-slate-700">
              Drop report here
            </p>

            <p className="mt-2 text-sm text-slate-500">
              PDF, DOCX or assessment summary
            </p>

          </div>

        </div>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <h3 className="font-bold text-slate-900">
          Future AI Import
        </h3>

        <p className="mt-2 text-slate-700">
          OASIS will automatically identify learners, learning areas,
          attainment levels and baseline judgements from uploaded reports.
        </p>

      </div>

    </div>

  </div>
)}
      {selectedEvidence && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Evidence Detail
          </h2>

          <p className="text-slate-500">
            {selectedEvidence.month}
          </p>
        </div>

        <button
          onClick={() => setSelectedEvidence(null)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-6 space-y-5">

        <div>
          <p className="text-sm text-slate-500">
            Learning Area
          </p>

          <p className="font-semibold text-slate-900">
            {selectedEvidence.area}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">
            Suggested Level
          </p>

          <p className="font-semibold text-slate-900">
            {selectedEvidence.level}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">
            AI Confidence
          </p>

          <p className="font-semibold text-slate-900">
            {selectedEvidence.confidence}%
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">
            Observation
          </p>

          <div className="mt-2 rounded-2xl bg-slate-100 p-4 text-slate-900">
            {selectedEvidence.observation}
          </div>
        </div>

      </div>

    </div>

  </div>
)}

{showReportHelper && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Export Report Helper
          </h2>

          <p className="mt-2 text-slate-500">
            Generate report writing support for the selected learners.
          </p>
        </div>

        <button
          onClick={() => setShowReportHelper(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <h3 className="font-semibold text-slate-900">
          Selected Learners
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedChildren.map((child) => (
            <span
              key={child}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              {child}
            </span>
          ))}
        </div>

      </div>

      <p className="mt-6 text-sm text-slate-500">
        OASIS will generate one report helper sheet per selected learner.
      </p>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowReportHelper(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700"
        >
          Cancel
        </button>

        <button
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          Export PDF
        </button>

      </div>

    </div>

  </div>
)}

{showTodaysFocus && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Today's Focus
          </h2>

          <p className="mt-1 text-slate-500">
            Daily priorities based on missing evidence and learner needs.
          </p>
        </div>

        <button
          onClick={() => setShowTodaysFocus(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-900">
            Learners to Notice
          </h3>

          <div className="mt-4 space-y-4 text-slate-800">
            <div>
              <p className="font-semibold">Matthew</p>
              <p className="text-sm text-slate-600">
                Look for self-management evidence during independent learning.
              </p>
            </div>

            <div>
              <p className="font-semibold">Emma</p>
              <p className="text-sm text-slate-600">
                Collect mathematics evidence linked to measuring and comparing.
              </p>
            </div>

            <div>
              <p className="font-semibold">Lucas</p>
              <p className="text-sm text-slate-600">
                Observe communication during group discussion.
              </p>
            </div>

            <div>
              <p className="font-semibold">Olivia</p>
              <p className="text-sm text-slate-600">
                Look for creativity evidence during provision time.
              </p>
            </div>

            <div>
              <p className="font-semibold">Noah</p>
              <p className="text-sm text-slate-600">
                Check research skills during inquiry exploration.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-100 p-5">
            <h3 className="text-lg font-bold text-slate-900">
              Class Focus
            </h3>

            <p className="mt-3 text-slate-800">
              80% of learners need more recent evidence in Physical and
              Creativity.
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Suggested focus: outdoor learning, construction, role play, and
              open-ended creative tasks.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 p-5">
            <h3 className="text-lg font-bold text-slate-900">
              Evidence Gaps
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-800">
              <li>Physical: low evidence across the class</li>
              <li>Creativity: limited recent observations</li>
              <li>Self-Management: inconsistent evidence for 5 learners</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-100 p-5">
            <h3 className="text-lg font-bold text-slate-900">
              Suggested Teaching Lens
            </h3>

            <p className="mt-3 text-slate-800">
              During today’s provision, prioritise noticing how learners plan,
              persist, collaborate and explain their choices.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

{showPTCNotes && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Export PTC Notes
          </h2>

          <p className="mt-2 text-slate-500">
            Generate parent-teacher conference notes for the selected learners.
          </p>
        </div>

        <button
          onClick={() => setShowPTCNotes(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <h3 className="font-semibold text-slate-900">
          Selected Learners
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedChildren.map((child) => (
            <span
              key={child}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              {child}
            </span>
          ))}
        </div>

      </div>

      <p className="mt-6 text-sm text-slate-500">
        OASIS will generate one PTC note sheet per selected learner.
      </p>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowPTCNotes(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700"
        >
          Cancel
        </button>

        <button
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          Export PDF
        </button>

      </div>

    </div>

  </div>
)}

    </main>
  );
}