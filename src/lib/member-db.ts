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
  const { data, error } = await supabase
    .from("members")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapMember(data as MemberRow);
}
