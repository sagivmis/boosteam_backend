import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User from "../models/User";
import { Role, Permission } from "../models/Role";
import { FReply } from "../utils";
import { authenticate, authorize } from "../middleware/auth";
import mongoose from "mongoose";

async function adminRoutes(fastify: FastifyInstance) {
  // Get all roles - Admin only
  fastify.get<{ Reply: FReply }>(
    "/admin/roles",
    { preHandler: [authenticate, authorize("read", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const roles = await Role.find().populate("permissions");
        reply.send({
          message: "Roles retrieved successfully",
          roles,
        });
      } catch (error) {
        console.error("Error getting roles:", error);
        reply.status(500).send({ message: "Error retrieving roles" });
      }
    }
  );

  // // Temporary route to set a user as admin - REMOVE THIS IN PRODUCTION
  // fastify.post<{ Reply: FReply }>(
  //   "/admin/make-admin/:userId",
  //   async (request: FastifyRequest, reply: FastifyReply) => {
  //     try {
  //       const { userId } = request.params as { userId: string };

  //       // Find the admin role
  //       const adminRole = await Role.findOne({ name: "admin" });

  //       if (!adminRole) {
  //         return reply.status(404).send({ message: "Admin role not found" });
  //       }

  //       // Try to convert the user ID to a valid MongoDB ObjectId
  //       let userIdObj;
  //       try {
  //         userIdObj = new mongoose.Types.ObjectId(userId);
  //       } catch (error) {
  //         console.error("Invalid ObjectId format:", error);
  //         return reply.status(400).send({
  //           message: "Invalid user ID format. Must be a valid MongoDB ObjectId",
  //         });
  //       }

  //       // Update the user's roles to include the admin role
  //       const updatedUser = await User.findByIdAndUpdate(
  //         userIdObj,
  //         { $addToSet: { roles: adminRole._id } },
  //         { new: true }
  //       );

  //       if (!updatedUser) {
  //         return reply.status(404).send({ message: "User not found" });
  //       }

  //       reply.send({
  //         message: "User promoted to admin successfully",
  //         user: {
  //           _id: updatedUser._id,
  //           username: updatedUser.username,
  //           roles: updatedUser.roles,
  //         },
  //       });
  //     } catch (error) {
  //       console.error("Error making user admin:", error);
  //       reply.status(500).send({ message: "Error updating user" });
  //     }
  //   }
  // );

  // Create a new role - Admin only
  fastify.post<{ Reply: FReply }>(
    "/admin/roles",
    { preHandler: [authenticate, authorize("create", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const { name, description, permissions } = request.body as {
          name: string;
          description: string;
          permissions: string[]; // Permission IDs
        };

        // Validate input
        if (!name || !description || !Array.isArray(permissions)) {
          return reply.status(400).send({
            message: "Name, description, and permissions array are required",
          });
        }

        // Check if role already exists
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
          return reply.status(409).send({ message: "Role already exists" });
        }

        // Create new role
        const role = new Role({
          name,
          description,
          permissions,
        });

        await role.save();
        reply.status(201).send({
          message: "Role created successfully",
          role,
        });
      } catch (error) {
        console.error("Error creating role:", error);
        reply.status(500).send({ message: "Error creating role" });
      }
    }
  );

  // Update a role - Admin only
  fastify.put<{ Reply: FReply }>(
    "/admin/roles/:roleId",
    { preHandler: [authenticate, authorize("update", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const { roleId } = request.params as { roleId: string };
        const { name, description, permissions } = request.body as {
          name: string;
          description: string;
          permissions: string[]; // Permission IDs
        };

        // Update role
        const updatedRole = await Role.findByIdAndUpdate(
          roleId,
          {
            name,
            description,
            permissions,
          },
          { new: true }
        );

        if (!updatedRole) {
          return reply.status(404).send({ message: "Role not found" });
        }

        reply.send({
          message: "Role updated successfully",
          role: updatedRole,
        });
      } catch (error) {
        console.error("Error updating role:", error);
        reply.status(500).send({ message: "Error updating role" });
      }
    }
  );

  // Delete a role - Admin only
  fastify.delete<{ Reply: FReply }>(
    "/admin/roles/:roleId",
    { preHandler: [authenticate, authorize("delete", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const { roleId } = request.params as { roleId: string };

        // Check if role is in use
        const usersWithRole = await User.countDocuments({ roles: roleId });
        if (usersWithRole > 0) {
          return reply.status(400).send({
            message: "Cannot delete role that is assigned to users",
          });
        }

        // Delete role
        const deletedRole = await Role.findByIdAndDelete(roleId);
        if (!deletedRole) {
          return reply.status(404).send({ message: "Role not found" });
        }

        reply.send({ message: "Role deleted successfully" });
      } catch (error) {
        console.error("Error deleting role:", error);
        reply.status(500).send({ message: "Error deleting role" });
      }
    }
  );

  // Assign role to user - Admin only
  fastify.post<{ Reply: FReply }>(
    "/admin/users/:userId/roles",
    { preHandler: [authenticate, authorize("update", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const { userId } = request.params as { userId: string };
        const { roleIds } = request.body as { roleIds: string[] };

        // Validate input
        if (!Array.isArray(roleIds)) {
          return reply
            .status(400)
            .send({ message: "Role IDs array is required" });
        }

        // Check if roles exist
        const roles = await Role.find({ _id: { $in: roleIds } });
        if (roles.length !== roleIds.length) {
          return reply
            .status(400)
            .send({ message: "One or more roles not found" });
        }

        // Update user roles
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { roles: roleIds },
          { new: true }
        ).populate("roles");

        if (!updatedUser) {
          return reply.status(404).send({ message: "User not found" });
        }

        reply.send({
          message: "Roles assigned successfully",
          user: {
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            roles: updatedUser.roles,
          },
        });
      } catch (error) {
        console.error("Error assigning roles:", error);
        reply.status(500).send({ message: "Error assigning roles" });
      }
    }
  );

  // Get all users - Admin only
  fastify.get<{ Reply: FReply }>(
    "/admin/users",
    { preHandler: [authenticate, authorize("read", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        // Add pagination
        const page = parseInt((request.query as any).page || "1");
        const limit = parseInt((request.query as any).limit || "10");
        const skip = (page - 1) * limit;

        const users = await User.find()
          .select("_id username email createdAt lastLogin roles")
          .populate("roles", "name")
          .skip(skip)
          .limit(limit);

        const total = await User.countDocuments();

        reply.send({
          message: "Users retrieved successfully",
          users,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        console.error("Error getting users:", error);
        reply.status(500).send({ message: "Error retrieving users" });
      }
    }
  );

  // Get all permissions - Admin only
  fastify.get<{ Reply: FReply }>(
    "/admin/permissions",
    { preHandler: [authenticate, authorize("read", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const permissions = await Permission.find();
        reply.send({
          message: "Permissions retrieved successfully",
          permissions,
        });
      } catch (error) {
        console.error("Error getting permissions:", error);
        reply.status(500).send({ message: "Error retrieving permissions" });
      }
    }
  );

  // Get a specific user - Admin only
  fastify.get<{ Reply: FReply }>(
    "/admin/users/:userId",
    { preHandler: [authenticate, authorize("read", "user")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user is admin
        const user = (request as any).user;
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin) {
          return reply.status(403).send({ message: "Admin access required" });
        }

        const { userId } = request.params as { userId: string };

        const targetUser = await User.findById(userId)
          .select(
            "_id username email createdAt lastLogin roles players teams settings"
          )
          .populate("roles");

        if (!targetUser) {
          return reply.status(404).send({ message: "User not found" });
        }

        reply.send({
          message: "User retrieved successfully",
          user: targetUser,
        });
      } catch (error) {
        console.error("Error getting user:", error);
        reply.status(500).send({ message: "Error retrieving user" });
      }
    }
  );
}

export default adminRoutes;
