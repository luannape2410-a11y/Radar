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
import { fmtBRL, fmtPct } from "@/lib/format";
import type { AlertaItem } from "@/lib/alertas";

export type GrupoAlerta = {
  chave: "concentracao" | "altocusto" | "atipico";
  titulo: string;
  descricao: string;
  itens: AlertaItem[];
};

const hoje = () => new Date().toLocaleString("pt-BR");
const stamp = () => new Date().toISOString().slice(0, 10);

function detalheItem(g: GrupoAlerta, it: AlertaItem) {
  if (g.chave === "atipico") {
    const ctx = it.contexto as { subelemento?: string };
    return ctx.subelemento ?? it.detalhe;
  }
  return it.detalhe;
}

function metricaItem(g: GrupoAlerta, it: AlertaItem) {
  if (g.chave === "atipico") {
    const ctx = it.contexto as { media?: number };
    const media = Number(ctx.media ?? 0);
    if (media > 0) return (it.valor - media) / media;
    return 0;
  }
  return it.metrica;
}

function metricaTexto(g: GrupoAlerta, it: AlertaItem) {
  return fmtPct(metricaItem(g, it));
}

function linhasParaTabela(g: GrupoAlerta) {
  return g.itens.map((it, i) => [
    String(i + 1),
    it.rotulo,
    detalheItem(g, it),
    fmtBRL(it.valor),
    metricaTexto(g, it),
  ]);
}

/* ---------------- PDF ---------------- */
export function exportarPDF(grupos: GrupoAlerta[], exercicio: number) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("Relatório de Alertas Gerenciais", 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Exercício ${exercicio} — gerado em ${hoje()}`, 40, 68);

  let y = 90;
  for (const g of grupos) {
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`${g.titulo} (${g.itens.length})`, 40, y);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(g.descricao, 40, y + 14);

    if (g.itens.length === 0) {
      doc.setTextColor(140);
      doc.text("Nenhuma situação identificada.", 40, y + 32);
      y += 50;
      continue;
    }

    autoTable(doc, {
      startY: y + 22,
      head: [["#", "Item", "Detalhe", "Valor pago", g.chave === "atipico" ? "% acima da média" : "Métrica"]],
      body: linhasParaTabela(g),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 24 },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 40, right: 40 },
    });
    // @ts-expect-error - lastAutoTable is added by autotable
    y = (doc.lastAutoTable?.finalY ?? y + 60) + 24;
    if (y > 740) {
      doc.addPage();
      y = 60;
    }
  }

  doc.save(`alertas-${exercicio}-${stamp()}.pdf`);
}

/* ---------------- XLSX ---------------- */
export function exportarXLSX(grupos: GrupoAlerta[], exercicio: number) {
  const wb = XLSX.utils.book_new();

  const resumo = [
    ["Relatório de Alertas Gerenciais"],
    [`Exercício ${exercicio}`],
    [`Gerado em ${hoje()}`],
    [],
    ["Tipo", "Descrição", "Qtd. alertas", "Total envolvido (R$)"],
    ...grupos.map((g) => [
      g.titulo,
      g.descricao,
      g.itens.length,
      g.itens.reduce((s, i) => s + i.valor, 0),
    ]),
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 32 }, { wch: 50 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  for (const g of grupos) {
    const aoa: (string | number)[][] = [
      ["#", "Item", "Detalhe", "Valor pago (R$)", g.chave === "atipico" ? "% acima da média" : "% do total"],
      ...g.itens.map((it, i) => [
        i + 1,
        it.rotulo,
        detalheItem(g, it),
        Number(it.valor.toFixed(2)),
        Number((metricaItem(g, it) * 100).toFixed(2)),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 5 }, { wch: 50 }, { wch: 50 }, { wch: 18 }, { wch: 14 }];
    const nome = g.titulo.slice(0, 28).replace(/[\\/?*[\]]/g, "");
    XLSX.utils.book_append_sheet(wb, ws, nome);
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `alertas-${exercicio}-${stamp()}.xlsx`
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

export async function exportarDOCX(grupos: GrupoAlerta[], exercicio: number) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Relatório de Alertas Gerenciais", bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exercício ${exercicio} — gerado em ${hoje()}`,
          italics: true,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const g of grupos) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `${g.titulo} (${g.itens.length})`, bold: true })],
      })
    );
    children.push(
      new Paragraph({ children: [new TextRun({ text: g.descricao, color: "777777" })] })
    );

    if (g.itens.length === 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Nenhuma situação identificada.", italics: true })],
        })
      );
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    const header = new TableRow({
      tableHeader: true,
      children: [
        celula("#", { bold: true }),
        celula("Item", { bold: true }),
        celula("Detalhe", { bold: true }),
        celula("Valor pago", { bold: true, align: AlignmentType.RIGHT }),
        celula("Métrica", { bold: true, align: AlignmentType.RIGHT }),
      ],
    });
    const linhas = g.itens.map(
      (it, i) =>
        new TableRow({
          children: [
            celula(String(i + 1)),
            celula(it.rotulo),
            celula(detalheItem(g, it)),
            celula(fmtBRL(it.valor), { align: AlignmentType.RIGHT }),
            celula(
              metricaTexto(g, it),
              { align: AlignmentType.RIGHT }
            ),
          ],
        })
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...linhas],
      })
    );
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `alertas-${exercicio}-${stamp()}.docx`);
}