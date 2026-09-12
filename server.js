import express from "express";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
import { x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PAY_TO = process.env.PAY_TO_ADDRESS;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

const facilitator = createCdpFacilitatorClient();

const x402Server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme())
  .route("POST /opportunities", {
    price: "$0.05",
    payTo: PAY_TO,
    network: "eip155:8453",
    description: "EU Opportunity Engine"
  });

app.use(paymentMiddlewareFromHTTPServer(x402Server));

app.post("/opportunities", async (req, res) => {
  try {
    const r = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });

    const text = await r.text();

    res.status(r.status);
    res.set("Content-Type", r.headers.get("content-type") || "text/plain");
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => {
  res.send("EU Opportunity Engine x402 gateway is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
