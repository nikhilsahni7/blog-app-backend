import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import { createBlog, updateBlog } from "@nikhilsahni/blog-app-common";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const blogRoutes = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRoutes.use("/*", async (c, next) => {
  try {
    const header = c.req.header("authorization") || "";
    const user = await verify(header, c.env.JWT_SECRET);

    if (user) {
      c.set("userId", user.id);
      await next();
    } else {
      c.status(401);
      return c.json({
        error: "Unauthorized",
      });
    }
  } catch (error) {
    c.status(401);
    return c.json({
      error: "Unauthorized",
    });
  }
});

blogRoutes.post("/", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success, error } = createBlog.safeParse(body);

    if (!success) {
      c.status(400);
      return c.json({ error: error.issues });
    }

    const authorId = c.get("userId");
    const blog = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId,
      },
    });

    return c.json({
      id: blog.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      c.status(500);
      return c.json({ error: "Database error" });
    }
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});

blogRoutes.put("/", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success, error } = updateBlog.safeParse(body);

    if (!success) {
      c.status(400);
      return c.json({ error: error.issues });
    }

    const blog = await prisma.post.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.json({
      id: blog.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      c.status(500);
      return c.json({ error: "Database error" });
    }
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});

blogRoutes.get("/bulk", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const blogs = await prisma.post.findMany({
      take: 10,
      skip: 0,
    });

    return c.json({
      blogs,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      c.status(500);
      return c.json({ error: "Database error" });
    }
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});

blogRoutes.get("/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");
    const blog = await prisma.post.findUnique({
      where: {
        id,
      },
    });

    if (!blog) {
      c.status(404);
      return c.json({ error: "Blog not found" });
    }

    return c.json({
      blog,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      c.status(500);
      return c.json({ error: "Database error" });
    }
    c.status(500);
    return c.json({ error: "Internal Server Error" });
  }
});