import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { Permission } from "../models/Role";
import { PermissionAction, PermissionResource } from "../models/Role";

// Move to a secure environment variable
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

interface JwtPayload {
  userId: string;
  exp: number;
}

// Authentication middleware - verifies JWT and adds user to request
export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;

    // Check token expiration
    if (Date.now() >= decoded.exp * 1000) {
      return reply.status(401).send({ message: "Token expired" });
    }

    // Get user and attach to request
    const user = await User.findById(decoded.userId).populate("roles");
    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }

    // Extend request type with user
    (request as any).user = user;

    // Update last login time
    await User.findByIdAndUpdate(decoded.userId, { lastLogin: new Date() });
  } catch (error) {
    return reply.status(401).send({ message: "Invalid token" });
  }
};

// Authorization middleware - checks if user has required permissions
export const authorize = (
  action: PermissionAction,
  resource: PermissionResource
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.status(401).send({ message: "Authentication required" });
      }

      // Get all permissions from user's roles
      const roles = await User.findById(user._id).populate({
        path: "roles",
        populate: {
          path: "permissions",
        },
      });

      if (!roles) {
        return reply.status(403).send({ message: "Unauthorized" });
      }

      // Check if user has the required permission
      let hasPermission = false;
      for (const role of roles.roles as any) {
        for (const permission of role.permissions) {
          if (
            permission.action === action &&
            permission.resource === resource
          ) {
            hasPermission = true;
            break;
          }
        }
        if (hasPermission) break;
      }

      if (!hasPermission) {
        return reply.status(403).send({
          message: `Unauthorized: Missing permission to ${action} ${resource}`,
        });
      }
    } catch (error) {
      return reply.status(500).send({ message: "Authorization error" });
    }
  };
};

// Utility to check if user is the owner of a resource
export const isResourceOwner = (resourceIdParam: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const resourceId = (request.params as any)[resourceIdParam];

      if (user._id.toString() !== resourceId) {
        return reply.status(403).send({
          message: "You don't have permission to access this resource",
        });
      }
    } catch (error) {
      return reply.status(500).send({ message: "Authorization error" });
    }
  };
};
