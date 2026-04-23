import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, email, name } = body;

    if (!clerkId || !email || !name) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const pendingUser = await prisma.user.findUnique({
      where: { clerkId: `pending_${email}` }
    });

    let user;
    if (pendingUser) {
      user = await prisma.user.update({
        where: { id: pendingUser.id },
        data: {
          clerkId,
          name,
        }
      });
    } else {
      user = await prisma.user.upsert({
        where: { clerkId },
        update: {
          email,
          name,
        },
        create: {
          clerkId,
          email,
          name,
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[USERS_SYNC]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
