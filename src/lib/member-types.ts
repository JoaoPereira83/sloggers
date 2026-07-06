export type MemberStatus = "pending" | "awaiting_activation" | "approved" | "rejected";

export type Member = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: MemberStatus;
  createdAt: string;
  approvedAt: string | null;
  activationToken: string | null;
  activationExpiresAt: string | null;
  resetToken: string | null;
  resetExpiresAt: string | null;
};

export type PublicMember = {
  id: string;
  email: string;
  displayName: string;
  status: MemberStatus;
  createdAt: string;
  approvedAt: string | null;
};

export type MemberData = {
  members: Member[];
};

export type MemberSessionInfo = {
  member: PublicMember | null;
};
