import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { MemberData } from "./member-types";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const memberDataPath = join(projectRoot, "data/members.json");

export async function readMemberData(): Promise<MemberData> {
  try {
    const raw = await readFile(memberDataPath, "utf-8");
    return JSON.parse(raw) as MemberData;
  } catch {
    return { members: [] };
  }
}

export async function writeMemberData(data: MemberData) {
  await mkdir(dirname(memberDataPath), { recursive: true });
  await writeFile(memberDataPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}
