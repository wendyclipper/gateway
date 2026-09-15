import express from "express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  paymentMiddleware,
  x402ResourceServer
} from "@x402/express";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";

import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension
} from "@x402/extensions/bazaar";

const app = express();
const PORT = Number(process.env.PORT || 3000);

const PAY_TO = process.env.PAY_TO_ADDRESS;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

if (!PAY_TO) {
  throw new Error("PAY_TO_ADDRESS ontbreekt");
}

if (!MAKE_WEBHOOK_URL) {
  throw new Error("MAKE_WEBHOOK_URL ontbreekt");
}

app.use(express.json());

const facilitator = createCdpFacilitatorClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET
});

const server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme())
  .registerExtension(bazaarResourceServerExtension);

app.use(
  paymentMiddleware(
    {
      "POST /opportunities": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.05",
            network: "eip155:8453",
            payTo: PAY_TO
          }
        ],
        description: "EU Opportunity Engine",
        mimeType: "text/plain",
       extensions: {
  ...declareDiscoveryExtension({
    bodyType: "json",
    input: {
      type: "object",
      properties: {},
      additionalProperties: true
    }
  })
}
      }
    },
    server
  )
);

app.post("/opportunities", async (req, res) => {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body || {})
    });

    const body = await response.text();

    res.status(response.status);
    res.set(
      "Content-Type",
      response.headers.get("content-type") || "text/plain"
    );
    res.send(body);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/", (_req, res) => {
  res.type("text/plain").send(
`EU Opportunity Engine

AI-analyzed EU procurement opportunities from TED (Tenders Electronic Daily).

Paid API endpoint:
POST /opportunities

Price:
$0.05 USDC per request

Network:
Base

Payment:
x402

Each request returns a commercially analyzed EU procurement opportunity including opportunity score, category, buyer, country, contract value, deadline, source, summary and commercial relevance.`
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on port ${PORT}`);
  console.log(`Receiving payments at ${PAY_TO}`);
});
