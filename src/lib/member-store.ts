import type { Member, MemberStatus } from "./member-types";
import { isSupabaseConfigured } from "./ride-db";

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function findMemberByActivationToken(token: string): Promise<Member | null> {
  if (isSupabaseConfigured()) {
    const { findMemberByActivationTokenInSupabase } = await useSupabaseStore();
    return findMemberByActivationTokenInSupabase(token);
  }

  const { readMemberData } = await useFileStore();
  const data = await readMemberData();
  return data.members.find((member) => member.activationToken === token) ?? null;
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
    activationToken: null,
    activationExpiresAt: null,
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
    activationToken:
      status === "rejected" || status === "pending" ? null : data.members[index].activationToken,
    activationExpiresAt:
      status === "rejected" || status === "pending" ? null : data.members[index].activationExpiresAt,
  };

  await writeMemberData(data);
  return data.members[index];
}

export async function issueMemberActivation(id: string): Promise<{ member: Member; token: string }> {
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS).toISOString();

  if (isSupabaseConfigured()) {
    const { issueMemberActivationInSupabase } = await useSupabaseStore();
    const member = await issueMemberActivationInSupabase(id, token, expiresAt);
    return { member, token };
  }

  const { readMemberData, writeMemberData } = await useFileStore();
  const data = await readMemberData();
  const index = data.members.findIndex((member) => member.id === id);

  if (index === -1) {
    throw new Error("Member not found.");
  }

  data.members[index] = {
    ...data.members[index],
    status: "awaiting_activation",
    activationToken: token,
    activationExpiresAt: expiresAt,
    approvedAt: null,
  };

  await writeMemberData(data);
  return { member: data.members[index], token };
}

export async function activateMemberByToken(token: string): Promise<Member> {
  const member = await findMemberByActivationToken(token);
  if (!member) {
    throw new Error("This activation link is invalid.");
  }

  if (member.status !== "awaiting_activation") {
    throw new Error("This account has already been activated.");
  }

  if (!member.activationExpiresAt || new Date(member.activationExpiresAt).getTime() < Date.now()) {
    throw new Error("This activation link has expired. Ask an admin to approve your account again.");
  }

  if (isSupabaseConfigured()) {
    const { completeMemberActivationInSupabase } = await useSupabaseStore();
    return completeMemberActivationInSupabase(member.id);
  }

  const { readMemberData, writeMemberData } = await useFileStore();
  const data = await readMemberData();
  const index = data.members.findIndex((entry) => entry.id === member.id);

  if (index === -1) {
    throw new Error("Member not found.");
  }

  data.members[index] = {
    ...data.members[index],
    status: "approved",
    approvedAt: new Date().toISOString(),
    activationToken: null,
    activationExpiresAt: null,
  };

  await writeMemberData(data);
  return data.members[index];
}
