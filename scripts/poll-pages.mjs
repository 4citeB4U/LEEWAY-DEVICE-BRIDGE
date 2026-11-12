import https from "node:https";

async function poll() {
  console.log("Polling GitHub Pages for updated docs/remote-relay.json...");
  for (let i = 0; i < 20; i++) {
    const url = "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/remote-relay.json?nocache=" + Date.now();
    await new Promise(resolve => {
      https.get(url, { headers: { "Cache-Control": "no-cache, no-store", "Pragma": "no-cache" } }, res => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => {
          try {
            const j = JSON.parse(d);
            console.log(`[POLL ${i + 1}] relayUrl = ${j.relayUrl}`);
            if (j.relayUrl && j.relayUrl.includes("tailb186e7")) {
              console.log("\n=======================================================");
              console.log(">>> GITHUB PAGES IS SERVING SOVEREIGN FUNNEL URL! <<<");
              console.log(`relayUrl: ${j.relayUrl}`);
              console.log("=======================================================\n");
              process.exit(0);
            }
          } catch (e) {
            console.error("Parse error:", e.message);
          }
          resolve();
        });
      }).on("error", err => {
        console.error("HTTP error:", err.message);
        resolve();
      });
    });
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log("Poll finished without update yet; GitHub Actions pages deployment may still be queuing.");
}

poll();
