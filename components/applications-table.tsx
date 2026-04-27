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
import type { ApplicationEvent } from "@/lib/db/schema";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type Status,
} from "@/lib/applications-status";
import {
  changeApplicationStatusAction,
  createApplicationAction,
  deleteApplicationAction,
  updateApplicationFieldsAction,
} from "@/app/actions/applications";

const COLS = 4;

type EditableField = "companyName" | "role";

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

  const [optimisticApps, applyStatusPatch] = useOptimistic(
    applications,
    (state, patch: { id: string; status: Status }) =>
      state.map((a) =>
        a.id === patch.id
          ? { ...a, status: patch.status, lastActivityAt: new Date() }
          : a,
      ),
  );

  function handleStatusChange(applicationId: string, newStatus: Status) {
    startTransition(async () => {
      applyStatusPatch({ id: applicationId, status: newStatus });
      const result = await changeApplicationStatusAction(
        applicationId,
        newStatus,
      );
      if (!result.ok) {
        console.error("status change failed", result.error);
      }
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
      const result = await updateApplicationFieldsAction({
        applicationId,
        [field]: trimmed,
      });
      if (!result.ok) {
        console.error("update field failed", result.error);
      }
    });
  }

  function handleDelete(applicationId: string) {
    startTransition(async () => {
      const result = await deleteApplicationAction(applicationId);
      if (!result.ok) {
        console.error("delete failed", result.error);
      }
    });
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
            <NewRow onDone={() => setAdding(false)} />
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
                        events={eventsByApp.get(app.id) ?? []}
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

function NewRow({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createApplicationAction(formData);
      if (result.ok) {
        onDone();
      } else {
        const first =
          result.errors.companyName?.[0] ??
          result.errors.role?.[0] ??
          "Could not save";
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
            if (
              !e.currentTarget.contains(e.relatedTarget as Node | null) &&
              !pending
            ) {
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
            disabled={pending}
            className="w-[35%]"
          />
          <Input
            name="role"
            placeholder="Role"
            disabled={pending}
            className="w-[30%]"
          />
          <span className="w-[15%]">
            <Badge variant={STATUS_VARIANTS.applied}>
              {STATUS_LABELS.applied}
            </Badge>
          </span>
          <span className="text-muted-foreground w-[20%] text-sm">
            {pending ? "Saving…" : error ? error : "just now"}
          </span>
        </form>
      </TableCell>
    </TableRow>
  );
}
