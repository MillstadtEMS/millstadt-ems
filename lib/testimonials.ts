import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DB = join(process.cwd(), "data", "testimonials.json");

export type Testimonial = {
  id: string;
  name: string | null;
  anonymous: boolean;
  message: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
};

export async function readAll(): Promise<Testimonial[]> {
  try {
    const raw = await readFile(DB, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(items: Testimonial[]): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(DB, JSON.stringify(items, null, 2));
}

export async function addTestimonial(
  data: Pick<Testimonial, "name" | "anonymous" | "message">
): Promise<Testimonial> {
  const items = await readAll();
  const entry: Testimonial = {
    ...data,
    id: crypto.randomUUID(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  items.push(entry);
  await writeAll(items);
  return entry;
}

export async function setStatus(
  id: string,
  status: "approved" | "denied"
): Promise<boolean> {
  const items = await readAll();
  const idx = items.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  items[idx].status = status;
  await writeAll(items);
  return true;
}

export async function getApproved(): Promise<Testimonial[]> {
  const items = await readAll();
  return items
    .filter((t) => t.status === "approved")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
