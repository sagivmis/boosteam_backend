import {
  Role,
  Permission,
  PermissionAction,
  PermissionResource,
} from "../models/Role";

/**
 * Sets up default roles and permissions for the application
 */
export const setupDefaultRolesAndPermissions = async () => {
  try {
    // Define all the possible permissions
    const permissionsData = [
      // User permissions
      {
        action: "create" as PermissionAction,
        resource: "user" as PermissionResource,
        description: "Create users",
      },
      {
        action: "read" as PermissionAction,
        resource: "user" as PermissionResource,
        description: "View user information",
      },
      {
        action: "update" as PermissionAction,
        resource: "user" as PermissionResource,
        description: "Update user information",
      },
      {
        action: "delete" as PermissionAction,
        resource: "user" as PermissionResource,
        description: "Delete users",
      },

      // Player permissions
      {
        action: "create" as PermissionAction,
        resource: "player" as PermissionResource,
        description: "Create players",
      },
      {
        action: "read" as PermissionAction,
        resource: "player" as PermissionResource,
        description: "View players",
      },
      {
        action: "update" as PermissionAction,
        resource: "player" as PermissionResource,
        description: "Update players",
      },
      {
        action: "delete" as PermissionAction,
        resource: "player" as PermissionResource,
        description: "Delete players",
      },

      // Team permissions
      {
        action: "create" as PermissionAction,
        resource: "team" as PermissionResource,
        description: "Create teams",
      },
      {
        action: "read" as PermissionAction,
        resource: "team" as PermissionResource,
        description: "View teams",
      },
      {
        action: "update" as PermissionAction,
        resource: "team" as PermissionResource,
        description: "Update teams",
      },
      {
        action: "delete" as PermissionAction,
        resource: "team" as PermissionResource,
        description: "Delete teams",
      },

      // Raid permissions
      {
        action: "create" as PermissionAction,
        resource: "raid" as PermissionResource,
        description: "Create raids",
      },
      {
        action: "read" as PermissionAction,
        resource: "raid" as PermissionResource,
        description: "View raids",
      },
      {
        action: "update" as PermissionAction,
        resource: "raid" as PermissionResource,
        description: "Update raids",
      },
      {
        action: "delete" as PermissionAction,
        resource: "raid" as PermissionResource,
        description: "Delete raids",
      },

      // Settings permissions
      {
        action: "read" as PermissionAction,
        resource: "settings" as PermissionResource,
        description: "View settings",
      },
      {
        action: "update" as PermissionAction,
        resource: "settings" as PermissionResource,
        description: "Update settings",
      },
    ];

    // Check if permissions already exist
    const existingPermissionsCount = await Permission.countDocuments();

    if (existingPermissionsCount === 0) {
      console.log("Creating default permissions...");

      // Create all permissions
      const createdPermissions = await Permission.insertMany(permissionsData);
      console.log(`Created ${createdPermissions.length} permissions`);

      // Define roles with their permissions
      const adminPermissions = createdPermissions.map(
        (permission) => permission._id
      );

      const userPermissions = createdPermissions
        .filter(
          (permission) =>
            (permission.resource === "player" ||
              permission.resource === "team" ||
              permission.resource === "settings") &&
            permission.action !== "delete"
        )
        .map((permission) => permission._id);

      const viewerPermissions = createdPermissions
        .filter((permission) => permission.action === "read")
        .map((permission) => permission._id);

      // Define roles
      const rolesData = [
        {
          name: "admin",
          description: "Administrator with full access",
          permissions: adminPermissions,
        },
        {
          name: "user",
          description: "Regular user with team management access",
          permissions: userPermissions,
        },
        {
          name: "viewer",
          description: "Read-only access to all resources",
          permissions: viewerPermissions,
        },
      ];

      // Check if roles already exist
      const existingRolesCount = await Role.countDocuments();

      if (existingRolesCount === 0) {
        console.log("Creating default roles...");

        // Create all roles
        const createdRoles = await Role.insertMany(rolesData);
        console.log(`Created ${createdRoles.length} roles`);
      }
    }
  } catch (error) {
    console.error("Error setting up roles and permissions:", error);
  }
};

/**
 * Resets all roles and permissions (for development purposes)
 */
export const resetRolesAndPermissions = async () => {
  try {
    // Delete all roles and permissions
    await Role.deleteMany({});
    await Permission.deleteMany({});
    console.log("Deleted all roles and permissions");

    // Recreate defaults
    await setupDefaultRolesAndPermissions();
  } catch (error) {
    console.error("Error resetting roles and permissions:", error);
  }
};
