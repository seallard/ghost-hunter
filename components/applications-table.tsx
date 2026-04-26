"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { ApplicationWithActivity } from "@/lib/applications";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type Status,
} from "@/lib/applications-status";
import {
  changeApplicationStatusAction,
  createApplicationAction,
} from "@/app/actions/applications";

const COLS = 4;

export function ApplicationsTable({
  applications,
}: {
  applications: ApplicationWithActivity[];
}) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  function handleStatusChange(applicationId: string, newStatus: Status) {
    startTransition(async () => {
      const result = await changeApplicationStatusAction(
        applicationId,
        newStatus,
      );
      if (!result.ok) {
        console.error("status change failed", result.error);
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
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-medium">{app.companyName}</TableCell>
              <TableCell>{app.role}</TableCell>
              <TableCell>
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
                <RelativeTime date={app.lastActivityAt} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
