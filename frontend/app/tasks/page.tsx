"use client";

import ProtectedShell from "@/components/ProtectedShell";
import { CheckSquare, Plus } from "lucide-react";

export default function TasksPage() {
  return (
    <ProtectedShell pageTitle="Tasks">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Tasks Stream</h2>
            <p className="text-sm text-muted-foreground">
              View, organize, and assign task tickets across project boards.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95 cursor-pointer">
            <Plus className="size-4" /> New Task
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <CheckSquare className="size-12 text-muted-foreground mx-auto" />
          <h3 className="mt-4 text-base font-bold text-foreground">No tasks assigned</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Create tasks and delegate items to team leads, developers, or AI agents.
          </p>
        </div>
      </div>
    </ProtectedShell>
  );
}
