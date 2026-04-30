import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
} from "docx";
import { fmtBRL } from "@/lib/format";

export type AlertaComparativo = {
  rotulo: string;
  subtitulo?: string;
  anterior: number;
  atual: number;
  delta: number;
  variacao: number | null;
};

export type ContextoComparativo = {
  anoAnterior: number;
  anoAtual: number;
  unidade: string; // "Todas as unidades" ou nome
};

const hoje = () => new Date().toLocaleString("pt-BR");
const stamp = () => new Date().toISOString().slice(0, 10);
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

/* ---------------- PDF ---------------- */
export function exportarComparativoPDF(alertas: AlertaComparativo[], ctx: ContextoComparativo) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("Relatório de Alertas — Comparativo entre Exercícios", 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Comparação ${ctx.anoAnterior} → ${ctx.anoAtual}  •  ${ctx.unidade}  •  gerado em ${hoje()}`,
    40,
    68
  );
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`${alertas.length} subelemento(s) com aumento de despesa paga`, 40, 92);

  if (alertas.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(140);
    doc.text("Nenhum aumento identificado entre os exercícios comparados.", 40, 116);
  } else {
    autoTable(doc, {
      startY: 104,
      head: [["#", "Subelemento", `Pago ${ctx.anoAnterior}`, `Pago ${ctx.anoAtual}`, "Δ R$", "Variação"]],
      body: alertas.map((a, i) => [
        String(i + 1),
        a.subtitulo ? `${a.rotulo}\n${a.subtitulo}` : a.rotulo,
        fmtBRL(a.anterior),
        fmtBRL(a.atual),
        `+${fmtBRL(a.delta)}`,
        pct(a.variacao),
      ]),
      styles: { fontSize: 9, cellPadding: 4, valign: "middle" },
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", textColor: [185, 28, 28], fontStyle: "bold" },
        5: { halign: "right" },
      },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save(`comparativo-alertas-${ctx.anoAnterior}-${ctx.anoAtual}-${stamp()}.pdf`);
}

/* ---------------- XLSX ---------------- */
export function exportarComparativoXLSX(alertas: AlertaComparativo[], ctx: ContextoComparativo) {
  const wb = XLSX.utils.book_new();
  const aoa: (string | number)[][] = [
    ["Relatório de Alertas — Comparativo entre Exercícios"],
    [`Comparação ${ctx.anoAnterior} → ${ctx.anoAtual}`],
    [`Unidade: ${ctx.unidade}`],
    [`Gerado em ${hoje()}`],
    [`Total de alertas: ${alertas.length}`],
    [],
    ["#", "Subelemento", "Categoria", `Pago ${ctx.anoAnterior} (R$)`, `Pago ${ctx.anoAtual} (R$)`, "Δ R$", "Variação %"],
    ...alertas.map((a, i) => [
      i + 1,
      a.rotulo,
      a.subtitulo ?? "",
      Number(a.anterior.toFixed(2)),
      Number(a.atual.toFixed(2)),
      Number(a.delta.toFixed(2)),
      a.variacao === null ? "" : Number((a.variacao * 100).toFixed(2)),
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 50 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Alertas Comparativo");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `comparativo-alertas-${ctx.anoAnterior}-${ctx.anoAtual}-${stamp()}.xlsx`
  );
}

/* ---------------- DOCX ---------------- */
function celula(
  texto: string,
  opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
) {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text: texto, bold: opts.bold })],
      }),
    ],
  });
}

export async function exportarComparativoDOCX(alertas: AlertaComparativo[], ctx: ContextoComparativo) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Relatório de Alertas — Comparativo entre Exercícios", bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Comparação ${ctx.anoAnterior} → ${ctx.anoAtual}  •  ${ctx.unidade}  •  gerado em ${hoje()}`,
          italics: true,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${alertas.length} subelemento(s) com despesa paga superior à do exercício anterior.`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  if (alertas.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Nenhum aumento identificado entre os exercícios comparados.", italics: true })],
      })
    );
  } else {
    const header = new TableRow({
      tableHeader: true,
      children: [
        celula("#", { bold: true }),
        celula("Subelemento", { bold: true }),
        celula(`Pago ${ctx.anoAnterior}`, { bold: true, align: AlignmentType.RIGHT }),
        celula(`Pago ${ctx.anoAtual}`, { bold: true, align: AlignmentType.RIGHT }),
        celula("Δ R$", { bold: true, align: AlignmentType.RIGHT }),
        celula("Variação", { bold: true, align: AlignmentType.RIGHT }),
      ],
    });
    const linhas = alertas.map(
      (a, i) =>
        new TableRow({
          children: [
            celula(String(i + 1)),
            celula(a.subtitulo ? `${a.rotulo} — ${a.subtitulo}` : a.rotulo),
            celula(fmtBRL(a.anterior), { align: AlignmentType.RIGHT }),
            celula(fmtBRL(a.atual), { align: AlignmentType.RIGHT }),
            celula(`+${fmtBRL(a.delta)}`, { align: AlignmentType.RIGHT, bold: true }),
            celula(pct(a.variacao), { align: AlignmentType.RIGHT }),
          ],
        })
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...linhas],
      })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `comparativo-alertas-${ctx.anoAnterior}-${ctx.anoAtual}-${stamp()}.docx`);
}