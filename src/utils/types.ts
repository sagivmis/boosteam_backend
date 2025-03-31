import {
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import { IUser } from "../models/User";

export type PlayerTierDecimal = 1 | 2 | 3 | 4 | 5;
export type TeamID = number;
export type PlayerTier = "S" | "A" | "B" | "C" | "D";
export type PlayerRole = "support" | "dps" | "alt";

export type PlayerType = {
  id: string;
  name: string;
  tier: PlayerTier | PlayerTierDecimal;
  role: PlayerRole;
};

export type TeamPlayer = PlayerType & {
  checked: boolean;
  assignedTeamId?: TeamID;
};

export type SuccessReply = {
  message: string;
  token?: string;
  players?: TeamPlayer[];
  teams?: Record<number, TeamPlayer[]>;
  settings?: any;
  username?: string;
  user?: IUser;
};

export type ErrorReply = {
  message: string;
  details?: string;
};

export type FReply = ErrorReply | SuccessReply;
