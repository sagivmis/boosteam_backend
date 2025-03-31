import mongoose, { Schema, Document } from "mongoose";

// Define permission types
export type PermissionAction = "create" | "read" | "update" | "delete";
export type PermissionResource =
  | "user"
  | "player"
  | "team"
  | "raid"
  | "settings";

// Permission interface
export interface IPermission extends Document {
  action: PermissionAction;
  resource: PermissionResource;
  description: string;
}

// Role interface
export interface IRole extends Document {
  name: string;
  description: string;
  permissions: mongoose.Types.ObjectId[] | IPermission[];
}

// Permission schema
const PermissionSchema: Schema = new Schema({
  action: {
    type: String,
    required: true,
    enum: ["create", "read", "update", "delete"],
  },
  resource: {
    type: String,
    required: true,
    enum: ["user", "player", "team", "raid", "settings"],
  },
  description: { type: String, required: true },
});

// Role schema
const RoleSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
});

// Create unique compound index for permissions
PermissionSchema.index({ action: 1, resource: 1 }, { unique: true });

export const Permission = mongoose.model<IPermission>(
  "Permission",
  PermissionSchema
);
export const Role = mongoose.model<IRole>("Role", RoleSchema);
