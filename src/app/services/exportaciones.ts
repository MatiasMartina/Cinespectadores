import { inject, Injectable } from '@angular/core';
import { ReportePeriodo } from '../models/seguimiento';
import { PdfDocumentos } from './pdf-documentos';

@Injectable({ providedIn: 'root' })
export class Exportaciones {
  private documentos = inject(PdfDocumentos);
  async pdf(reporte: ReportePeriodo): Promise<void> {
    const pdf = await this.documentos.crear();
    let y = 25;
    const linea = (texto: string, tamano = 10) => {
      pdf.setFontSize(tamano);
      const partes: string[] = pdf.splitTextToSize(texto, 170);
      for (const parte of partes) {
        if (y > 276) {
          pdf.addPage();
          y = 25;
        }
        pdf.text(parte, 20, y);
        y += tamano > 12 ? 9 : 6;
      }
    };
    linea('CINE SPECTADORES · FACTURACIÓN', 16);
    linea(`${reporte.desde} al ${reporte.hasta}`, 12);
    linea('Ventas por fecha de compra en Argentina. Se excluyen cancelaciones.');
    linea('El crédito utilizado forma parte de la facturación, pero no del cobro con tarjeta.');
    const total = reporte.dias.reduce((s, d) => s + d.recaudacion, 0);
    linea(`Facturación del período: $${total.toLocaleString('es-AR')}`, 12);
    y += 4;
    for (const dia of reporte.dias) {
      if (y + 26 > 276) {
        pdf.addPage();
        y = 25;
      }
      linea(dia.fecha, 12);
      linea(
        `Facturación: $${dia.recaudacion.toLocaleString('es-AR')} · Compras: ${dia.compras} · Entradas: ${dia.entradas}`,
      );
      linea(
        `Tarjeta: $${(dia.cobradoTarjeta ?? 0).toLocaleString('es-AR')} · Crédito: $${(dia.creditoUtilizado ?? 0).toLocaleString('es-AR')}`,
      );
    }
    y += 5;
    linea('PELÍCULAS MÁS VISTAS', 14);
    linea('Entradas con ingreso validado; fecha de función dentro del período.');
    for (const p of reporte.peliculas) linea(`${p.nombre}: ${p.entradas} espectadores`);
    if (!reporte.peliculas.length) linea('Sin ingresos validados en este período.');
    y += 5;
    linea('CANDY BAR MÁS VENDIDO', 14);
    linea('Unidades de compras vigentes, incluidos combos y canjes.');
    for (const p of reporte.productos) linea(`${p.nombre}: ${p.cantidad} unidades`);
    if (!reporte.productos.length) linea('Sin productos vendidos en este período.');
    pdf.save(`facturacion-${reporte.desde}-${reporte.hasta}.pdf`);
  }
  async excel(reporte: ReportePeriodo): Promise<void> {
    // ExcelJS se carga al exportar; no forma parte de la carga inicial de la cartelera.
    const { default: ExcelJS } = await import('exceljs');
    const libro = new ExcelJS.Workbook();
    libro.creator = 'Cine Spectadores';
    const dias = libro.addWorksheet('Facturación');
    dias.columns = [
      { header: 'Fecha de compra (Argentina)', key: 'fecha', width: 29 },
      { header: 'Compras vigentes', key: 'compras', width: 19 },
      { header: 'Entradas', key: 'entradas', width: 14 },
      { header: 'Facturación ARS', key: 'recaudacion', width: 20 },
      { header: 'Cobro tarjeta ARS', key: 'cobradoTarjeta', width: 21 },
      { header: 'Crédito usado ARS', key: 'creditoUtilizado', width: 21 },
    ];
    dias.addRows(reporte.dias);
    const totales = reporte.dias.reduce(
      (a, d) => ({
        compras: a.compras + d.compras,
        entradas: a.entradas + d.entradas,
        recaudacion: a.recaudacion + d.recaudacion,
        cobradoTarjeta: a.cobradoTarjeta + (d.cobradoTarjeta ?? 0),
        creditoUtilizado: a.creditoUtilizado + (d.creditoUtilizado ?? 0),
      }),
      { compras: 0, entradas: 0, recaudacion: 0, cobradoTarjeta: 0, creditoUtilizado: 0 },
    );
    dias.addRow({ fecha: 'TOTAL', ...totales });
    for (const clave of ['recaudacion', 'cobradoTarjeta', 'creditoUtilizado'])
      dias.getColumn(clave).numFmt = '"$"#,##0';
    const peliculas = libro.addWorksheet('Películas vistas');
    peliculas.columns = [
      { header: 'Película', key: 'nombre', width: 55 },
      { header: 'Ingresos validados', key: 'entradas', width: 25 },
    ];
    peliculas.addRows(reporte.peliculas);
    const productos = libro.addWorksheet('Candy vendido');
    productos.columns = [
      { header: 'Producto', key: 'nombre', width: 55 },
      { header: 'Unidades', key: 'cantidad', width: 18 },
    ];
    productos.addRows(reporte.productos);
    const criterios = libro.addWorksheet('Criterios');
    criterios.columns = [{ header: 'Criterio', width: 110 }];
    for (const texto of [
      `Período: ${reporte.desde} al ${reporte.hasta}`,
      'Facturación: fecha de compra en Argentina; ventas canceladas excluidas.',
      'Facturación = tarjeta + crédito utilizado. No es una devolución de efectivo.',
      'Películas vistas: ingreso validado y fecha de función en el período.',
      'Candy: unidades de compras vigentes, incluidos combos y canjes.',
    ])
      criterios.addRow([texto]);
    for (const hoja of libro.worksheets) {
      hoja.views = [{ state: 'frozen', ySplit: 1 }];
      hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF362646' } };
      hoja.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: hoja.rowCount, column: hoja.columnCount },
      };
    }
    const buffer = await libro.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `facturacion-${reporte.desde}-${reporte.hasta}.xlsx`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
