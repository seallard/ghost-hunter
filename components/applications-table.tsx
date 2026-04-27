"use client";

import {
  Fragment,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/components/relative-time";
import { ApplicationDetail } from "@/components/application-detail";
import type { ApplicationWithActivity } from "@/lib/applications";
import type { Application, ApplicationEvent } from "@/lib/db/schema";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type Status,
} from "@/lib/applications-status";
import {
  changeApplicationStatusAction,
  clearUploadedFileAction,
  createApplicationAction,
  type CreateApplicationResult,
  deleteApplicationAction,
  updateApplicationFieldsAction,
  updateEventNoteAction,
} from "@/app/actions/applications";

const COLS = 4;

type EditableField = "companyName" | "role";

type AppPatch =
  | { type: "create"; app: ApplicationWithActivity }
  | { type: "delete"; id: string }
  | { type: "status"; id: string; status: Status }
  | { type: "fields"; id: string; fields: Partial<Application> }
  | { type: "clear-cover-letter"; id: string };

type EventPatch =
  | { type: "note"; eventId: string; appId: string; note: string | null }
  | { type: "add-status"; appId: string; status: Status };

function reduceApps(
  state: ApplicationWithActivity[],
  patch: AppPatch,
): ApplicationWithActivity[] {
  switch (patch.type) {
    case "create":
      return [patch.app, ...state];
    case "delete":
      return state.filter((a) => a.id !== patch.id);
    case "status":
      return state.map((a) =>
        a.id === patch.id
          ? { ...a, status: patch.status, lastActivityAt: new Date() }
          : a,
      );
    case "fields":
      return state.map((a) =>
        a.id === patch.id ? { ...a, ...patch.fields } : a,
      );
    case "clear-cover-letter":
      return state.map((a) =>
        a.id === patch.id
          ? {
              ...a,
              coverLetterObjectKey: null,
              coverLetterSizeBytes: null,
              coverLetterMime: null,
            }
          : a,
      );
  }
}

function reduceEvents(
  state: Map<string, ApplicationEvent[]>,
  patch: EventPatch,
): Map<string, ApplicationEvent[]> {
  const next = new Map(state);
  if (patch.type === "note") {
    const list = next.get(patch.appId);
    if (!list) return state;
    next.set(
      patch.appId,
      list.map((e) =>
        e.id === patch.eventId ? { ...e, note: patch.note } : e,
      ),
    );
    return next;
  }
  // add-status: prepend a temp event so the timeline reflects the change
  const tempEvent: ApplicationEvent = {
    id: crypto.randomUUID(),
    applicationId: patch.appId,
    userId: "",
    status: patch.status,
    note: null,
    occurredAt: new Date(),
    createdAt: new Date(),
  };
  next.set(patch.appId, [tempEvent, ...(next.get(patch.appId) ?? [])]);
  return next;
}

export function ApplicationsTable({
  applications,
  eventsByApp,
}: {
  applications: ApplicationWithActivity[];
  eventsByApp: Map<string, ApplicationEvent[]>;
}) {
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    field: EditableField;
  } | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticApps, applyAppPatch] = useOptimistic(
    applications,
    reduceApps,
  );
  const [optimisticEvents, applyEventPatch] = useOptimistic(
    eventsByApp,
    reduceEvents,
  );

  function handleStatusChange(applicationId: string, newStatus: Status) {
    startTransition(async () => {
      applyAppPatch({ type: "status", id: applicationId, status: newStatus });
      applyEventPatch({
        type: "add-status",
        appId: applicationId,
        status: newStatus,
      });
      const result = await changeApplicationStatusAction(
        applicationId,
        newStatus,
      );
      if (!result.ok) console.error("status change failed", result.error);
    });
  }

  function handleFieldEdit(
    applicationId: string,
    field: EditableField,
    value: string,
    original: string,
  ) {
    setEditing(null);
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === original) return;

    startTransition(async () => {
      applyAppPatch({
        type: "fields",
        id: applicationId,
        fields: { [field]: trimmed },
      });
      const result = await updateApplicationFieldsAction({
        applicationId,
        [field]: trimmed,
      });
      if (!result.ok) console.error("update field failed", result.error);
    });
  }

  function handleSaveDetailField(
    applicationId: string,
    key: "jobDescription" | "coverLetterText",
    value: string,
  ) {
    const next = value === "" ? null : value;
    startTransition(async () => {
      applyAppPatch({
        type: "fields",
        id: applicationId,
        fields: { [key]: next },
      });
      const result = await updateApplicationFieldsAction({
        applicationId,
        [key]: next,
      });
      if (!result.ok) console.error("update fields failed", result.error);
    });
  }

  function handleClearCoverLetter(applicationId: string) {
    startTransition(async () => {
      applyAppPatch({ type: "clear-cover-letter", id: applicationId });
      const result = await clearUploadedFileAction({ applicationId });
      if (!result.ok) console.error("clear cover letter failed", result.error);
    });
  }

  function handleSaveNote(appId: string, eventId: string, note: string | null) {
    startTransition(async () => {
      applyEventPatch({ type: "note", appId, eventId, note });
      const result = await updateEventNoteAction({ eventId, note });
      if (!result.ok) console.error("update note failed", result.error);
    });
  }

  function handleDelete(applicationId: string) {
    startTransition(async () => {
      applyAppPatch({ type: "delete", id: applicationId });
      const result = await deleteApplicationAction(applicationId);
      if (!result.ok) console.error("delete failed", result.error);
    });
  }

  async function handleCreate(
    formData: FormData,
  ): Promise<CreateApplicationResult> {
    const companyName = String(formData.get("companyName") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    if (companyName && role) {
      const now = new Date();
      applyAppPatch({
        type: "create",
        app: {
          id: crypto.randomUUID(),
          userId: "",
          companyName,
          role,
          jobDescription: null,
          status: "applied",
          coverLetterText: null,
          coverLetterObjectKey: null,
          coverLetterSizeBytes: null,
          coverLetterMime: null,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        },
      });
    }
    return createApplicationAction(formData);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Company</TableHead>
            <TableHead className="w-[30%]">Role</TableHead>
            <TableHead className="w-[15%]">Status</TableHead>
            <TableHead className="w-[20%]">Last update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adding ? (
            <NewRow onSubmit={handleCreate} onDone={() => setAdding(false)} />
          ) : (
            <TableRow>
              <TableCell colSpan={COLS} className="p-0">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground h-10 w-full justify-start rounded-none px-2 font-normal"
                  onClick={() => setAdding(true)}
                >
                  <Plus className="size-4" />
                  Add application
                </Button>
              </TableCell>
            </TableRow>
          )}
          {optimisticApps.map((app) => {
            const expanded = expandedId === app.id;
            const isEditingCompany =
              editing?.id === app.id && editing.field === "companyName";
            const isEditingRole =
              editing?.id === app.id && editing.field === "role";
            return (
              <Fragment key={app.id}>
                <TableRow
                  data-state={expanded ? "selected" : undefined}
                  className="group cursor-pointer"
                  onClick={() =>
                    setExpandedId((id) => (id === app.id ? null : app.id))
                  }
                >
                  <TableCell
                    className="font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditingCompany) {
                        setEditing({ id: app.id, field: "companyName" });
                      }
                    }}
                  >
                    {isEditingCompany ? (
                      <InlineEditInput
                        defaultValue={app.companyName}
                        onCommit={(value) =>
                          handleFieldEdit(
                            app.id,
                            "companyName",
                            value,
                            app.companyName,
                          )
                        }
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      app.companyName
                    )}
                  </TableCell>
                  <TableCell
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditingRole) {
                        setEditing({ id: app.id, field: "role" });
                      }
                    }}
                  >
                    {isEditingRole ? (
                      <InlineEditInput
                        defaultValue={app.role}
                        onCommit={(value) =>
                          handleFieldEdit(app.id, "role", value, app.role)
                        }
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      app.role
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="cursor-pointer">
                        <Badge variant={STATUS_VARIANTS[app.status]}>
                          {STATUS_LABELS[app.status]}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            disabled={s === app.status}
                            onClick={() => handleStatusChange(app.id, s)}
                          >
                            {STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <RelativeTime date={app.lastActivityAt} />
                      <DeleteButton
                        company={app.companyName}
                        onConfirm={() => handleDelete(app.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLS} className="p-0">
                      <ApplicationDetail
                        application={app}
                        events={optimisticEvents.get(app.id) ?? []}
                        onSaveField={(key, value) =>
                          handleSaveDetailField(app.id, key, value)
                        }
                        onClearCoverLetter={() =>
                          handleClearCoverLetter(app.id)
                        }
                        onSaveNote={(eventId, note) =>
                          handleSaveNote(app.id, eventId, note)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function InlineEditInput({
  defaultValue,
  onCommit,
  onCancel,
}: {
  defaultValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <Input
      autoFocus
      defaultValue={defaultValue}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function DeleteButton({
  company,
  onConfirm,
}: {
  company: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={(props) => (
          <button
            type="button"
            {...props}
            onClick={(e) => {
              e.stopPropagation();
              props.onClick?.(e);
            }}
            aria-label={`Delete ${company}`}
            className="text-muted-foreground hover:text-destructive rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 data-popup-open:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{company}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. The application and its event history will be
            permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NewRow({
  onSubmit,
  onDone,
}: {
  onSubmit: (formData: FormData) => Promise<CreateApplicationResult>;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const promise = onSubmit(formData);
      onDone();
      const result = await promise;
      if (!result.ok) {
        const first =
          result.errors.companyName?.[0] ??
          result.errors.role?.[0] ??
          "Could not save";
        console.error("create application failed", first);
        setError(first);
      }
    });
  }

  return (
    <TableRow>
      <TableCell colSpan={COLS} className="p-0">
        <form
          ref={formRef}
          action={submit}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              const fd = new FormData(e.currentTarget);
              const company = String(fd.get("companyName") ?? "").trim();
              const role = String(fd.get("role") ?? "").trim();
              if (!company && !role) {
                onDone();
                return;
              }
              formRef.current?.requestSubmit();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onDone();
          }}
          className="flex items-center gap-2 px-2 py-1"
        >
          <Input
            name="companyName"
            placeholder="Company"
            autoFocus
            className="w-[35%]"
          />
          <Input name="role" placeholder="Role" className="w-[30%]" />
          <span className="w-[15%]">
            <Badge variant={STATUS_VARIANTS.applied}>
              {STATUS_LABELS.applied}
            </Badge>
          </span>
          <span className="text-muted-foreground w-[20%] text-sm">
            {error ?? "just now"}
          </span>
        </form>
      </TableCell>
    </TableRow>
  );
}
