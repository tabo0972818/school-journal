import puppeteer from "puppeteer";
import schedule from "node-schedule";
import fs from "fs";

// 🔁 毎週金曜18時にPDFを自動生成
schedule.scheduleJob("0 18 * * 5", async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3001/admin/report", { waitUntil: "networkidle2" });

  const pdfPath = `./reports/week-report-${new Date().toISOString().split("T")[0]}.pdf`;
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true
  });

  await browser.close();
  console.log("✅ 週次レポートPDF出力完了:", pdfPath);
});
