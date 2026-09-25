import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outputRoot = path.join(projectRoot, "public", "demo-documents");
const qaRoot = path.join(process.env.TEMP || projectRoot, "nexora-showcase-xlsx-qa");

const projects = [
  {
    slug: "sunu-energie",
    company: "Sunu Énergie Décentralisée SA",
    title: "Mini-réseaux solaires pour commerces de proximité",
    goal: 180000000,
    minimum: 250000,
    years: [2026, 2027, 2028],
    revenue: [240000000, 315000000, 390000000],
    costs: [168000000, 211000000, 250000000],
  },
  {
    slug: "naya-logistique",
    company: "Naya Froid et Logistique SARL",
    title: "Plateforme frigorifique pour les filières locales",
    goal: 95000000,
    minimum: 100000,
    years: [2026, 2027, 2028],
    revenue: [190000000, 255000000, 326000000],
    costs: [146000000, 188000000, 231000000],
  },
  {
    slug: "kora-sante",
    company: "Kora Santé Industries SAS",
    title: "Unité régionale de consommables médicaux",
    goal: 320000000,
    minimum: 500000,
    years: [2026, 2027, 2028],
    revenue: [420000000, 690000000, 980000000],
    costs: [345000000, 531000000, 721000000],
  },
];

for (const project of projects) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("Previsions");
  sheet.showGridLines = false;

  sheet.mergeCells("B2:F2");
  sheet.getRange("B2").values = [[`Prévisions financières ${project.company}`]];
  sheet.mergeCells("B3:F3");
  sheet.getRange("B3").values = [["Données fictives de démonstration. Ces chiffres ne constituent ni une offre, ni une promesse de rendement."]];

  sheet.getRange("B5:C9").values = [
    ["Repère", "Valeur"],
    ["Projet", project.title],
    ["Montant recherché", project.goal],
    ["Participation minimale", project.minimum],
    ["Monnaie", "FCFA"],
  ];

  sheet.getRange("B12:F16").values = [
    ["Indicateur", project.years[0], project.years[1], project.years[2], "Unite"],
    ["Chiffre d'affaires", project.revenue[0], project.revenue[1], project.revenue[2], "FCFA"],
    ["Charges d'exploitation", project.costs[0], project.costs[1], project.costs[2], "FCFA"],
    ["Résultat opérationnel indicatif", null, null, null, "FCFA"],
    ["Marge opérationnelle indicative", null, null, null, "%"],
  ];
  sheet.getRange("C15").formulas = [["=C13-C14"]];
  sheet.getRange("C15:E15").fillRight();
  sheet.getRange("C16").formulas = [["=IF(C13=0,\"n.a.\",C15/C13)"]];
  sheet.getRange("C16:E16").fillRight();

  sheet.getRange("B2:F16").format.font = { name: "Arial", size: 10, color: "#201A20" };
  sheet.getRange("B2:F2").format = {
    font: { name: "Arial", size: 15, bold: true, color: "#000000" },
    rowHeight: 28,
    verticalAlignment: "center",
  };
  sheet.getRange("B3:F3").format = {
    font: { name: "Arial", size: 9, italic: true, color: "#5F5A5E" },
    rowHeight: 28,
    wrapText: true,
    verticalAlignment: "center",
  };
  for (const header of ["B5:C5", "B12:F12"]) {
    sheet.getRange(header).format = {
      fill: "#541249",
      font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
      borders: { preset: "all", style: "thin", color: "#D9D9D9" },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      rowHeight: 24,
    };
  }
  sheet.getRange("B6:C9").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.getRange("B13:F16").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.getRange("B6:B9").format.font = { name: "Arial", size: 10, bold: true, color: "#201A20" };
  sheet.getRange("B13:B16").format.font = { name: "Arial", size: 10, bold: true, color: "#201A20" };
  sheet.getRange("C7:C8").format.numberFormat = "#,##0\" FCFA\"";
  sheet.getRange("C13:E15").format.numberFormat = "#,##0\" FCFA\"";
  sheet.getRange("C16:E16").format.numberFormat = "0.0%";
  sheet.getRange("C6:C9").format.verticalAlignment = "center";
  sheet.getRange("C13:E16").format.horizontalAlignment = "right";
  sheet.getRange("F13:F16").format.horizontalAlignment = "center";
  sheet.getRange("B2:F16").format.verticalAlignment = "center";
  sheet.getRange("B3:F3").format.wrapText = true;

  sheet.getRange("B:B").format.columnWidth = 34;
  sheet.getRange("C:E").format.columnWidth = 16;
  sheet.getRange("F:F").format.columnWidth = 13;
  sheet.getRange("B6:B9").format.wrapText = true;
  sheet.getRange("C6:C9").format.wrapText = true;
  sheet.getRange("B13:B16").format.wrapText = true;
  sheet.getRange("B6:C9").format.autofitRows();
  sheet.getRange("B13:F16").format.autofitRows();

  workbook.recalculate();
  const inspect = await workbook.inspect({
    kind: "table",
    sheetId: "Previsions",
    range: "B5:F16",
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 8,
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
    options: { useRegex: true, maxResults: 100 },
    summary: "final formula error scan",
  });

  const outputDir = path.join(outputRoot, project.slug);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(qaRoot, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path.join(outputDir, "previsions-financieres.xlsx"));
  const preview = await workbook.render({
    sheetName: "Previsions",
    range: "B2:F16",
    scale: 1.5,
    format: "png",
  });
  await fs.writeFile(
    path.join(qaRoot, `${project.slug}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
  console.log(JSON.stringify({ slug: project.slug, inspect: inspect.ndjson, errors: errors.ndjson }));
}
