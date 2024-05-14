import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import { signupInput, signinInput } from "@nikhilsahni/blog-app-common";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const userRoutes = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRoutes.post("/signup", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success, error } = signupInput.safeParse(body);

    if (!success) {
      c.status(400);
      return c.json({ error: error.issues });
    }

    const userExists = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (userExists) {
      c.status(409);
      return c.json({ error: "User with this email already exists" });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });

    const token = await sign({ id: user.id }, c.env.JWT_SECRET);

    return c.json({
      jwt: token,
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

userRoutes.post("/signin", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success, error } = signinInput.safeParse(body);

    if (!success) {
      c.status(400);
      return c.json({ error: error.issues });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
        password: body.password,
      },
    });

    if (!user) {
      c.status(401);
      return c.json({ error: "Invalid credentials" });
    }

    const token = await sign({ id: user.id }, c.env.JWT_SECRET);

    return c.json({
      jwt: token,
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
