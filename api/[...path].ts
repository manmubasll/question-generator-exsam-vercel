import type { Request, Response } from "express";

export default async function handler(
  req: Request,
  res: Response
) {
  try {
    const { default: app } = await import("../server");
    return app(req, res);
  } catch (error) {
    console.error("SERVER IMPORT ERROR:", error);

    return res.status(500).json({
      error: "SERVER IMPORT ERROR",
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}
