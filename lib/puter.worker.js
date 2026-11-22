
const PROJECT_PREFIX = "layoutlens_project_";

const jsonError = (status, message, extra = {}) => {
    return new Response(
        JSON.stringify({ error: message, ...extra }),
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        }
    );
};

const getUserIdentity = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();

        if (!user?.uuid) return null;

        return {
            userId: user.uuid,
            username: user.username || null,
        };
    } catch {
        return null;
    }
};

// Save a project to the worker owner's shared KV store.
router.post("/api/projects/save", async ({ request, user }) => {
    try {
        const userPuter = user?.puter;
        const sharedPuter = me?.puter;

        if (!userPuter || !sharedPuter) {
            return jsonError(401, "Authentication or shared storage unavailable");
        }

        const identity = await getUserIdentity(userPuter);

        if (!identity) {
            return jsonError(401, "Authentication failed");
        }

        const body = await request.json();
        const project = body?.project;

        if (
            !project?.id ||
            typeof project.id !== "string" ||
            !project.sourceImage ||
            typeof project.sourceImage !== "string"
        ) {
            return jsonError(400, "Valid project ID and source image are required");
        }

        // Only hosted image URLs belong in shared metadata.
        if (
            !project.sourceImage.startsWith("https://") ||
            project.sourceImage.startsWith("data:")
        ) {
            return jsonError(
                400,
                "Source image must be a hosted HTTPS URL"
            );
        }

        if (
            project.renderedImage &&
            (
                typeof project.renderedImage !== "string" ||
                !project.renderedImage.startsWith("https://") ||
                project.renderedImage.startsWith("data:")
            )
        ) {
            return jsonError(
                400,
                "Rendered image must be a hosted HTTPS URL"
            );
        }

        const key = `${PROJECT_PREFIX}${project.id}`;
        const existing = await sharedPuter.kv.get(key);

        // A user may update their own project, but not another user's.
        if (existing && existing.ownerId !== identity.userId) {
            return jsonError(403, "You cannot modify another user's project");
        }

        const payload = {
            id: project.id,
            name: project.name || "Untitled Residence",
            sourceImage: project.sourceImage,
            renderedImage: project.renderedImage || null,
            timestamp:
                existing?.timestamp ??
                project.timestamp ??
                Date.now(),
            ownerId: identity.userId,
            creatorName:
                existing?.creatorName ||
                identity.username ||
                "Unknown user",
            isPublic: true,
            updatedAt: new Date().toISOString(),
        };

        await sharedPuter.kv.set(key, payload);

        return {
            saved: true,
            id: project.id,
            project: payload,
        };
    } catch (e) {
        return jsonError(500, "Failed to save project", {
            message: e?.message || "Unknown error",
        });
    }
});

// List projects from the shared worker-owned store.
router.get("/api/projects/list", async ({ user }) => {
    try {
        const userPuter = user?.puter;
        const sharedPuter = me?.puter;

        if (!userPuter || !sharedPuter) {
            return jsonError(401, "Authentication or shared storage unavailable");
        }

        const identity = await getUserIdentity(userPuter);

        if (!identity) {
            return jsonError(401, "Authentication failed");
        }

        const entries = await sharedPuter.kv.list(PROJECT_PREFIX, true);

        const projects = entries
            .map(({ value }) => value)
            .filter(
                (project) =>
                    project &&
                    typeof project.id === "string" &&
                    typeof project.sourceImage === "string"
            )
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return { projects };
    } catch (e) {
        return jsonError(500, "Failed to list projects", {
            message: e?.message || "Unknown error",
        });
    }
});

// Retrieve a project from the shared gallery.
router.get("/api/projects/get", async ({ request, user }) => {
    try {
        const userPuter = user?.puter;
        const sharedPuter = me?.puter;

        if (!userPuter || !sharedPuter) {
            return jsonError(401, "Authentication or shared storage unavailable");
        }

        const identity = await getUserIdentity(userPuter);

        if (!identity) {
            return jsonError(401, "Authentication failed");
        }

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return jsonError(400, "Project ID is required");
        }

        const project = await sharedPuter.kv.get(
            `${PROJECT_PREFIX}${id}`
        );

        if (!project) {
            return jsonError(404, "Project not found");
        }

        return { project };
    } catch (e) {
        return jsonError(500, "Failed to get project", {
            message: e?.message || "Unknown error",
        });
    }
});
