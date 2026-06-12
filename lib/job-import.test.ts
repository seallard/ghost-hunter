import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJobFromUrl, JobImportError, stripHtml } from "./job-import";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockFetch(body: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
}

function jsonLdPage(jobPosting: Record<string, unknown>, extra = ""): string {
  return (
    "<html><head>" +
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      ...jobPosting,
    })}</script>` +
    `</head><body>${extra.padEnd(60, " x")}</body></html>`
  );
}

describe("stripHtml", () => {
  it("drops script/style/comment blocks and tags", () => {
    const html =
      "<html><head><style>.a{color:red}</style></head>" +
      "<body><script>alert(1)</script><!-- hi -->" +
      "<h1>Senior Engineer</h1><p>Build&nbsp;things</p></body></html>";
    const out = stripHtml(html);
    expect(out).not.toMatch(/alert|color:red|<|>/);
    expect(out).toContain("Senior Engineer");
    expect(out).toContain("Build things");
  });

  it("decodes common entities and collapses whitespace", () => {
    expect(stripHtml("a &amp; b    c\n\n\n\nd")).toBe("a & b c\n\nd");
  });

  it("caps length to bound work", () => {
    expect(stripHtml("x".repeat(200_000)).length).toBe(100_000);
  });
});

describe("extractJobFromUrl — guards", () => {
  it("rejects non-http(s) URLs before fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(extractJobFromUrl("ftp://example.com")).rejects.toBeInstanceOf(
      JobImportError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects private/loopback hosts (SSRF guard)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      extractJobFromUrl("http://localhost:5432/x"),
    ).rejects.toBeInstanceOf(JobImportError);
    await expect(
      extractJobFromUrl("http://192.168.1.10/x"),
    ).rejects.toBeInstanceOf(JobImportError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces a JobImportError on a non-OK HTTP response", async () => {
    mockFetch("nope", 403);
    await expect(
      extractJobFromUrl("https://example.com/jobs/x"),
    ).rejects.toBeInstanceOf(JobImportError);
  });
});

describe("extractJobFromUrl — JSON-LD JobPosting", () => {
  it("extracts title, company, description, salary, and remote mode", async () => {
    mockFetch(
      jsonLdPage({
        title: "Senior Python Engineer",
        hiringOrganization: { "@type": "Organization", name: "Acme Inc" },
        description: "<p>Build &amp; maintain services.</p>",
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: {
            "@type": "QuantitativeValue",
            minValue: 120000,
            maxValue: 150000,
            unitText: "YEAR",
          },
        },
        jobLocationType: "TELECOMMUTE",
      }),
    );

    const result = await extractJobFromUrl("https://boards.example.com/jobs/1");
    expect(result).toEqual({
      companyName: "Acme Inc",
      role: "Senior Python Engineer",
      jobDescription: "Build & maintain services.",
      salary: "$120,000–$150,000/yr",
      workMode: "remote",
    });
  });

  it("finds a JobPosting nested in an @graph array", async () => {
    const html =
      "<html><head>" +
      `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org/",
        "@graph": [
          { "@type": "WebSite", name: "Careers" },
          {
            "@type": "JobPosting",
            title: "Designer",
            hiringOrganization: "Globex",
          },
        ],
      })}</script>` +
      "</head><body>x x x x x x x x x x x x</body></html>";
    mockFetch(html);

    const result = await extractJobFromUrl("https://example.com/jobs/2");
    expect(result.role).toBe("Designer");
    expect(result.companyName).toBe("Globex");
  });

  it("formats a single-value hourly salary", async () => {
    mockFetch(
      jsonLdPage({
        title: "Barista",
        hiringOrganization: "Cafe",
        baseSalary: {
          currency: "GBP",
          value: { value: 15, unitText: "HOUR" },
        },
      }),
    );
    const result = await extractJobFromUrl("https://example.com/jobs/3");
    expect(result.salary).toBe("£15/hr");
  });
});

describe("extractJobFromUrl — HTML fallbacks", () => {
  it("uses OpenGraph/meta tags and regex when JSON-LD is absent", async () => {
    const html =
      "<html><head>" +
      '<meta property="og:title" content="Staff Engineer" />' +
      '<meta property="og:site_name" content="Initech" />' +
      '<meta name="description" content="Join our hybrid team." />' +
      "</head><body><p>Comp: $180,000 per year. This is a hybrid role.</p>" +
      "more text to clear the length guard xxxxxxxxxx</body></html>";
    mockFetch(html);

    const result = await extractJobFromUrl("https://example.com/jobs/4");
    expect(result.role).toBe("Staff Engineer");
    expect(result.companyName).toBe("Initech");
    expect(result.jobDescription).toBe("Join our hybrid team.");
    expect(result.salary).toBe("$180,000 per year");
    expect(result.workMode).toBe("hybrid");
  });

  it("falls back to <h1> for the role and detects on-site mode", async () => {
    const html =
      "<html><head><title>Careers</title></head>" +
      "<body><h1>Warehouse Associate</h1>" +
      "<p>This is an on-site position based in our depot.</p>" +
      "padding padding padding padding</body></html>";
    mockFetch(html);

    const result = await extractJobFromUrl("https://example.com/jobs/5");
    expect(result.role).toBe("Warehouse Associate");
    expect(result.workMode).toBe("in_office");
  });

  it("throws when neither company nor role can be found", async () => {
    mockFetch(
      "<html><head></head><body>" +
        "lots of generic words with no title or company here at all " +
        "padding padding padding</body></html>",
    );
    await expect(
      extractJobFromUrl("https://example.com/jobs/6"),
    ).rejects.toBeInstanceOf(JobImportError);
  });
});
