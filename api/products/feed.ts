import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const base = process.env.APP_URL || "https://shubhvastram.in";
  res.setHeader("Content-Type", "text/xml");
  res.send(`<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Devaragudi Ethnic Threads</title><link>${base}</link><description>Premium Ethnic Threads from Haridwar</description></channel></rss>`);
}
