import express from "express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  paymentMiddleware,
  x402ResourceServer
} from "@x402/express";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";

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

const facilitator = createCdpFacilitatorClient();

const server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme());

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
        description: "EU Opportunity Engine"
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
  res.send("EU Opportunity Engine x402 gateway is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on port ${PORT}`);
  console.log(`Receiving payments at ${PAY_TO}`);
});
