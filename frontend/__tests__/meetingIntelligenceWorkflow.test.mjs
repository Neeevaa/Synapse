// frontend/__tests__/meetingIntelligenceWorkflow.test.mjs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deriveMeetingWorkflowState } from "../lib/meetingWorkflow.ts";

describe("Meeting Intelligence Workflow & State Machine Tests", () => {
  // 1. NO TRANSCRIPT (STATE A)
  test("State A: No transcript present directs user to Source Transcript (step 1)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: false,
      latestAnalysis: null,
    });

    assert.equal(result.stateCode, "STATE_A");
    assert.equal(result.naturalStepId, "transcript");
    assert.equal(result.progressPercent, 0);
    assert.equal(result.canRunAnalysis, false);
    assert.equal(result.isAnalysisRunning, false);
    assert.equal(result.isAnalysisFailed, false);
  });

  // 2. TRANSCRIPT READY / ANALYSIS NOT RUN (STATE A)
  test("State A: Transcript saved, analysis ready to trigger (step 1)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: null,
      isAnalyzing: false,
    });

    assert.equal(result.stateCode, "STATE_A");
    assert.equal(result.naturalStepId, "transcript");
    assert.equal(result.progressPercent, 0);
    assert.equal(result.canRunAnalysis, true);
    assert.equal(result.isAnalysisRunning, false);
    assert.equal(result.isAnalysisFailed, false);
  });

  // 3. ANALYSIS QUEUED (STATE B)
  test("State B: Analysis in QUEUED state (step 2)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "QUEUED",
        task_suggestions: [],
      },
    });

    assert.equal(result.stateCode, "STATE_B");
    assert.equal(result.naturalStepId, "analysis");
    assert.equal(result.progressPercent, 20);
    assert.equal(result.isAnalysisRunning, true);
    assert.equal(result.canRunAnalysis, false);
  });

  // 4. ANALYSIS RUNNING (STATE B)
  test("State B: Analysis in RUNNING state (step 2)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "RUNNING",
        task_suggestions: [],
      },
    });

    assert.equal(result.stateCode, "STATE_B");
    assert.equal(result.naturalStepId, "analysis");
    assert.equal(result.progressPercent, 20);
    assert.equal(result.isAnalysisRunning, true);
    assert.equal(result.canRunAnalysis, false);
  });

  // 5. ANALYSIS FAILED (STATE ERROR)
  test("State ERROR: Analysis failed triggers blocked state and retry option (step 2)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "FAILED",
        task_suggestions: [],
      },
    });

    assert.equal(result.stateCode, "STATE_ERROR");
    assert.equal(result.naturalStepId, "analysis");
    assert.equal(result.progressPercent, 20);
    assert.equal(result.isAnalysisFailed, true);
    assert.equal(result.isAnalysisRunning, false);
    assert.equal(result.canRunAnalysis, true); // Allows retry
  });

  // 6. COMPLETED ANALYSIS -> REVIEW INTELLIGENCE (STATE C)
  test("State C: Analysis completed with unreviewed suggestions points to Review Intelligence (step 3)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        summary: "Payment consistency and webhook retries",
        decisions: ["Implement idempotency keys", "Add dead-letter queue"],
        risks: ["Race condition in checkout", "Gateway timeout window"],
        task_suggestions: [
          {
            id: "sug-1",
            title: "Implement Idempotency Keys",
            description: "Add idempotency headers for all POST /charges",
            priority: "HIGH",
            human_decision: "PENDING",
            created_task_id: null,
          },
          {
            id: "sug-2",
            title: "Configure Webhook DLQ",
            description: "Set up dead-letter queue for failed webhook deliveries",
            priority: "MEDIUM",
            human_decision: "PENDING",
            created_task_id: null,
          },
        ],
      },
      intelligenceReviewed: false,
    });

    assert.equal(result.stateCode, "STATE_C");
    assert.equal(result.naturalStepId, "review");
    assert.equal(result.progressPercent, 40);
    assert.equal(result.totalSuggestions, 2);
    assert.equal(result.pendingSuggestionsCount, 2);
    assert.equal(result.allConverted, false);
  });

  // 7. COMPLETED ANALYSIS -> HUMAN CONTINUES TO ACTION ITEMS (STATE D)
  test("State D: Completed analysis with intelligence reviewed points to Review Action Items (step 4)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [
          {
            id: "sug-1",
            title: "Implement Idempotency Keys",
            description: "Add idempotency headers for all POST /charges",
            priority: "HIGH",
            human_decision: "PENDING",
            created_task_id: null,
          },
        ],
      },
      intelligenceReviewed: true,
    });

    assert.equal(result.stateCode, "STATE_D");
    assert.equal(result.naturalStepId, "actions");
    assert.equal(result.progressPercent, 60);
    assert.equal(result.pendingSuggestionsCount, 1);
    assert.equal(result.allConverted, false);
  });

  // 8. PENDING SUGGESTIONS IN PROGRESS (STATE D)
  test("State D: Partial decisions made but pending suggestions remain keeps in Review Action Items step (step 4)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [
          {
            id: "sug-1",
            title: "Implement Idempotency Keys",
            description: "Add idempotency headers for all POST /charges",
            priority: "HIGH",
            human_decision: "ACCEPTED",
            created_task_id: "task-101",
          },
          {
            id: "sug-2",
            title: "Configure Webhook DLQ",
            description: "Set up dead-letter queue for failed webhook deliveries",
            priority: "MEDIUM",
            human_decision: "PENDING",
            created_task_id: null,
          },
        ],
      },
      intelligenceReviewed: true,
    });

    assert.equal(result.stateCode, "STATE_D");
    assert.equal(result.naturalStepId, "actions");
    assert.equal(result.progressPercent, 60);
    assert.equal(result.pendingSuggestionsCount, 1);
    assert.equal(result.acceptedOrModifiedCount, 1);
    assert.equal(result.allConverted, false);
  });

  // 9. ACCEPTED SUGGESTION WITHOUT TASK -> TASK CONVERSION (STATE E)
  test("State E: All suggestions terminal but accepted suggestion missing created_task_id stays on Task Conversion (step 5)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [
          {
            id: "sug-1",
            title: "Task 1",
            description: "Desc 1",
            priority: "HIGH",
            human_decision: "ACCEPTED",
            created_task_id: null, // Awaiting task conversion
          },
        ],
      },
      intelligenceReviewed: true,
    });

    assert.equal(result.stateCode, "STATE_E");
    assert.equal(result.naturalStepId, "tasks");
    assert.equal(result.progressPercent, 80);
    assert.equal(result.allConverted, false);
  });

  // 10. MODIFIED SUGGESTION WITHOUT TASK -> TASK CONVERSION (STATE E)
  test("State E: All suggestions terminal but modified suggestion missing created_task_id stays on Task Conversion (step 5)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [
          {
            id: "sug-1",
            title: "Task 1",
            description: "Desc 1",
            priority: "MEDIUM",
            human_decision: "MODIFIED",
            created_task_id: null, // Awaiting task conversion
          },
        ],
      },
      intelligenceReviewed: true,
    });

    assert.equal(result.stateCode, "STATE_E");
    assert.equal(result.naturalStepId, "tasks");
    assert.equal(result.progressPercent, 80);
    assert.equal(result.allConverted, false);
  });

  // 11. ACCEPT ACTION (MOCK BACKEND PATCH BEHAVIOR)
  test("Accept Action: Human accepts suggestion and backend returns converted task", () => {
    const mockBackendPatch = (suggestion, patchBody) => {
      assert.equal(patchBody.human_decision, "ACCEPTED");
      return {
        ...suggestion,
        human_decision: "ACCEPTED",
        created_task_id: "task-auto-gen-77",
        created_action_item_id: "action-item-88",
        human_comment: patchBody.human_comment || null,
      };
    };

    const original = {
      id: "sug-1",
      title: "Add Stripe webhook retry logic",
      description: "Retry up to 5 times with exponential backoff",
      priority: "HIGH",
      human_decision: "PENDING",
      created_task_id: null,
    };

    const updated = mockBackendPatch(original, { human_decision: "ACCEPTED" });
    assert.equal(updated.human_decision, "ACCEPTED");
    assert.equal(updated.created_task_id, "task-auto-gen-77");
    assert.equal(updated.created_action_item_id, "action-item-88");
  });

  // 12. MODIFY ACTION (MOCK BACKEND PATCH BEHAVIOR)
  test("Modify Action: Human modifies suggestion fields and backend returns converted task", () => {
    const mockBackendPatch = (suggestion, patchBody) => {
      assert.equal(patchBody.human_decision, "MODIFIED");
      return {
        ...suggestion,
        title: patchBody.title || suggestion.title,
        description: patchBody.description || suggestion.description,
        priority: patchBody.priority || suggestion.priority,
        workstream: patchBody.workstream || suggestion.workstream,
        story_points: patchBody.story_points ?? suggestion.story_points,
        human_decision: "MODIFIED",
        created_task_id: "task-auto-gen-99",
        human_comment: patchBody.human_comment || "Adjusted scope and priority",
      };
    };

    const original = {
      id: "sug-2",
      title: "Order consistency audit",
      description: "Perform DB checks",
      priority: "LOW",
      workstream: "GENERAL",
      story_points: 1,
      human_decision: "PENDING",
      created_task_id: null,
    };

    const patchPayload = {
      human_decision: "MODIFIED",
      title: "Order consistency audit and automated reconciliation cron",
      priority: "CRITICAL",
      story_points: 5,
      human_comment: "Adjusted scope and priority",
    };

    const updated = mockBackendPatch(original, patchPayload);
    assert.equal(updated.human_decision, "MODIFIED");
    assert.equal(updated.title, "Order consistency audit and automated reconciliation cron");
    assert.equal(updated.priority, "CRITICAL");
    assert.equal(updated.story_points, 5);
    assert.equal(updated.created_task_id, "task-auto-gen-99");
  });

  // 13. REJECT ACTION -> TERMINAL (MOCK BACKEND PATCH BEHAVIOR)
  test("Reject Action: Human rejects suggestion, backend marks REJECTED without task creation (terminal)", () => {
    const mockBackendPatch = (suggestion, patchBody) => {
      assert.equal(patchBody.human_decision, "REJECTED");
      return {
        ...suggestion,
        human_decision: "REJECTED",
        created_task_id: null,
        human_comment: patchBody.human_comment || null,
      };
    };

    const original = {
      id: "sug-3",
      title: "Irrelevant task suggestion",
      description: "Not needed for this milestone",
      priority: "LOW",
      human_decision: "PENDING",
      created_task_id: null,
    };

    const updated = mockBackendPatch(original, {
      human_decision: "REJECTED",
      human_comment: "Out of scope",
    });

    assert.equal(updated.human_decision, "REJECTED");
    assert.equal(updated.created_task_id, null);
    assert.equal(updated.human_comment, "Out of scope");
  });

  // 14. ALL TERMINAL + ALL REQUIRED TASKS CREATED -> COMPLETE (STATE F)
  test("State F: All suggestions decided and accepted/modified converted reaches Complete (step 6)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [
          {
            id: "sug-1",
            title: "Task 1",
            description: "Desc 1",
            priority: "HIGH",
            human_decision: "ACCEPTED",
            created_task_id: "task-1",
          },
          {
            id: "sug-2",
            title: "Task 2",
            description: "Desc 2",
            priority: "MEDIUM",
            human_decision: "MODIFIED",
            created_task_id: "task-2",
          },
        ],
      },
      intelligenceReviewed: true,
    });

    assert.equal(result.stateCode, "STATE_F");
    assert.equal(result.naturalStepId, "complete");
    assert.equal(result.progressPercent, 100);
    assert.equal(result.allConverted, true);
    assert.equal(result.pendingSuggestionsCount, 0);
  });

  // 15. MIXED TERMINAL STATE (ACCEPTED, MODIFIED, REJECTED) -> COMPLETE (STATE F)
  test("State F: Mixed accepted, modified, and rejected terminal state with tasks converted reaches Complete (step 6)", () => {
    const result = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [
          {
            id: "sug-1",
            title: "Task 1",
            description: "Desc 1",
            priority: "HIGH",
            human_decision: "ACCEPTED",
            created_task_id: "task-1",
          },
          {
            id: "sug-2",
            title: "Task 2",
            description: "Desc 2",
            priority: "MEDIUM",
            human_decision: "MODIFIED",
            created_task_id: "task-2",
          },
          {
            id: "sug-3",
            title: "Task 3",
            description: "Desc 3",
            priority: "LOW",
            human_decision: "REJECTED",
            created_task_id: null,
          },
        ],
      },
      intelligenceReviewed: true,
    });

    assert.equal(result.stateCode, "STATE_F");
    assert.equal(result.naturalStepId, "complete");
    assert.equal(result.progressPercent, 100);
    assert.equal(result.allConverted, true);
    assert.equal(result.pendingSuggestionsCount, 0);
  });

  // 16. ZERO SUGGESTIONS CASE -> ADVANCES TO COMPLETE ONCE REVIEWED
  test("Zero suggestions case: Analysis completed with 0 suggestions reaches Complete once reviewed", () => {
    const resultBeforeReview = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [],
      },
      intelligenceReviewed: false,
    });
    assert.equal(resultBeforeReview.stateCode, "STATE_C");
    assert.equal(resultBeforeReview.naturalStepId, "review");
    assert.equal(resultBeforeReview.progressPercent, 40);

    const resultAfterReview = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "analysis-1",
        status: "COMPLETED",
        task_suggestions: [],
      },
      intelligenceReviewed: true,
    });
    assert.equal(resultAfterReview.stateCode, "STATE_F");
    assert.equal(resultAfterReview.naturalStepId, "complete");
    assert.equal(resultAfterReview.progressPercent, 100);
  });

  // 17. DETERMINISTIC PROGRESS PERCENTAGES
  test("Deterministic Progress Percentages: Derives correct step percentages across lifecycle", () => {
    // Step 1: 0%
    const s1 = deriveMeetingWorkflowState({ hasTranscript: false, latestAnalysis: null });
    assert.equal(s1.progressPercent, 0);

    // Step 2: 20%
    const s2 = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: { id: "a1", status: "RUNNING", task_suggestions: [] },
    });
    assert.equal(s2.progressPercent, 20);

    // Step 3: 40%
    const s3 = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: { id: "a1", status: "COMPLETED", task_suggestions: [] },
      intelligenceReviewed: false,
    });
    assert.equal(s3.progressPercent, 40);

    // Step 4: 60%
    const s4 = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "a1",
        status: "COMPLETED",
        task_suggestions: [{ id: "s1", title: "T", description: "D", priority: "HIGH", human_decision: "PENDING" }],
      },
      intelligenceReviewed: true,
    });
    assert.equal(s4.progressPercent, 60);

    // Step 5: 80%
    const s5 = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "a1",
        status: "COMPLETED",
        task_suggestions: [{ id: "s1", title: "T", description: "D", priority: "HIGH", human_decision: "ACCEPTED", created_task_id: null }],
      },
      intelligenceReviewed: true,
    });
    assert.equal(s5.progressPercent, 80);

    // Step 6: 100%
    const s6 = deriveMeetingWorkflowState({
      hasTranscript: true,
      latestAnalysis: {
        id: "a1",
        status: "COMPLETED",
        task_suggestions: [{ id: "s1", title: "T", description: "D", priority: "HIGH", human_decision: "ACCEPTED", created_task_id: "t1" }],
      },
      intelligenceReviewed: true,
    });
    assert.equal(s6.progressPercent, 100);
  });
});
