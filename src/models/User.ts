import mongoose, { Schema, Document } from "mongoose";
import { TeamPlayer } from "../utils";
import { IRole } from "./Role";

export interface IUser extends Document {
  username: string;
  password: string;
  email: string;
  roles: mongoose.Types.ObjectId[] | IRole[];
  players?: TeamPlayer[];
  teams?: Record<number, TeamPlayer[]>;
  settings?: {
    maxPlayers: number;
    minDpsPlayers: number;
    minSupportPlayers: number;
  };
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
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
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>("User", UserSchema);
