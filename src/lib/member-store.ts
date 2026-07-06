import type { Member, MemberStatus } from "./member-types";
import { isSupabaseConfigured } from "./ride-db";

async function useFileStore() {
  return import("./member-storage");
}

async function useSupabaseStore() {
  return import("./member-db");
}

export async function findMemberByEmail(email: string): Promise<Member | null> {
  if (isSupabaseConfigured()) {
    const { findMemberByEmailInSupabase } = await useSupabaseStore();
    return findMemberByEmailInSupabase(email);
  }

  const { readMemberData } = await useFileStore();
  const data = await readMemberData();
  return data.members.find((member) => member.email === email.toLowerCase()) ?? null;
}

export async function findMemberById(id: string): Promise<Member | null> {
  if (isSupabaseConfigured()) {
    const { findMemberByIdInSupabase } = await useSupabaseStore();
    return findMemberByIdInSupabase(id);
  }

  const { readMemberData } = await useFileStore();
  const data = await readMemberData();
  return data.members.find((member) => member.id === id) ?? null;
}

export async function createMember(input: {
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<Member> {
  if (isSupabaseConfigured()) {
    const { createMemberInSupabase } = await useSupabaseStore();
    return createMemberInSupabase(input);
  }

  const { randomUUID } = await import("node:crypto");
  const { readMemberData, writeMemberData } = await useFileStore();
  const data = await readMemberData();

  const member: Member = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    displayName: input.displayName,
    passwordHash: input.passwordHash,
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };

  data.members.push(member);
  await writeMemberData(data);
  return member;
}

export async function listMembers(): Promise<Member[]> {
  if (isSupabaseConfigured()) {
    const { listMembersInSupabase } = await useSupabaseStore();
    return listMembersInSupabase();
  }

  const { readMemberData } = await useFileStore();
  const data = await readMemberData();
  return [...data.members].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function updateMemberStatus(id: string, status: MemberStatus): Promise<Member> {
  if (isSupabaseConfigured()) {
    const { updateMemberStatusInSupabase } = await useSupabaseStore();
    return updateMemberStatusInSupabase(id, status);
  }

  const { readMemberData, writeMemberData } = await useFileStore();
  const data = await readMemberData();
  const index = data.members.findIndex((member) => member.id === id);

  if (index === -1) {
    throw new Error("Member not found.");
  }

  data.members[index] = {
    ...data.members[index],
    status,
    approvedAt: status === "approved" ? new Date().toISOString() : null,
  };

  await writeMemberData(data);
  return data.members[index];
}
