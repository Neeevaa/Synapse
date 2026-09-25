// frontend/lib/meetingWorkflow.ts
// Pure workflow derivation and helper logic for Meeting Intelligence

export type WorkflowStateCode =
  | "STATE_A" // Step 1: Transcript
  | "STATE_B" // Step 2: AI Analysis (Queued / Running)
  | "STATE_C" // Step 3: Review Intelligence (Completed, awaiting human review)
  | "STATE_D" // Step 4: Review Action Items (Human reviewing action items & suggestions)
  | "STATE_E" // Step 5: Task Conversion (All decisions made, converting to project tasks)
  | "STATE_F" // Step 6: Complete (All suggestions resolved & required tasks created)
  | "STATE_ERROR"; // Analysis failed (blocked with retry)

export interface SuggestionData {
  id: string;
  title: string;
  description: string;
  priority: string;
  workstream?: string | null;
  story_points?: number | null;
  suggested_assignee_id?: string | null;
  suggested_assignee_name?: string | null;
  suggested_due_date?: string | null;
  human_decision: "PENDING" | "ACCEPTED" | "MODIFIED" | "REJECTED";
  created_task_id?: string | null;
  created_action_item_id?: string | null;
  human_comment?: string | null;
}

export interface AnalysisData {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  model_name?: string | null;
  summary?: string | null;
  decisions?: string[];
  risks?: string[];
  task_suggestions: SuggestionData[];
}

export interface WorkflowDerivationResult {
  stateCode: WorkflowStateCode;
  naturalStepId: "transcript" | "analysis" | "review" | "actions" | "tasks" | "complete";
  progressPercent: number;
  isAnalysisRunning: boolean;
  isAnalysisFailed: boolean;
  canRunAnalysis: boolean;
  totalSuggestions: number;
  pendingSuggestionsCount: number;
  acceptedOrModifiedCount: number;
  allConverted: boolean;
}

export interface DeriveMeetingWorkflowParams {
  hasTranscript: boolean;
  latestAnalysis: AnalysisData | null;
  isAnalyzing?: boolean;
  intelligenceReviewed?: boolean;
}

/**
 * Derives the workflow state and natural step ID according to the 6 discrete states (A through F + ERROR).
 *
 * Step 1: Transcript (STATE_A - 0%)
 * Step 2: AI Analysis (STATE_B / STATE_ERROR - 20%)
 * Step 3: Review Intelligence (STATE_C - 40%) - explicit "Continue to Action Items" required
 * Step 4: Review Action Items (STATE_D - 60%) - PENDING suggestions exist
 * Step 5: Task Conversion (STATE_E - 80%) - all terminal, awaiting task confirmation
 * Step 6: Complete (STATE_F - 100%) - all terminal and required tasks converted
 */
export function deriveMeetingWorkflowState(
  params: DeriveMeetingWorkflowParams
): WorkflowDerivationResult {
  const { hasTranscript, latestAnalysis, isAnalyzing, intelligenceReviewed } = params;

  // STATE A: No transcript (Step 1)
  if (!hasTranscript) {
    return {
      stateCode: "STATE_A",
      naturalStepId: "transcript",
      progressPercent: 0,
      isAnalysisRunning: false,
      isAnalysisFailed: false,
      canRunAnalysis: false,
      totalSuggestions: 0,
      pendingSuggestionsCount: 0,
      acceptedOrModifiedCount: 0,
      allConverted: false,
    };
  }

  // STATE A: Transcript exists, but analysis has not been triggered yet
  if (!latestAnalysis) {
    if (isAnalyzing) {
      return {
        stateCode: "STATE_B",
        naturalStepId: "analysis",
        progressPercent: 20,
        isAnalysisRunning: true,
        isAnalysisFailed: false,
        canRunAnalysis: false,
        totalSuggestions: 0,
        pendingSuggestionsCount: 0,
        acceptedOrModifiedCount: 0,
        allConverted: false,
      };
    }
    return {
      stateCode: "STATE_A",
      naturalStepId: "transcript",
      progressPercent: 0,
      isAnalysisRunning: false,
      isAnalysisFailed: false,
      canRunAnalysis: true,
      totalSuggestions: 0,
      pendingSuggestionsCount: 0,
      acceptedOrModifiedCount: 0,
      allConverted: false,
    };
  }

  // ERROR: Analysis failed (Step 2 - blocked state with retry action)
  if (latestAnalysis.status === "FAILED") {
    return {
      stateCode: "STATE_ERROR",
      naturalStepId: "analysis",
      progressPercent: 20,
      isAnalysisRunning: false,
      isAnalysisFailed: true,
      canRunAnalysis: true,
      totalSuggestions: 0,
      pendingSuggestionsCount: 0,
      acceptedOrModifiedCount: 0,
      allConverted: false,
    };
  }

  // STATE B: Analysis QUEUED / RUNNING (Step 2)
  if (isAnalyzing || latestAnalysis.status === "QUEUED" || latestAnalysis.status === "RUNNING") {
    return {
      stateCode: "STATE_B",
      naturalStepId: "analysis",
      progressPercent: 20,
      isAnalysisRunning: true,
      isAnalysisFailed: false,
      canRunAnalysis: false,
      totalSuggestions: latestAnalysis.task_suggestions?.length || 0,
      pendingSuggestionsCount: latestAnalysis.task_suggestions?.length || 0,
      acceptedOrModifiedCount: 0,
      allConverted: false,
    };
  }

  // COMPLETED ANALYSIS
  const suggestions = latestAnalysis.task_suggestions || [];
  const totalSuggestions = suggestions.length;
  const pendingSuggestions = suggestions.filter((s) => s.human_decision === "PENDING");
  const acceptedOrModified = suggestions.filter(
    (s) => s.human_decision === "ACCEPTED" || s.human_decision === "MODIFIED"
  );
  const hasPending = pendingSuggestions.length > 0;
  const allTerminal = totalSuggestions === 0 || !hasPending;

  const allAcceptedOrModifiedConverted =
    acceptedOrModified.length === 0 ||
    acceptedOrModified.every((s) => Boolean(s.created_task_id && s.created_task_id.trim().length > 0));

  const allConverted = allTerminal && allAcceptedOrModifiedConverted;

  // STEP 3: Review Intelligence (STATE_C - 40%)
  // Intelligence has not yet been reviewed via explicit human action "Continue to Action Items"
  if (!intelligenceReviewed) {
    return {
      stateCode: "STATE_C",
      naturalStepId: "review",
      progressPercent: 40,
      isAnalysisRunning: false,
      isAnalysisFailed: false,
      canRunAnalysis: true,
      totalSuggestions,
      pendingSuggestionsCount: pendingSuggestions.length,
      acceptedOrModifiedCount: acceptedOrModified.length,
      allConverted,
    };
  }

  // STEP 4: Review Action Items (STATE_D - 60%)
  // Intelligence was reviewed, and PENDING task suggestions still await human decision
  if (hasPending) {
    return {
      stateCode: "STATE_D",
      naturalStepId: "actions",
      progressPercent: 60,
      isAnalysisRunning: false,
      isAnalysisFailed: false,
      canRunAnalysis: true,
      totalSuggestions,
      pendingSuggestionsCount: pendingSuggestions.length,
      acceptedOrModifiedCount: acceptedOrModified.length,
      allConverted: false,
    };
  }

  // STEP 5: Task Conversion (STATE_E - 80%)
  // All suggestions have terminal decisions (ACCEPTED / MODIFIED / REJECTED),
  // but accepted/modified suggestions are waiting for task confirmation/created_task_id
  if (!allAcceptedOrModifiedConverted) {
    return {
      stateCode: "STATE_E",
      naturalStepId: "tasks",
      progressPercent: 80,
      isAnalysisRunning: false,
      isAnalysisFailed: false,
      canRunAnalysis: true,
      totalSuggestions,
      pendingSuggestionsCount: 0,
      acceptedOrModifiedCount: acceptedOrModified.length,
      allConverted: false,
    };
  }

  // STEP 6: Complete (STATE_F - 100%)
  // All suggestions terminal, and every ACCEPTED/MODIFIED suggestion has created_task_id
  return {
    stateCode: "STATE_F",
    naturalStepId: "complete",
    progressPercent: 100,
    isAnalysisRunning: false,
    isAnalysisFailed: false,
    canRunAnalysis: true,
    totalSuggestions,
    pendingSuggestionsCount: 0,
    acceptedOrModifiedCount: acceptedOrModified.length,
    allConverted: true,
  };
}
