import mongoose, { Schema, Document } from "mongoose";
import { TeamPlayer } from "../util";

export interface IUser extends Document {
  username: string;
  password: string;
  players?: TeamPlayer[];
  teams?: Record<number, TeamPlayer[]>;
  settings?: {
    maxPlayers: number;
    minDpsPlayers: number;
    minSupportPlayers: number;
  };
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  players: [
    {
      name: { type: String, required: true },
      role: { type: String, required: true },
      tier: { type: String, required: true },
      assignedTeamId: { type: Number, required: false },
    },
  ],
  teams: {
    type: Map,
    of: [{ name: String, role: String, tier: String, assignedTeamId: Number }],
  },
  settings: {
    maxPlayers: { type: Number, required: true, default: 10 },
    minDpsPlayers: { type: Number, required: true, default: 2 },
    minSupportPlayers: { type: Number, required: true, default: 2 },
  },
});

export default mongoose.model<IUser>("User", UserSchema);
