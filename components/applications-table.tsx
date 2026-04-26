"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Application } from "@/lib/db/schema";
import { relativeTime } from "@/lib/relative-time";
import { createApplicationAction } from "@/app/actions/applications";

export function ApplicationsTable({
  applications,
}: {
  applications: Application[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto max-w-4xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Company</TableHead>
            <TableHead className="w-[40%]">Role</TableHead>
            <TableHead className="w-[20%]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adding ? (
            <NewRow onDone={() => setAdding(false)} />
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="p-0">
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
              <TableCell className="text-muted-foreground">
                {relativeTime(app.createdAt)}
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
      <TableCell colSpan={3} className="p-0">
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
            className="w-[40%]"
          />
          <Input
            name="role"
            placeholder="Role"
            disabled={pending}
            className="w-[40%]"
          />
          <span className="text-muted-foreground w-[20%] text-sm">
            {pending ? "Saving…" : error ? error : "just now"}
          </span>
        </form>
      </TableCell>
    </TableRow>
  );
}
