import type { Member, MemberStatus, PublicMember } from "./member-types";
import { getSupabaseAdmin, toSupabaseErrorMessage } from "./ride-db";

type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  status: MemberStatus;
  created_at: string;
  approved_at: string | null;
  activation_token: string | null;
  activation_expires_at: string | null;
  reset_token: string | null;
  reset_expires_at: string | null;
};

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    activationToken: row.activation_token,
    activationExpiresAt: row.activation_expires_at,
    resetToken: row.reset_token,
    resetExpiresAt: row.reset_expires_at,
  };
}

export function toPublicMember(member: Member): PublicMember {
  return {
    id: member.id,
    email: member.email,
    displayName: member.displayName,
    status: member.status,
    createdAt: member.createdAt,
    approvedAt: member.approvedAt,
  };
}

function wrapSupabaseError(error: { message: string }) {
  throw new Error(toSupabaseErrorMessage(error.message));
}

export async function findMemberByEmailInSupabase(email: string): Promise<Member | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) wrapSupabaseError(error);
  return data ? mapMember(data as MemberRow) : null;
}

export async function findMemberByIdInSupabase(id: string): Promise<Member | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("members").select("*").eq("id", id).maybeSingle();

  if (error) wrapSupabaseError(error);
  return data ? mapMember(data as MemberRow) : null;
}

export async function findMemberByActivationTokenInSupabase(token: string): Promise<Member | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("activation_token", token)
    .maybeSingle();

  if (error) wrapSupabaseError(error);
  return data ? mapMember(data as MemberRow) : null;
}

export async function findMemberByResetTokenInSupabase(token: string): Promise<Member | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("reset_token", token)
    .maybeSingle();

  if (error) wrapSupabaseError(error);
  return data ? mapMember(data as MemberRow) : null;
}

export async function createMemberInSupabase(input: {
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<Member> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .insert({
      email: input.email.toLowerCase(),
      display_name: input.displayName,
      password_hash: input.passwordHash,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}

export async function listMembersInSupabase(): Promise<Member[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) wrapSupabaseError(error);
  return (data as MemberRow[]).map(mapMember);
}

export async function updateMemberStatusInSupabase(
  id: string,
  status: MemberStatus,
): Promise<Member> {
  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {
    status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  };

  if (status === "rejected" || status === "pending") {
    updates.activation_token = null;
    updates.activation_expires_at = null;
  }

  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}

export async function issueMemberActivationInSupabase(
  id: string,
  token: string,
  expiresAt: string,
): Promise<Member> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .update({
      status: "awaiting_activation",
      activation_token: token,
      activation_expires_at: expiresAt,
      approved_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}

export async function completeMemberActivationInSupabase(id: string): Promise<Member> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      activation_token: null,
      activation_expires_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}

export async function issuePasswordResetInSupabase(
  id: string,
  token: string,
  expiresAt: string,
): Promise<Member> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .update({
      reset_token: token,
      reset_expires_at: expiresAt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}

export async function completePasswordResetInSupabase(
  id: string,
  passwordHash: string,
): Promise<Member> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("members")
    .update({
      password_hash: passwordHash,
      reset_token: null,
      reset_expires_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}
