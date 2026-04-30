"use client";

import {
  Fragment,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Ghost,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyFilter,
  type SortDir,
  type SortKey,
} from "@/lib/applications-filter";
import { computeStats } from "@/lib/applications-stats";
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
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { RelativeTime } from "@/components/relative-time";
import { UpcomingInterviews } from "@/components/upcoming-interviews";
import {
  ApplicationDetail,
  type FieldKey as DetailFieldKey,
} from "@/components/application-detail";
import type { HeatmapWeek } from "@/lib/applications-heatmap";
import { getUpcomingInterviews } from "@/lib/applications-interviews";
import type { ApplicationWithActivity } from "@/lib/applications";
import type { Application, ApplicationEvent } from "@/lib/db/schema";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_CLASSES,
  type Status,
} from "@/lib/applications-status";
import {
  WORK_MODE_EMOJIS,
  WORK_MODE_LABELS,
} from "@/lib/applications-work-mode";
import {
  changeApplicationStatusAction,
  clearUploadedFileAction,
  createApplicationAction,
  type CreateApplicationResult,
  deleteApplicationAction,
  updateApplicationFieldsAction,
  updateEventAction,
} from "@/app/actions/applications";

const COLS = 5;

type EditableField = "companyName" | "role";

type AppPatch =
  | { type: "create"; app: ApplicationWithActivity }
  | { type: "delete"; id: string }
  | { type: "status"; id: string; status: Status }
  | { type: "fields"; id: string; fields: Partial<Application> }
  | { type: "clear-cover-letter"; id: string };

type EventFieldsUpdate = Partial<
  Pick<ApplicationEvent, "note" | "scheduledAt" | "format">
>;

type EventPatch =
  | {
      type: "fields";
      eventId: string;
      appId: string;
      fields: EventFieldsUpdate;
    }
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
  if (patch.type === "fields") {
    const list = next.get(patch.appId);
    if (!list) return state;
    next.set(
      patch.appId,
      list.map((e) => (e.id === patch.eventId ? { ...e, ...patch.fields } : e)),
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
    scheduledAt: null,
    format: null,
    occurredAt: new Date(),
    createdAt: new Date(),
  };
  next.set(patch.appId, [tempEvent, ...(next.get(patch.appId) ?? [])]);
  return next;
}

export function ApplicationsTable({
  applications,
  eventsByApp,
  heatmapWeeks,
  search,
  onSearchChange,
}: {
  applications: ApplicationWithActivity[];
  eventsByApp: Map<string, ApplicationEvent[]>;
  heatmapWeeks: HeatmapWeek[];
  search: string;
  onSearchChange: (next: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newCompanyDraft, setNewCompanyDraft] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    field: EditableField;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadonlySet<Status>>(
    new Set(),
  );
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "lastActivityAt",
    dir: "desc",
  });
  const [isPending, startTransition] = useTransition();

  function toggleStatusFilter(s: Status) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function clearFilters() {
    onSearchChange("");
    setStatusFilter(new Set());
  }

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
    key: DetailFieldKey,
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

  function handleSaveEvent(
    appId: string,
    eventId: string,
    fields: EventFieldsUpdate,
  ) {
    startTransition(async () => {
      applyEventPatch({ type: "fields", appId, eventId, fields });
      const result = await updateEventAction({ eventId, ...fields });
      if (!result.ok) console.error("update event failed", result.error);
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
          jobUrl: null,
          status: "applied",
          workMode: null,
          salary: null,
          contact: null,
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

  const draftCompany = newCompanyDraft.trim();
  const filterByDraft = adding && draftCompany !== "";
  const visibleApps = applyFilter(
    optimisticApps,
    filterByDraft
      ? { search: draftCompany, statuses: new Set(), sort }
      : { search, statuses: statusFilter, sort },
  );
  const stats = computeStats(optimisticApps);
  const upcomingInterviews = getUpcomingInterviews(
    optimisticApps,
    optimisticEvents,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {stats.total}
          </span>
          <span className="text-muted-foreground text-sm">
            application{stats.total === 1 ? "" : "s"}
            {stats.active > 0 ? <> · {stats.active} active</> : null}
            {stats.offer > 0 ? <> · {stats.offer} offer</> : null}
          </span>
        </div>
        <div className="ml-auto" title="Last 90 days of application activity">
          <ActivityHeatmap weeks={heatmapWeeks} compact />
        </div>
      </div>
      <UpcomingInterviews items={upcomingInterviews} onSelect={setExpandedId} />
      {optimisticApps.length === 0 && !adding ? (
        <div className="bg-muted/30 rounded-lg border border-dashed px-6 py-10 text-center">
          <Ghost
            className="text-muted-foreground mx-auto size-10"
            aria-hidden
          />
          <h2 className="mt-3 text-base font-semibold">No applications yet</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your first job application to see your timeline take shape.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setNewCompanyDraft("");
              setAdding(true);
            }}
          >
            <Plus className="size-4" />
            Add your first application
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.currentTarget.value)}
              placeholder="Search company or role"
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUSES.map((s) => {
              const active = statusFilter.has(s);
              const muted = statusFilter.size > 0 && !active;
              const count = stats.byStatus[s];
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleStatusFilter(s)}
                  aria-pressed={active}
                  className="cursor-pointer"
                >
                  <Badge
                    className={cn(STATUS_CLASSES[s], muted && "opacity-40")}
                  >
                    {STATUS_LABELS[s]}
                    {count > 0 ? (
                      <span className="ml-1 tabular-nums opacity-70">
                        {count}
                      </span>
                    ) : null}
                  </Badge>
                </button>
              );
            })}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <SortableHeader
                  label="Company"
                  sortKey="companyName"
                  sort={sort}
                  onSortChange={setSort}
                  className="w-[35%]"
                />
                <SortableHeader
                  label="Role"
                  sortKey="role"
                  sort={sort}
                  onSortChange={setSort}
                  className="hidden w-[30%] sm:table-cell"
                />
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  sort={sort}
                  onSortChange={setSort}
                  className="w-[15%]"
                />
                <SortableHeader
                  label="Last update"
                  sortKey="lastActivityAt"
                  sort={sort}
                  onSortChange={setSort}
                  className="w-[20%]"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding ? (
                <NewRow
                  onSubmit={handleCreate}
                  onDone={() => {
                    setAdding(false);
                    setNewCompanyDraft("");
                  }}
                  companyValue={newCompanyDraft}
                  onCompanyChange={setNewCompanyDraft}
                />
              ) : (
                <TableRow>
                  <TableCell colSpan={COLS} className="p-0">
                    <Button
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground h-10 w-full justify-start rounded-none px-2 font-normal"
                      onClick={() => {
                        setNewCompanyDraft("");
                        setAdding(true);
                      }}
                    >
                      <Plus className="size-4" />
                      Add application
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {visibleApps.length === 0 && optimisticApps.length > 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={COLS}
                    className="text-muted-foreground py-6 text-center text-sm"
                  >
                    No applications match these filters.{" "}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-foreground h-auto px-2 py-0.5"
                    >
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : null}
              {visibleApps.map((app) => {
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
                      <TableCell className="text-muted-foreground w-10 px-3">
                        <ChevronRight
                          className={cn(
                            "size-4 transition-transform",
                            expanded && "rotate-90",
                          )}
                          aria-hidden
                        />
                      </TableCell>
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
                        className="hidden sm:table-cell"
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
                          <>
                            {app.workMode ? (
                              <span
                                aria-label={WORK_MODE_LABELS[app.workMode]}
                                title={WORK_MODE_LABELS[app.workMode]}
                                className="mr-1.5"
                              >
                                {WORK_MODE_EMOJIS[app.workMode]}
                              </span>
                            ) : null}
                            {app.role}
                          </>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={isPending}
                            className={cn(
                              "cursor-pointer",
                              isPending && "cursor-wait opacity-70",
                            )}
                          >
                            <Badge className={STATUS_CLASSES[app.status]}>
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
                        <div className="flex items-center justify-end gap-2 sm:justify-between">
                          <span className="hidden sm:inline">
                            <RelativeTime date={app.lastActivityAt} />
                          </span>
                          <DeleteButton
                            company={app.companyName}
                            onConfirm={() => handleDelete(app.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={COLS}
                          className="p-0 whitespace-normal"
                        >
                          <ApplicationDetail
                            application={app}
                            events={optimisticEvents.get(app.id) ?? []}
                            onSaveField={(key, value) =>
                              handleSaveDetailField(app.id, key, value)
                            }
                            onClearCoverLetter={() =>
                              handleClearCoverLetter(app.id)
                            }
                            onSaveEvent={(eventId, fields) =>
                              handleSaveEvent(app.id, eventId, fields)
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
        </>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSortChange: (next: { key: SortKey; dir: SortDir }) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const ariaSort = active
    ? sort.dir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  function handleClick() {
    if (active) {
      onSortChange({ key: sortKey, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({
        key: sortKey,
        dir: sortKey === "lastActivityAt" ? "desc" : "asc",
      });
    }
  }

  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={handleClick}
        className="hover:bg-muted/40 hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors"
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : null}
      </button>
    </TableHead>
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
            className="text-muted-foreground hover:text-destructive rounded p-1 opacity-30 transition-opacity group-hover:opacity-100 data-popup-open:opacity-100"
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
  companyValue,
  onCompanyChange,
}: {
  onSubmit: (formData: FormData) => Promise<CreateApplicationResult>;
  onDone: () => void;
  companyValue: string;
  onCompanyChange: (value: string) => void;
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
            value={companyValue}
            onChange={(e) => onCompanyChange(e.currentTarget.value)}
            className="w-[35%]"
          />
          <Input name="role" placeholder="Role" className="w-[30%]" />
          <span className="w-[15%]">
            <Badge className={STATUS_CLASSES.applied}>
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
